#include "common.hpp"
#include <cstdio>
#include <cstdlib>
#include <thread>
#include <chrono>

const char *filename = "/tmp/firmware";
constexpr int RETRY_DELAY_MS = 3000;
constexpr int RETRY_ATTEMPTS = 3;

auto filewrite_callback(char *ptr, std::size_t size, std::size_t nmemb,
                        void *stream) -> std::size_t {
  std::size_t written = fwrite(ptr, size, nmemb, static_cast<FILE *>(stream));
  return written;
}

static auto attemptDownloadFirmware(const char *url) -> bool {
  CURL *curl = curl_easy_init();

  if (!static_cast<bool>(curl)) {
    return false;
  }
  // std::cout << "URL: " << url << '\n';

  curl_easy_setopt(curl, CURLOPT_VERBOSE, 0L);    // set to 1L for debugging
  curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 1L); // set to 0L for progress bar
  curl_easy_setopt(curl, CURLOPT_URL, url);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, filewrite_callback);

  FILE *pagefile = fopen(filename, "wb");
  if (!static_cast<bool>(pagefile)) {
    return false;
  }

  curl_easy_setopt(curl, CURLOPT_WRITEDATA, pagefile);
  curl_easy_perform(curl);
  fclose(pagefile);
  curl_easy_cleanup(curl);

  return true;
}

auto downloadFirmware() -> bool {
  char *url = mostRecentURL.data();
  for (int i{0}; i < RETRY_ATTEMPTS; ++i) {
    if (attemptDownloadFirmware(url)) {
      std::cout << "Firmware Download Complete!\n";
      return true;
    }
    std::cout << "Firmware Download Failed! ... Retrying ... \n";
    std::this_thread::sleep_for(std::chrono::milliseconds(RETRY_DELAY_MS));
  }

  std::cout << "Firmware Download Failed! ... Giving Up ... \n";
  return false;
}
