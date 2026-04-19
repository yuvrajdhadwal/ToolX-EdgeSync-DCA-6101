#pragma once

#include <curl/curl.h>
#include <iothub.h>
#include <iothub_client_options.h>
#include <iothub_device_client_ll.h>

#include <sys/epoll.h>
#include <unistd.h>

auto setup(const char *connectionString,
           IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol, void *incomingDeployment)
    -> IOTHUB_DEVICE_CLIENT_LL_HANDLE;

auto epollSetup() -> int;
