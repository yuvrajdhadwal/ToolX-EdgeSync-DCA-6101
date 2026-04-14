#include "common.hpp"
#include <cstdio>
#include <cstdlib>

const char* filename = "firmware";

auto filewrite_callback(char *ptr, std::size_t size, std::size_t nmemb,
                        void *stream) -> std::size_t {
	std::size_t written = fwrite(ptr, size, nmemb, static_cast<FILE *>(stream));
	return written;
}

void downloadFirmware() {
  if (!static_cast<bool>(curl)) {
    return;
  }

  FILE *pagefile = fopen(filename, "wb");
  if (static_cast<bool>(pagefile)) {
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, pagefile);
    curl_easy_perform(curl);
    fclose(pagefile);
  }
}
