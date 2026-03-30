#include "common.hpp"
#include <chrono>

/* Paste in the your iothub connection string  */
// TODO: make this an environment variable that is input when docker container
// is run

int main(void) {
  std::string connectionString{
      "HostName=ToolXEdgeSyncIoT.azure-devices.net;DeviceId=test1;"
      "SharedAccessKey=erLT7iwT5BY3byTPT0GqzAGygkE3RlSLMm6G9dZIMBk="};

  IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol{MQTT_Protocol};
  bool isStable{true};

  // NOTE: First State is Setup
  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle{setup(const_cast<const char*>(connectionString.data()), protocol)};

  if (device_ll_handle == NULL) {
    // NOTE: Go to Shutdown State if Setup Fails
    shutdown();
  }

  auto last_send_time{std::chrono::steady_clock::now()};
  constexpr std::chrono::seconds interval{15}; // 15 seconds between heartbeats

  // NOTE: Go to Stable State if Setup is successful
  while (isStable) {
    auto now{std::chrono::steady_clock::now()};

    if (now - last_send_time >= interval) {
      stable(device_ll_handle);
      last_send_time = now;
      // TODO: Temporary while stable, setup, and shutdown are only states
      static int i = 0;
      if (i == 10) {
        isStable = false;
      }
      ++i;
    }

    IoTHubDeviceClient_LL_DoWork(
        device_ll_handle); // maintain network engine so connection stays alive
    // Sleep for 15 seconds between stable loops
    ThreadAPI_Sleep(10); // units in milliseconds, sleeping to not cause 100%
                         // cpu utilization
  }

  // NOTE: Go to Shutdown State when Stable State ends

  // Clean up the iothub sdk handle
  IoTHubDeviceClient_LL_Destroy(device_ll_handle);
  shutdown();
  return 0;
}
