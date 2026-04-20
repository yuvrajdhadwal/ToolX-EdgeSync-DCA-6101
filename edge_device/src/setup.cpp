#include "setup.hpp"

#include "common.hpp"
#include "download.hpp"
#include "stable.hpp"

#include <iostream>

static void
connection_status_callback(IOTHUB_CLIENT_CONNECTION_STATUS result,
                           IOTHUB_CLIENT_CONNECTION_STATUS_REASON reason,
                           void *user_context) {
  (void)reason;
  (void)user_context;
  // This sample DOES NOT take into consideration network outages.
  if (result == IOTHUB_CLIENT_CONNECTION_AUTHENTICATED) {
    std::cout << "CONTROL PLANE - The Device Client is Connected to IOTHub\n";
  } else {
    std::cerr << "CONTROL PLANE - The Device Client has been Disconnected\n";
  }
}

auto setup(const char *connectionString,
           IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol, void *pIncomingDeployment)
    -> IOTHUB_DEVICE_CLIENT_LL_HANDLE {
  // CURL Init
  CURLcode result = curl_global_init(CURL_GLOBAL_ALL);
  if (result != CURLE_OK) {
    std::cerr << "CONTROL PLANE - Could not initialize CURL\n";
    return nullptr;
  }

  // IoT Init
  (void)IoTHub_Init();

  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle{
      IoTHubDeviceClient_LL_CreateFromConnectionString(connectionString,
                                                       protocol)};
  if (device_ll_handle == nullptr) {
    std::cout << "CONTROL PLANE - Failure creating IotHub device. Hint: Check your connection "
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
          device_ll_handle, receive_msg_callback, pIncomingDeployment) !=
      IOTHUB_CLIENT_OK) {
    std::cout << "CONTROL PLANE - ERROR: IoTHubClient_LL_SetMessageCallback..........FAILED!\n";
    return nullptr;
  }

  // NOTE: Goes to Download State for Current Firmware
  // Blocking so that we don't start running without firmware
  isNewFirmwareDownloaded = downloadFirmware();

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
