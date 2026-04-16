#pragma once

#include <iothub_device_client_ll.h>

void checkConfirmationFailure(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);

void checkConfirmationSuccess(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle);

void confirmFirmwarePulse();
