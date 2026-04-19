#include "confirmation.hpp"

#include "common.hpp"
#include "field_decision.hpp"
#include "shutdown.hpp"
#include "stable.hpp"

#include <iostream>

void checkConfirmationFailure(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  if (!isNewFirmwareAlive || failureCount < 3) {
    return;
  }

  isNewFirmwareDownloaded = false; // stop trying
  std::cerr << "CONTROL PLANE - New Firmware Failed Installation ... sending "
               "rejection "
               "notificiation";

  deploymentRejection(device_ll_handle);
}

void checkConfirmationSuccess(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  if (!isNewFirmwareAlive ||
      firmwareHeartbeats < CONFIRMATION_FIRMWARE_HEARTBEATS) {
    return;
  }

  // kill old firmware to complete deployment cycle
  if (isPartitionA) {
    killProcess(partitionAFirmwarePID);
  } else {
    killProcess(partitionBFirmwarePID);
  }

  // NOTE: Transition to STABLE State
  isPartitionA = !isPartitionA;
  isNewFirmwareAlive = false;
  firmwareHeartbeats = 0;
  std::cout << "CONTROL PLANE - Firmware Transition Complete: Moving to ParitionA? "
            << isPartitionA << '\n';

  publishMessage("Firmware Deployment Successful", device_ll_handle);
}

void confirmFirmwarePulse() {
  if (!isNewFirmwareAlive) {
    return;
  }

  // check new firmware pulse
  if ((!isPartitionA && partitionAFirmwarePID != 0 &&
       kill(partitionAFirmwarePID, 0) < 0) ||
      (isPartitionA && partitionBFirmwarePID != 0 &&
       kill(partitionBFirmwarePID, 0) < 0)) {

    failureCount++;
    firmwareHeartbeats = 0;

    // NOTE: Transition back to INSTALL State
    isNewFirmwareDownloaded = true;
    isNewFirmwareAlive = false;
    return;
  }

  firmwareHeartbeats++;
}
