#include "common.hpp"
#include <array>
#include <atomic>
#include <chrono>
#include <csignal>
#include <sys/stat.h>
#include <unistd.h>

std::string mostRecentURL;
std::atomic<bool> isPartitionA = true;
std::atomic<bool> isNewFirmwareAlive = false;

// Flag for Control Agent Loop
std::atomic<bool> isStable{true};

// Triggers transition to DEPLOYED State
std::atomic<bool> incomingDeployment{false};

// Triggers transition to INSTALL State
std::atomic<bool> isNewFirmwareDownloaded = false;

std::atomic<pid_t> partitionAFirmwarePID = 0;
std::atomic<pid_t> partitionBFirmwarePID = 0;

std::atomic<int> failureCount = 0;
std::atomic<int> firmwareHeartbeats = 0;

std::string_view partitionAPath{"/tmp/firmwareA"};
std::string_view partitionBPath{"/tmp/firmwareB"};

int CONFIRMATION_FIRMWARE_HEARTBEATS = 1;

// TODO: Handle default firmware/current/latest incoming one
auto main() -> int {
  constexpr IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol{MQTT_Protocol};
  constexpr int controlLoopSleepDeltaMilliseconds{10};
  constexpr std::chrono::seconds heartbeatDeltaSeconds{15};

  std::string connectionString{getEnvVar("IOTHUB_CONNECTION_STRING")};
  if (connectionString == "") {
    std::cerr << "IOTHUB_CONNECTION_STRING Env Var not Passed In\n";
    return 1;
  }
  std::string externalAPIURL{getEnvVar("EXTERNAL_API_URL_EDGE_DEVICE")};
  if (externalAPIURL == "") {
    std::cerr << "EXTERNAL_API_URL_EDGE_DEVICE Env Var not Passed In\n";
    return 1;
  }
  std::string deviceID{getEnvVar("DEVICE_ID")};
  if (deviceID == "") {
    std::cerr << "DEVICE_ID Env Var not Passed In\n";
    return 1;
  }

  // CURL the most recent Firmware Deployed to Device
  mostRecentURL =
      externalAPIURL + "/firmware/current_device_firmware/" + deviceID;

  // NOTE: First State is Setup
  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle{
      setup(connectionString.data(), protocol, &incomingDeployment)};

  if (device_ll_handle == nullptr) {
    // NOTE: Transition to Shutdown if Setup Fails
    shutdown();
    return 1;
  }

  // Set up for EPOLL (Non-Blocking Read for Field Techs)
  int epoll_fd{epollSetup()};
  if (epoll_fd == -1) {
    shutdown(device_ll_handle);
    return 1;
  }

  std::array<epoll_event, 1> events;
  // Subtracting so heartbeat happens at first iteration not after one delta
  auto last_heartbeat{std::chrono::steady_clock::now() - heartbeatDeltaSeconds};

  // NOTE: Transitioning to STABLE State
  while (isStable) {
    // NOTE: Handles transitions out of DEPLOYED State
    handleFieldResponse(epoll_fd, events, incomingDeployment, device_ll_handle);

    // NOTE: Handles INSTALL State
    checkFirmwareInstallation();

    // NOTE: Handles CONFIRMATION State Failure Transition
    checkConfirmationFailure(device_ll_handle);

    // NOTE: Handles CONFIRMATION State Success Transition
    checkConfirmationSuccess(device_ll_handle);

    // Handling Heartbeats
    auto now{std::chrono::steady_clock::now()};
    if (now - last_heartbeat >= heartbeatDeltaSeconds) {
      stable(device_ll_handle);
      confirmFirmwarePulse();

      last_heartbeat += heartbeatDeltaSeconds;

      // TODO: Temporary while stable, setup, and shutdown are only states
      static int i = 0;
      if (i == 10) {
        isStable = false;
      }
      ++i;
    }

    IoTHubDeviceClient_LL_DoWork(
        device_ll_handle); // maintain network engine so connection stays alive
    ThreadAPI_Sleep(
        controlLoopSleepDeltaMilliseconds); // units in milliseconds, sleeping
                                            // to not cause 100% cpu utilization
  }

  // NOTE: Go to Shutdown State when Stable State ends
  close(epoll_fd);
  shutdown(device_ll_handle);
  return 0;
}
