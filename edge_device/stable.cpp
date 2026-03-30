#include "common.hpp"

static void send_confirm_callback(IOTHUB_CLIENT_CONFIRMATION_RESULT result,
                                  void *userContextCallback) {
  (void)userContextCallback;
  // When a message is sent this callback will get invoked
  (void)printf("Confirmation callback received for message");
}

void connection_status_callback(IOTHUB_CLIENT_CONNECTION_STATUS result,
                           IOTHUB_CLIENT_CONNECTION_STATUS_REASON reason,
                           void *user_context) {
  (void)reason;
  (void)user_context;
  // This sample DOES NOT take into consideration network outages.
  if (result == IOTHUB_CLIENT_CONNECTION_AUTHENTICATED) {
    (void)printf("The device client is connected to iothub\r\n");
  } else {
    (void)printf("The device client has been disconnected\r\n");
  }
}

void stable(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  // TODO: Make this an env variable as well
  IOTHUB_MESSAGE_HANDLE message_handle =
      IoTHubMessage_CreateFromString("Device is Online");

  //(void)IoTHubMessage_SetMessageCreationTimeUtcSystemProperty(
  //   message_handle, "2020-07-01T01:00:00.346Z");

  // Add custom properties to message
  // (void)IoTHubMessage_SetProperty(message_handle, "Latitude", "37.334789");
  // (void)IoTHubMessage_SetProperty(message_handle, "Longitude",
  // "-121.888138");

  (void)printf("Sending message to IoTHub\n");
  IoTHubDeviceClient_LL_SendEventAsync(device_ll_handle, message_handle,
                                       send_confirm_callback, NULL);

  // The message is copied to the sdk so the we can destroy it
  IoTHubMessage_Destroy(message_handle);

}
