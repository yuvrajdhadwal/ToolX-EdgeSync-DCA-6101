#include "shutdown.hpp"

#include "common.hpp"

#include <csignal>
#include <iostream>

void shutdown() {
  // Free all the sdk subsystem
  IoTHub_Deinit();
  curl_global_cleanup();
  if (partitionAFirmwarePID != 0) {
    kill(partitionAFirmwarePID, SIGTERM);
  }
  if (partitionBFirmwarePID != 0) {
    kill(partitionBFirmwarePID, SIGTERM);
  }

  std::cout << "Press any key to continue\n";
  (void)getchar();
}

void shutdown(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  IoTHubDeviceClient_LL_Destroy(device_ll_handle);
  shutdown();
}
