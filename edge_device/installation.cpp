#include "common.hpp"
#include <sys/stat.h>
#include <unistd.h>

void checkFirmwareInstallation() {
  if (!isNewFirmwareDownloaded) {
    return;
  }

  // NOTE: Transitioning from INSTALL to CONFIRMATION
  isNewFirmwareDownloaded = false;
  isNewFirmwareAlive = true;

  pid_t newFirmwarePID = fork();

  if (newFirmwarePID < 0) {
    // Fork failed
    perror("Fork Failed; Retrying");

    // NOTE: Going back to INSTALL since CONFIRMATION failed
    isNewFirmwareAlive = false;
    isNewFirmwareDownloaded = true;
    ++failureCount;
  } else if (newFirmwarePID == 0) {
    // In Firmware Process (Fork Child)
    // if curr firmware, is not partition A, new firmware is
    std::string_view path;
    if (!isPartitionA) {
      path = partitionAPath;
    } else {
      path = partitionBPath;
    }

    // Make firmware executable, and execute it in child process
    chmod(path.data(), S_IXUSR | S_IXGRP | S_IXOTH);
    execlp(path.data(), "firmware", nullptr);

    // exec failed if this runs
    perror("Exec Firmware Failed; Retrying");

    // NOTE: Going back to INSTALL since CONFIRMATION failed
    isNewFirmwareAlive = false;
    isNewFirmwareDownloaded = true;
    ++failureCount;
  } else {
    // In Control Plane (Fork Parent)
    if (isPartitionA) {
      partitionBFirmwarePID = newFirmwarePID;
    } else {
      partitionAFirmwarePID = newFirmwarePID;
    }
  }
}
