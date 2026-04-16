#pragma once

#include <iothub_device_client_ll.h>

#include <string>

auto receive_msg_callback(IOTHUB_MESSAGE_HANDLE message, void *user_context)
    -> IOTHUBMESSAGE_DISPOSITION_RESULT;

void publishMessage(const std::string &msg,
                    IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);

void controlLoopHeartbeat(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
