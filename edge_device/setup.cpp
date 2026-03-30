#include "common.hpp"

IOTHUB_DEVICE_CLIENT_LL_HANDLE setup(const char* connectionString, IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol) {
  // Used to initialize IoTHub SDK subsystem
  (void)IoTHub_Init();

  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle;
  std::cout << "Creating IoTHub Device handle\n";
  // Create the iothub handle here
  device_ll_handle = IoTHubDeviceClient_LL_CreateFromConnectionString(
      connectionString, protocol);
  if (device_ll_handle == NULL) {
		std::cout << "Failure creating IotHub device. Hint: Check your connection "
                 "string.\n";
    return NULL;
  }

  bool traceOn = true;
  IoTHubDeviceClient_LL_SetOption(device_ll_handle, OPTION_LOG_TRACE, &traceOn);

  bool urlEncodeOn = false;
  (void)IoTHubDeviceClient_LL_SetOption(
      device_ll_handle, OPTION_AUTO_URL_ENCODE_DECODE, &urlEncodeOn);

  // Setting connection status callback to get indication of connection to
  // iothub
  (void)IoTHubDeviceClient_LL_SetConnectionStatusCallback(
      device_ll_handle, connection_status_callback, NULL);

  return device_ll_handle;
}
