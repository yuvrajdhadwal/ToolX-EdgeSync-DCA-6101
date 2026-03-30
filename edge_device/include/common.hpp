#pragma once

#include "azure_c_shared_utility/crt_abstractions.h"
#include "azure_c_shared_utility/shared_util_options.h"
#include "azure_c_shared_utility/threadapi.h"
#include "iothub.h"
#include "iothub_client_options.h"
#include "iothub_device_client_ll.h"
#include "iothub_message.h"

#include "iothubtransportmqtt.h"

#include <stdio.h>
#include <stdlib.h>
#include <string>

IOTHUB_DEVICE_CLIENT_LL_HANDLE setup();
void stable(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);
void shutdown();

std::string connectionString;
IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol;
bool isStable;
