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
    std::cout << "The device client is connected to iothub\n";
  } else {
    std::cout << "The device client has been disconnected\n";
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

  std::cout << "Sending message to IoTHub\n";
  IoTHubDeviceClient_LL_SendEventAsync(device_ll_handle, message_handle,
                                       send_confirm_callback, nullptr);

  // The message is copied to the sdk so the we can destroy it
  IoTHubMessage_Destroy(message_handle);
}

auto receive_msg_callback(IOTHUB_MESSAGE_HANDLE message, void *user_context)
    -> IOTHUBMESSAGE_DISPOSITION_RESULT {
  (void)user_context;
  const char *messageId{IoTHubMessage_GetMessageId(message)};
  const char *correlationId{IoTHubMessage_GetCorrelationId(message)};

  // Message properties
  if (messageId == nullptr) {
    messageId = "<unavailable>";
  }

  if (correlationId == nullptr) {
    correlationId = "<unavailable>";
  }

  IOTHUBMESSAGE_CONTENT_TYPE content_type =
      IoTHubMessage_GetContentType(message);

  const unsigned char *buff_msg;
  size_t buff_len;

  if (IoTHubMessage_GetByteArray(message, &buff_msg, &buff_len) !=
      IOTHUB_MESSAGE_OK) {
    std::cout << "Failure retrieving byte array message\n";
  } else {
    std::string msg{(char *)buff_msg, buff_len};
    std::cout << "Received Binary message\nMessage ID: " << messageId
              << "\n Correlation "
                 "ID: "
              << correlationId << "\n Data: <<<" << msg
              << ">>> & Size=" << msg.size() << "\n";
  }

  const char *property_name = "property_name";
  const char *property_value =
      IoTHubMessage_GetProperty(message, property_name);
  if (property_value != nullptr) {
    std::cout << "\nMessage \"" << property_name << "\" property:\n";
    std::cout << "\tKey: " << property_name << " Value: " << property_value
              << '\n';
  }

  MAP_HANDLE non_system_properties = IoTHubMessage_Properties(message);

  if (non_system_properties != nullptr) {
    const char *const *keys;
    const char *const *values;
    size_t count;

    if (Map_GetInternals(non_system_properties, &keys, &values, &count) !=
        MAP_OK) {
      std::cout << "\nFailed retrieving message non-system properties.\n";
    } else {
      std::cout << "\nMessage properties:\n";

      for (size_t i = 0; i < count; i++) {
        (void)printf("\tKey: %s Value: %s\r\n", (char *)keys[i],
                     (char *)values[i]);
      }
    }
  }

  return IOTHUBMESSAGE_ACCEPTED;
}
