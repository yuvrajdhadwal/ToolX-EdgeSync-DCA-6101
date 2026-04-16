#include "common.hpp"
#include <thread>
#include <unistd.h>

auto setup(const char *connectionString,
           IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol, void *incomingDeployment)
    -> IOTHUB_DEVICE_CLIENT_LL_HANDLE {
  // CURL Init
  CURLcode result = curl_global_init(CURL_GLOBAL_ALL);
  if (result != CURLE_OK) {
    std::cerr << "Could not initialize CURL\n";
    return nullptr;
  }

  // IoT Init
  (void)IoTHub_Init();

  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle{
      IoTHubDeviceClient_LL_CreateFromConnectionString(connectionString,
                                                       protocol)};
  if (device_ll_handle == nullptr) {
    std::cout << "Failure creating IotHub device. Hint: Check your connection "
                 "string.\n";
    return nullptr;
  }

  bool traceOn = false; // NOTE: Set true if debugging IoT
  IoTHubDeviceClient_LL_SetOption(device_ll_handle, OPTION_LOG_TRACE, &traceOn);

  bool urlEncodeOn = true;
  (void)IoTHubDeviceClient_LL_SetOption(
      device_ll_handle, OPTION_AUTO_URL_ENCODE_DECODE, &urlEncodeOn);

  // Setting connection status callback to get indication of connection to
  // iothub
  (void)IoTHubDeviceClient_LL_SetConnectionStatusCallback(
      device_ll_handle, connection_status_callback, nullptr);

  if (IoTHubDeviceClient_LL_SetMessageCallback(
          device_ll_handle, receive_msg_callback, incomingDeployment) !=
      IOTHUB_CLIENT_OK) {
    std::cout << "ERROR: IoTHubClient_LL_SetMessageCallback..........FAILED!\n";
    return nullptr;
  }

  // NOTE: Spawns async thread that goes into DOWNLOAD State
  // Spawn a Download Thread to Install Current Deployed Firmware onto Device
  std::thread downloadThread([device_ll_handle]() -> void {
    // NOTE: If true, control plane transitions to INSTALL State
    isNewFirmwareDownloaded = downloadFirmware();
  });

  downloadThread.detach();

  return device_ll_handle;
}

auto epollSetup() -> int {
  int epoll_fd{epoll_create1(0)};
  if (epoll_fd == -1) {
    return -1;
  }

  epoll_event event;
  event.events = EPOLLIN; // Monitors incoming data (input from Field Techs)
  event.data.fd = STDIN_FILENO;

  if (epoll_ctl(epoll_fd, EPOLL_CTL_ADD, STDIN_FILENO, &event) == -1) {
    close(epoll_fd);
    return -1;
  }

  return epoll_fd;
}
