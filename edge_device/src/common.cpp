#include "common.hpp"

std::string mostRecentURL;
std::atomic<bool> isPartitionA = true;

// Flag for Control Agent Loop
std::atomic<bool> isStable{true};

// Triggers transition to DEPLOYED State
std::atomic<bool> incomingDeployment{false};

// Triggers transition to INSTALL State
std::atomic<bool> isNewFirmwareDownloaded = false;

// Triggers transition to CONFIRMATION State
std::atomic<bool> isNewFirmwareAlive = false;

std::atomic<pid_t> partitionAFirmwarePID = 0;
std::atomic<pid_t> partitionBFirmwarePID = 0;

std::atomic<int> failureCount = 0;
std::atomic<int> firmwareHeartbeats = 0;

std::string_view partitionAPath{"/tmp/firmwareA"};
std::string_view partitionBPath{"/tmp/firmwareB"};

int CONFIRMATION_FIRMWARE_HEARTBEATS = 1;
