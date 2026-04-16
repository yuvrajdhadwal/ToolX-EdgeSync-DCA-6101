#include "common.hpp"
#include <array>
#include <thread>
#include <unistd.h>

void deploymentRejection(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  std::string rejectionComment;
  std::cout << "Enter a Rejection Comment:\n\t";
  std::cin >> rejectionComment;
  publishMessage("Firmware Deployment Rejected by Field Technician",
                 device_ll_handle);
  publishMessage(rejectionComment, device_ll_handle);
}

void deploymentInstallation(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  // TODO: Handle firmware installation and further states
  std::thread downloadThread([device_ll_handle]() -> void {
    isNewFirmwareDownloaded = downloadFirmware();
    if (isNewFirmwareDownloaded) {
      publishMessage(
          "Firmware Deployment Accepted by Field Technician ... Installing Now",
          device_ll_handle);
    } else {
      deploymentRejection(device_ll_handle);
    }
  });
  downloadThread.detach();
}

void handleFieldResponse(int epoll_fd, std::array<epoll_event, 1> &events,
                         bool &incomingDeployment,
                         IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  int num_events{epoll_wait(epoll_fd, events.data(), 1, 0)};
  if (num_events > 0) {
    std::array<char, 1> buffer;
    long bytesRead{read(STDIN_FILENO, buffer.data(), 1)};
    char response{buffer[0]};
    if (response != 'y' && response != 'Y' && response != 'n' &&
        response != 'N') {
      return;
    }

    if (!incomingDeployment) {
      return;
    }

    if (response == 'y' || response == 'Y') {
      std::cout << "Installing Firmware from Cloud Now ...\n";
      // NOTE: Going to Accepted State
      deploymentInstallation(device_ll_handle);
    } else {
      // NOTE: Going to Rejected State
      std::cout << "Rejected Firmware Deployment from Cloud ... \n";
      deploymentRejection(device_ll_handle);
    }

    incomingDeployment = false;
  }
}
