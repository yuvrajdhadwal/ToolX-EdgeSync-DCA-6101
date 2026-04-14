#include "common.hpp"
void shutdown() {
  // Free all the sdk subsystem
  IoTHub_Deinit();
  if (static_cast<bool>(curl)) {
    curl_easy_cleanup(curl);
  }
  curl_global_cleanup();

  printf("Press any key to continue");
  (void)getchar();
}

void shutdown(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  IoTHubDeviceClient_LL_Destroy(device_ll_handle);
  shutdown();
}
