#include <stdio.h>
#include <stdlib.h>
#include <string>

#include "azure_c_shared_utility/crt_abstractions.h"
#include "azure_c_shared_utility/shared_util_options.h"
#include "azure_c_shared_utility/threadapi.h"
#include "iothub.h"
#include "iothub_client_options.h"
#include "iothub_device_client_ll.h"
#include "iothub_message.h"

#include "iothubtransportmqtt.h"

/* Paste in the your iothub connection string  */
// TODO: make this an environment variable that is input when docker container
// is run
static const char *connectionString =
    "HostName=ToolXEdgeSyncIoT.azure-devices.net;DeviceId=test1;"
    "SharedAccessKey=erLT7iwT5BY3byTPT0GqzAGygkE3RlSLMm6G9dZIMBk=";
static IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol{MQTT_Protocol};
static bool isStable{true};

static void send_confirm_callback(IOTHUB_CLIENT_CONFIRMATION_RESULT result,
                                  void *userContextCallback) {
  (void)userContextCallback;
  // When a message is sent this callback will get invoked
  (void)printf("Confirmation callback received for message");
}

static void
connection_status_callback(IOTHUB_CLIENT_CONNECTION_STATUS result,
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

IOTHUB_DEVICE_CLIENT_LL_HANDLE setup() {

  // Used to initialize IoTHub SDK subsystem
  (void)IoTHub_Init();

  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle;
  (void)printf("Creating IoTHub Device handle\r\n");
  // Create the iothub handle here
  device_ll_handle = IoTHubDeviceClient_LL_CreateFromConnectionString(
      connectionString, protocol);
  if (device_ll_handle == NULL) {
    (void)printf("Failure creating IotHub device. Hint: Check your connection "
                 "string.\r\n");
    return NULL;
  }
  // Set any option that are necessary.
  // For available options please see the iothub_sdk_options.md documentation

  bool traceOn = true;
  IoTHubDeviceClient_LL_SetOption(device_ll_handle, OPTION_LOG_TRACE, &traceOn);

  bool urlEncodeOn = true;
  (void)IoTHubDeviceClient_LL_SetOption(
      device_ll_handle, OPTION_AUTO_URL_ENCODE_DECODE, &urlEncodeOn);

  // Setting connection status callback to get indication of connection to
  // iothub
  (void)IoTHubDeviceClient_LL_SetConnectionStatusCallback(
      device_ll_handle, connection_status_callback, NULL);

  return device_ll_handle;
}

void shutdown() {
  // Free all the sdk subsystem
  IoTHub_Deinit();

  printf("Press any key to continue");
  (void)getchar();
}

void stable(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  // TODO: Make this an env variable as well
  IOTHUB_MESSAGE_HANDLE message_handle =
      IoTHubMessage_CreateFromString("Device is Online");

  //(void)IoTHubMessage_SetMessageCreationTimeUtcSystemProperty(
  //   message_handle, "2020-07-01T01:00:00.346Z");

  // Add custom properties to message
  (void)IoTHubMessage_SetProperty(message_handle, "Latitude", "37.334789");
  (void)IoTHubMessage_SetProperty(message_handle, "Longitude", "-121.888138");

  (void)printf("Sending message to IoTHub\n");
  IoTHubDeviceClient_LL_SendEventAsync(device_ll_handle, message_handle,
                                       send_confirm_callback, NULL);

  // The message is copied to the sdk so the we can destroy it
  IoTHubMessage_Destroy(message_handle);

  // Temporary while stable, setup, and shutdown are only states
  static int i = 0;
  if (i == 10) {
    isStable = false;
  }
  ++i;
}

int main(void) {
  // NOTE: First State is Setup
  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle{setup()};

  if (device_ll_handle == NULL) {
    // NOTE: Go to Shutdown State if Setup Fails
    shutdown();
  }

  // NOTE: Go to Stable State if Setup is successful
  while (isStable) {
    stable(device_ll_handle);
    IoTHubDeviceClient_LL_DoWork(device_ll_handle);
    // Sleep for 15 seconds between stable loops
    ThreadAPI_Sleep(15 * 1000); // units in milliseconds
  }

  // NOTE: Go to Shutdown State when Stable State ends

  // Clean up the iothub sdk handle
  IoTHubDeviceClient_LL_Destroy(device_ll_handle);
  shutdown();
  return 0;
}
