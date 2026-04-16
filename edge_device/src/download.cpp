#include "download.hpp"

#include "common.hpp"

#include <chrono>
#include <iostream>
#include <thread>

static auto filewrite_callback(char *ptr, std::size_t size, std::size_t nmemb,
                               void *stream) -> std::size_t {
  std::size_t written = fwrite(ptr, size, nmemb, static_cast<FILE *>(stream));
  return written;
}

static auto attemptDownloadFirmware(const char *url) -> bool {
  CURL *curl = curl_easy_init();

  if (!static_cast<bool>(curl)) {
    return false;
  }

  curl_easy_setopt(curl, CURLOPT_VERBOSE, 0L);    // NOTE: 1L for debugging
  curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1L); // NOTE: 0L for progress bar
  curl_easy_setopt(curl, CURLOPT_URL, url);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, filewrite_callback);

  std::string_view filename;
  if (isPartitionA) {
    filename = partitionBPath;
  } else {
    filename = partitionAPath;
  }

  FILE *pagefile = fopen(filename.data(), "wb");

  if (!static_cast<bool>(pagefile)) {
    perror("CONTROL PLANE - Opening Firmware File Error");
    return false;
  }

  curl_easy_setopt(curl, CURLOPT_WRITEDATA, pagefile);

  CURLcode result = curl_easy_perform(curl);
  long http_code = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
  fclose(pagefile);
  curl_easy_cleanup(curl);

  if (result != CURLE_OK || http_code != 200) {
    return false;
  }

  return true;
}

auto downloadFirmware() -> bool {
  constexpr int RETRY_ATTEMPTS = 3;
  int RETRY_DELAY_SECONDS = 3;

  std::string downloadURL{mostRecentURL}; // copy by value, ensures no race
                                          // condition pointer invalidation
  char *url = downloadURL.data();

  for (int i{0}; i < RETRY_ATTEMPTS; ++i) {
    if (attemptDownloadFirmware(url)) {
      std::cout << "CONTROL PLANE - Firmware Download Complete!\n";
      return true;
    }

    std::cerr << "CONTROL PLANE - Firmware Download Failed! ... Retrying in "
              << RETRY_DELAY_SECONDS << " . . .\n";
    std::this_thread::sleep_for(std::chrono::seconds(RETRY_DELAY_SECONDS));
    RETRY_DELAY_SECONDS *= 2; // exponential backoff
  }

  std::cerr << "CONTROL PLANE - Firmware Download Failed! ... Giving Up ... \n";
  return false;
}
