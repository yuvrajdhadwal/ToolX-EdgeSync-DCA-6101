#include "common.hpp"
#include <csignal>

void checkConfirmationFailure(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  if (!isNewFirmwareAlive || failureCount < 3) {
    return;
  }

  isNewFirmwareDownloaded = false; // stop trying
  std::cerr << "New Firmware Failed Installation ... sending rejection "
               "notificiation";

  deploymentRejection(device_ll_handle);
}

void checkConfirmationSuccess(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  if (!isNewFirmwareAlive ||
      firmwareHeartbeats < CONFIRMATION_FIRMWARE_HEARTBEATS) {
    return;
  }

  // transition to curr firmware
  if (isPartitionA) {
    if (partitionAFirmwarePID != 0) {
      kill(partitionAFirmwarePID, SIGTERM);
    }
  } else {
    if (partitionBFirmwarePID != 0) {
      kill(partitionBFirmwarePID, SIGTERM);
    }
  }

  // NOTE: Transition back to STABLE State
  isPartitionA = !isPartitionA;
  isNewFirmwareAlive = false;
  firmwareHeartbeats = 0;
  std::cout << "Firmware Transition Complete: Moving to ParitionA? "
            << isPartitionA << '\n';

  publishMessage("Firmware Deployment Successful", device_ll_handle);
}

void confirmFirmwarePulse() {
  if (!isNewFirmwareAlive) {
    return;
  }

  if (!isPartitionA) {
    if (partitionAFirmwarePID == 0) {
      firmwareHeartbeats++;
    } else if (kill(partitionAFirmwarePID, 0) < 0) {
      failureCount++;
      firmwareHeartbeats = 0;
      isNewFirmwareDownloaded = true;
    } else {
      firmwareHeartbeats++;
    }
  } else {
    if (partitionBFirmwarePID == 0) {
      firmwareHeartbeats++;
    } else if (kill(partitionBFirmwarePID, 0) < 0) {
      failureCount++;
      firmwareHeartbeats = 0;
      isNewFirmwareDownloaded = true;
    } else {
      firmwareHeartbeats++;
    }
  }
}
