#include "common.hpp"
#include <array>
#include <chrono>
#include <csignal>
#include <sys/stat.h>
#include <unistd.h>

std::string mostRecentURL;
bool isNewFirmwareDownloaded = false;
bool isPartitionA = true;
bool isNewFirmwareAlive = false;
pid_t partitionAFirmwarePID = 0;
pid_t partitionBFirmwarePID = 0;
std::string_view partitionAPath{"/tmp/firmwareA"};
std::string_view partitionBPath{"/tmp/firmwareB"};

// TODO: Handle default firmware/current/latest incoming one
auto main() -> int {
  std::string connectionString{getEnvVar("IOTHUB_CONNECTION_STRING")};
  if (connectionString == "") {
    std::cerr << "Please set env var for connection string - check readme\n";
    return 1;
  }
  std::string externalAPIURL{getEnvVar("EXTERNAL_API_URL_EDGE_DEVICE")};
  if (externalAPIURL == "") {
    std::cerr << "Please set env var for external api url\n";
    return 1;
  }
  std::string deviceID{getEnvVar("DEVICE_ID")};
  if (deviceID == "") {
    std::cerr << "Please set env var for external api url\n";
    return 1;
  }

  mostRecentURL =
      externalAPIURL + "/firmware/current_device_firmware/" + deviceID;

  CURLcode result = curl_global_init(CURL_GLOBAL_ALL);
  if (result != CURLE_OK) {
    std::cerr << "Could not initialize CURL\n";
    return static_cast<int>(result);
  }

  IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol{MQTT_Protocol};
  bool isStable{true};
  static constexpr int threadSleepTime{10};

  // NOTE: First State is Setup
  bool incomingDeployment = false;

  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle{
      setup(connectionString.data(), protocol, &incomingDeployment)};

  if (device_ll_handle == nullptr) {
    // NOTE: Go to Shutdown State if Setup Fails
    shutdown();
    return 0;
  }

  int epoll_fd{epoll_create1(0)};
  if (epoll_fd == -1) {
    shutdown(device_ll_handle);
    return 0;
  }

  epoll_event event;
  event.events = EPOLLIN; // monitoring incoming data
  event.data.fd = STDIN_FILENO;

  if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, STDIN_FILENO, &event) == -1) {
    close(epoll_fd);
    shutdown(device_ll_handle);
    return 0;
  }

  std::array<epoll_event, 1> events;

  auto last_send_time{std::chrono::steady_clock::now()};
  constexpr std::chrono::seconds interval{15}; // 15 seconds between heartbeats

  int failureCount = 0;
  int firmwareHeartbeats = 0;
  // NOTE: Go to Stable State if Setup is successful
  while (isStable) {
    handleFieldResponse(epoll_fd, events, incomingDeployment, device_ll_handle);
    
    // Handling Firmware Installation
    if (isNewFirmwareDownloaded) {
      isNewFirmwareDownloaded = false;
      isNewFirmwareAlive = true;
      pid_t newFirmwarePID = fork();

      if (newFirmwarePID < 0) {
        // Fork failed
        ++failureCount;
        perror("Fork Failed; Retrying");
        isNewFirmwareDownloaded = true; // try again
      } else if (newFirmwarePID == 0) {
        // In Firmware Process (Fork Child)
        std::string_view path;
        // if curr firmware, is not partition A, new firmware is
        if (!isPartitionA) {
          path = partitionAPath;
        } else {
          path = partitionBPath;
        }

        isNewFirmwareAlive = true;
        isNewFirmwareDownloaded = false;
        chmod(path.data(), S_IXUSR | S_IXGRP | S_IXOTH);
        execlp(path.data(), "firmware", nullptr);
        // If we get here exec failed
        perror("Exec Firmware Failed; Retrying");
        ++failureCount;
        isNewFirmwareAlive = false;
        isNewFirmwareDownloaded = true; // try again
      } else {
        // In Control Plane (Fork Parent)
        if (isPartitionA) {
          partitionBFirmwarePID = newFirmwarePID;
        } else {
          partitionAFirmwarePID = newFirmwarePID;
        }
      }
    }

    if (failureCount >= 3) {
      isNewFirmwareDownloaded = false; // stop trying
      std::cerr << "New Firmware Failed Installation ... sending rejection "
                   "notificiation";
      deploymentRejection(device_ll_handle);
    }

    if (isNewFirmwareAlive && firmwareHeartbeats >= 1) {
      // transition to curr firmware
      if (isPartitionA) {
        if (partitionAFirmwarePID != 0) {
          kill(partitionAFirmwarePID, SIGTERM);
        }
      } else {
        if (partitionBFirmwarePID != 0) {
          kill(partitionBFirmwarePID, SIGTERM);
        }
      }

      isPartitionA = !isPartitionA;
      isNewFirmwareAlive = false;
      firmwareHeartbeats = 0;
      std::cout << "Firmware Transition Complete: Moving to ParitionA? "
                << isPartitionA << '\n';
    }

    // Handling Heartbeats
    auto now{std::chrono::steady_clock::now()};
    if (now - last_send_time >= interval) {
      stable(device_ll_handle);
      last_send_time += interval;

      if (isNewFirmwareAlive) {
        if (!isPartitionA) {
          if (partitionAFirmwarePID == 0) {
            firmwareHeartbeats++;
          } else if (kill(partitionAFirmwarePID, 0) < 0) {
            failureCount++;
            firmwareHeartbeats = 0;
            isNewFirmwareDownloaded = true;
          } else {
            firmwareHeartbeats++;
          }
        } else {
          if (partitionBFirmwarePID == 0) {
            firmwareHeartbeats++;
          } else if (kill(partitionBFirmwarePID, 0) < 0) {
            failureCount++;
            firmwareHeartbeats = 0;
            isNewFirmwareDownloaded = true;
          } else {
            firmwareHeartbeats++;
          }
        }
      }

      // TODO: Temporary while stable, setup, and shutdown are only states
      static int i = 0;
      if (i == 10) {
        isStable = false;
      }
      ++i;
    }

    IoTHubDeviceClient_LL_DoWork(
        device_ll_handle); // maintain network engine so connection stays alive
    ThreadAPI_Sleep(threadSleepTime); // units in milliseconds, sleeping to not
                                      // cause 100% cpu utilization
  }

  // NOTE: Go to Shutdown State when Stable State ends

  // Clean up the iothub sdk handle
  if (partitionAFirmwarePID != 0) {
    kill(partitionAFirmwarePID, SIGTERM);
  }
  if (partitionBFirmwarePID != 0) {
    kill(partitionBFirmwarePID, SIGTERM);
  }
  close(epoll_fd);
  shutdown(device_ll_handle);
  return 0;
}
