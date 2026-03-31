#include "common.hpp"
#include <array>
#include <chrono>
#include <sys/epoll.h>
#include <unistd.h>

/* Paste in the your iothub connection string  */
// TODO: make this an environment variable that is input when docker container
// is run

auto main() -> int {
  std::string connectionString{
      "HostName=ToolXEdgeSyncIoT.azure-devices.net;DeviceId=test1;"
      "SharedAccessKey=erLT7iwT5BY3byTPT0GqzAGygkE3RlSLMm6G9dZIMBk="};

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

  // NOTE: Go to Stable State if Setup is successful
  while (isStable) {
    int num_events{epoll_wait(epoll_fd, events.data(), 1, 0)};
    if (num_events > 0) {
      std::array<char, 1> buffer;
      long bytesRead{read(STDIN_FILENO, buffer.data(), 1)};
      char response{buffer[0]};
      if (response != 'y' && response != 'Y' && response != 'n' &&
          response != 'N') {
        continue;
      }

      if (!incomingDeployment) {
        continue;
      }

      std::cout << "we got your response boss! " << buffer[0] << '\n';
      incomingDeployment = false;
    }
    auto now{std::chrono::steady_clock::now()};

    if (now - last_send_time >= interval) {
      stable(device_ll_handle);
      last_send_time += interval;
      // TODO: Temporary while stable, setup, and shutdown are only states
      static int i = 0;
      if (i == 4) {
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
  close(epoll_fd);
  shutdown(device_ll_handle);
  return 0;
}
