#include "shutdown.hpp"

#include "common.hpp"

#include <csignal>
#include <iostream>

void shutdown() {
  // Free all the sdk subsystem
  IoTHub_Deinit();
  curl_global_cleanup();
  killProcess(partitionAFirmwarePID);
  killProcess(partitionBFirmwarePID);

  std::cout << "Press any key to continue\n";
  (void)getchar();
}

void shutdown(IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle) {
  IoTHubDeviceClient_LL_Destroy(device_ll_handle);
  shutdown();
}

auto killProcess(pid_t pid) -> int {
  if (pid < 0) {
    std::cerr << "Can't Kill Process\n";
    return -1;
  }

  if (pid == 0) {
    return 0;
  }

  // Let process do cleanup
  if (kill(pid, SIGTERM) == -1) {
    // if process is already exited
    if (errno == ESRCH) {
      return 0;
    }

    std::cerr << "Can't Kill Process\n";
  }

  int status;
  pid_t result = waitpid(pid, &status, WNOHANG);

  // Force Kill Process, if exit doesn't work
  if (result == 0) {
    kill(pid, SIGKILL);
    waitpid(pid, &status, 0);
  }

  return 0;
}
