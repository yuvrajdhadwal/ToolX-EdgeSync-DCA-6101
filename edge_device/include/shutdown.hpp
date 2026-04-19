#pragma once

#include <curl/curl.h>
#include <iothub.h>
#include <iothub_device_client_ll.h>

#include <sys/wait.h>

void shutdown();

void shutdown(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);

auto killProcess(pid_t pid) -> int;
