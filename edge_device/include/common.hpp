#pragma once

#include <atomic>
#include <string>

inline auto getEnvVar(const std::string &key) -> std::string {
  const char *val{std::getenv(key.c_str())};
  return (val == nullptr) ? "" : std::string{val};
}

extern std::string mostRecentURL;
extern std::atomic<bool> isNewFirmwareDownloaded;

extern std::string_view partitionAPath;
extern std::string_view partitionBPath;
extern std::atomic<bool> isPartitionA;
extern std::atomic<bool> isNewFirmwareAlive;
extern std::atomic<int> failureCount;
extern std::atomic<int> firmwareHeartbeats;
extern std::atomic<pid_t> partitionAFirmwarePID;
extern std::atomic<pid_t> partitionBFirmwarePID;
extern int CONFIRMATION_FIRMWARE_HEARTBEATS;
