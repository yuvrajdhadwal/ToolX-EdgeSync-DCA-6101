#include "common.hpp"
void shutdown() {
  // Free all the sdk subsystem
  IoTHub_Deinit();
  curl_global_cleanup();

  printf("Press any key to continue\n");
  (void)getchar();
}

void shutdown(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  IoTHubDeviceClient_LL_Destroy(device_ll_handle);
  shutdown();
}
