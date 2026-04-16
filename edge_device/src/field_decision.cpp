#include "field_decision.hpp"

#include "common.hpp"
#include "download.hpp"
#include "stable.hpp"

#include <iostream>
#include <thread>

void deploymentRejection(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  std::string rejectionComment;
  std::cout << "Enter a Rejection Comment:\n\t";
  std::cin >> rejectionComment;

  publishMessage("Firmware Deployment Rejection", device_ll_handle);
  publishMessage(rejectionComment, device_ll_handle);
}

static void
deploymentInstallation(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  std::thread downloadThread([device_ll_handle]() -> void {
    // NOTE: Triggers INSTALL State
    isNewFirmwareDownloaded = downloadFirmware();

    if (!isNewFirmwareDownloaded) {
      // NOTE: Download Failed ... Go To REJECTED State
      deploymentRejection(device_ll_handle);
    }
  });

  downloadThread.detach();
}

void handleFieldResponse(int epoll_fd, std::array<epoll_event, 1> &events,
                         IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  int num_events{epoll_wait(epoll_fd, events.data(), 1, 0)};

  if (num_events > 0) {
    std::array<char, 1> buffer;

    read(STDIN_FILENO, buffer.data(), 1);
    char response{buffer[0]};

    if (response != 'y' && response != 'Y' && response != 'n' &&
        response != 'N') {
      return;
    }

    // Only process Field Tech Response if in DEPLOYED State
    if (!incomingDeployment) {
      return;
    }

    if (response == 'y' || response == 'Y') {
      std::cout << "Downloading Firmware from Cloud Now ...\n";
      // NOTE: Going to DOWNLOAD State
      deploymentInstallation(device_ll_handle);
    } else {
      std::cout << "Rejected Firmware Deployment from Cloud ... \n";
      // NOTE: Going to REJECTED State
      deploymentRejection(device_ll_handle);
    }

    // NOTE: Regardless of choice, leaving DEPLOYED State
    incomingDeployment = false;
  }
}
