#include "common.hpp"
#include <thread>

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
