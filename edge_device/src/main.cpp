#include "common.hpp"
#include "confirmation.hpp"
#include "field_decision.hpp"
#include "installation.hpp"
#include "setup.hpp"
#include "shutdown.hpp"
#include "stable.hpp"

#include <azure_c_shared_utility/threadapi.h>
#include <iothub_device_client_ll.h>
#include <iothubtransportmqtt.h>

#include <array>
#include <chrono>
#include <csignal>
#include <iostream>

#include <sys/stat.h>
#include <unistd.h>

void signal_handler(int signum) {
  (void)signum;
  isStable = false;
}

auto main() -> int {
  std::signal(SIGTERM, signal_handler);
  std::signal(SIGINT, signal_handler);

  constexpr IOTHUB_CLIENT_TRANSPORT_PROVIDER protocol{MQTT_Protocol};
  constexpr int controlLoopSleepDeltaMilliseconds{10};
  std::chrono::seconds heartbeatDeltaSeconds{};

  std::string connectionString{getEnvVar("IOTHUB_CONNECTION_STRING")};
  if (connectionString == "") {
    std::cerr << "IOTHUB_CONNECTION_STRING Env Var not Passed In\n";
    return 1;
  }
  std::string externalAPIURL{getEnvVar("EXTERNAL_API_URL_EDGE_DEVICE")};
  if (externalAPIURL == "") {
    std::cerr << "EXTERNAL_API_URL_EDGE_DEVICE Env Var not Passed In\n";
    return 1;
  }
  std::string deviceID{getEnvVar("DEVICE_ID")};
  if (deviceID == "") {
    std::cerr << "DEVICE_ID Env Var not Passed In\n";
    return 1;
  }
  std::string heartbeatSeconds{getEnvVar("HEARTBEAT_SECONDS")};
  if (heartbeatSeconds == "") {
    std::cerr << "HEARTBEAT_SECONDS Env Var not Passed In\n";
    return 1;
  }
  std::string confirmationHeartbeats{getEnvVar("CONFIRMATION_HEARTBEATS")};
  if (confirmationHeartbeats == "") {
    std::cerr << "CONFIRMATION_HEARTBEATS Env Var not Passed In\n";
    return 1;
  }

  CONFIRMATION_FIRMWARE_HEARTBEATS = std::stoi(confirmationHeartbeats);
  heartbeatDeltaSeconds =
      static_cast<std::chrono::seconds>(std::stoi(heartbeatSeconds));

  // CURL the most recent Firmware Deployed to Device
  mostRecentURL =
      externalAPIURL + "/firmware/current_device_firmware/" + deviceID;

  // NOTE: First State is Setup
  IOTHUB_DEVICE_CLIENT_LL_HANDLE device_ll_handle{
      setup(connectionString.data(), protocol, &incomingDeployment)};

  if (device_ll_handle == nullptr) {
    // NOTE: Transition to Shutdown if Setup Fails
    shutdown();
    return 1;
  }

  // Set up for EPOLL (Non-Blocking Read for Field Techs)
  int epoll_fd{epollSetup()};
  if (epoll_fd == -1) {
    shutdown(device_ll_handle);
    return 1;
  }

  std::array<epoll_event, 1> events;
  // Subtracting so heartbeat happens at first iteration not after one delta
  auto last_heartbeat{std::chrono::steady_clock::now() - heartbeatDeltaSeconds};

  // NOTE: Transitioning to STABLE State
  while (isStable) {
    // NOTE: Handles transitions out of DEPLOYED State
    handleFieldResponse(epoll_fd, events, device_ll_handle);

    // NOTE: Handles INSTALL State
    checkFirmwareInstallation();

    // NOTE: Handles CONFIRMATION State Failure Transition
    checkConfirmationFailure(device_ll_handle);

    // NOTE: Handles CONFIRMATION State Success Transition
    checkConfirmationSuccess(device_ll_handle);

    // Handling Heartbeats
    auto now{std::chrono::steady_clock::now()};
    if (now - last_heartbeat >= heartbeatDeltaSeconds) {
      controlLoopHeartbeat(device_ll_handle);
      confirmFirmwarePulse();

      last_heartbeat += heartbeatDeltaSeconds;
    }

    IoTHubDeviceClient_LL_DoWork(
        device_ll_handle); // maintain network engine so connection stays alive
    ThreadAPI_Sleep(controlLoopSleepDeltaMilliseconds); // sleeping to not cause
                                                        // 100% cpu utilization
  }

  // NOTE: Go to Shutdown State when Stable State ends
  close(epoll_fd);
  shutdown(device_ll_handle);
  return 0;
}
