#pragma once

#include <iothub_device_client_ll.h>

#include <array>

#include <sys/epoll.h>
#include <unistd.h>

void deploymentRejection(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);

void handleFieldResponse(int epoll_fd, std::array<epoll_event, 1> &events,
                         IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
