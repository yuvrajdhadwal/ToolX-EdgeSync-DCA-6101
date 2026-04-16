#pragma once

#include "azure_c_shared_utility/crt_abstractions.h"
#include "azure_c_shared_utility/shared_util_options.h"
#include "azure_c_shared_utility/threadapi.h"
#include "iothub.h"
#include "iothub_client_options.h"
#include "iothub_device_client_ll.h"
#include "iothub_message.h"
#include <sys/epoll.h>

#include "iothubtransportmqtt.h"

#include <array>
#include <curl/curl.h>
#include <atomic>
#include <iostream>
#include <stdio.h>
#include <stdlib.h>
#include <string>

auto setup(const char *connectionString,
           IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol, void *incomingDeployment)
    -> IOTHUB_DEVICE_CLIENT_LL_HANDLE;

void connection_status_callback(IOTHUB_CLIENT_CONNECTION_STATUS result,
                                IOTHUB_CLIENT_CONNECTION_STATUS_REASON reason,
                                void *user_context);
void stable(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);

void deploymentRejection(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
void deploymentInstallation(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);

auto receive_msg_callback(IOTHUB_MESSAGE_HANDLE message, void *user_context)
    -> IOTHUBMESSAGE_DISPOSITION_RESULT;

auto filewrite_callback(char *ptr, std::size_t size, std::size_t nmemb,
                        void *stream) -> std::size_t;
void shutdown();
void shutdown(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
auto downloadFirmware() -> bool;

inline auto getEnvVar(const std::string &key) -> std::string {
  const char *val{std::getenv(key.c_str())};
  return (val == nullptr) ? "" : std::string{val};
}

void handleFieldResponse(int epoll_fd, std::array<epoll_event, 1> &events,
                         std::atomic<bool> &incomingDeployment,
                         IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
void publishMessage(const std::string &msg,
                    IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
auto epollSetup() -> int;
void checkFirmwareInstallation();
void checkConfirmationFailure(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
void checkConfirmationSuccess(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
void confirmFirmwarePulse();
extern std::string mostRecentURL;
extern std::atomic<bool> isNewFirmwareDownloaded;

extern std::string_view partitionAPath;
extern std::string_view partitionBPath;
extern std::atomic<bool> isPartitionA;
extern std::atomic<bool> isNewFirmwareAlive;
extern std::atomic<int> failureCount;
extern std::atomic<int> firmwareHeartbeats;
extern std::atomic<pid_t> partitionAFirmwarePID;
extern std::atomic<pid_t> partitionBFirmwarePID;
extern int CONFIRMATION_FIRMWARE_HEARTBEATS;
