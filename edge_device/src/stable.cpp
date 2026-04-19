#include "stable.hpp"

#include "common.hpp"

#include <iostream>

static void send_confirm_callback(IOTHUB_CLIENT_CONFIRMATION_RESULT result,
                                  void *userContextCallback) {
  (void)userContextCallback;
  (void)result;
  // When a message is sent this callback will get invoked
  // (void)printf("Confirmation callback received for message\n");
}

void publishMessage(const std::string &msg,
                    IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  std::cout << "CONTROL PLANE - Sending Message: " << msg << '\n';

  IOTHUB_MESSAGE_HANDLE message_handle =
      IoTHubMessage_CreateFromString(msg.data());
  IoTHubDeviceClient_LL_SendEventAsync(device_ll_handle, message_handle,
                                       send_confirm_callback, nullptr);

  IoTHubMessage_Destroy(message_handle);
}

void controlLoopHeartbeat(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  publishMessage("Device is Online", device_ll_handle);
}

auto receive_msg_callback(IOTHUB_MESSAGE_HANDLE message, void *user_context)
    -> IOTHUBMESSAGE_DISPOSITION_RESULT {
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
  (void)content_type;

  const unsigned char *buff_msg;
  size_t buff_len;

  if (IoTHubMessage_GetByteArray(message, &buff_msg, &buff_len) !=
      IOTHUB_MESSAGE_OK) {
    std::cerr << "CONTROL PLANE - Failure retrieving byte array message\n";
    return IOTHUBMESSAGE_REJECTED;
  }

  std::string msg{(char *)buff_msg, buff_len};
  std::cout << "==================================";
  std::cout << "\n\n\nReceived Binary message\nMessage ID: " << messageId
            << "\n Correlation ID: " << correlationId << "\n Data: <<<" << msg
            << ">>> & Size=" << msg.size() << "\n";

  MAP_HANDLE non_system_properties = IoTHubMessage_Properties(message);
  bool isDeployment = false;
  bool isEmergency = false;

  if (non_system_properties == nullptr) {
    std::cerr << "CONTROL PLANE - Could not read system properties of incoming "
                 "deployment\n";
  }

  const char *const *keys;
  const char *const *values;
  size_t count;

  if (Map_GetInternals(non_system_properties, &keys, &values, &count) !=
      MAP_OK) {
    std::cout << "\nFailed retrieving message non-system properties.\n";
    return IOTHUBMESSAGE_REJECTED;
  }

  std::cout << "\nMessage properties:\n";

  for (size_t i = 0; i < count; i++) {
    std::cout << "\tKey: " << (char *)keys[i] << " Value: " << (char *)values[i]
              << "\n";

    if (strcmp("isDeployment", (char *)keys[i]) == 0 &&
        strcmp("1", (char *)values[i]) == 0) {
      isDeployment = true;
    }
    if (strcmp("isEmergency", (char *)keys[i]) == 0 &&
        strcmp("1", (char *)values[i]) == 0) {
      isEmergency = true;
    }
    if (strcmp("download_link", (char *)keys[i]) == 0) {
      mostRecentURL = (char *)values[i];
    }
  }

  if (isDeployment) {
    // NOTE: Triggers DEPLOY State
    *static_cast<std::atomic<bool> *>(user_context) =
        true; // subscription acknowledge

    if (isEmergency) {
      std::cout << "\n===================================\n";
      std::cout << "THIS IS AN EMERGENCY DEPLOYMENT";
      std::cout << "\n===================================\n";
    }

    std::cout << "NEW FIRMWARE DEPLOYMENT. INSTALL? [Y/N]\n\n\n";
  }

  std::cout << "==================================\n\n";
  return IOTHUBMESSAGE_ACCEPTED;
}
