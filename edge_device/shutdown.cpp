#include "common.hpp"
void shutdown() {
  // Free all the sdk subsystem
  IoTHub_Deinit();

  printf("Press any key to continue");
  (void)getchar();
}
