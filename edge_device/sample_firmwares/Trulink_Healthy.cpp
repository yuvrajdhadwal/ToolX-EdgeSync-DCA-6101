#include <chrono>
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <string>
#include <thread>

static double randRange(double lo, double hi) {
  return lo + (hi - lo) * (std::rand() / (double)RAND_MAX);
}

static std::string bar(double val, double max, int width,
                       const std::string &color) {
  int filled = static_cast<int>((val / max) * width);
  filled = std::max(0, std::min(filled, width));
  std::string b = color;
  for (int i = 0; i < filled; ++i)
    b += "█";
  b += "\033[90m";
  for (int i = filled; i < width; ++i)
    b += "░";
  b += "\033[0m";
  return b;
}

auto main() -> int {
  std::srand(static_cast<unsigned>(std::time(nullptr)));
  int packet = 10000 + std::rand() % 5000;

  while (true) {
    double signal = randRange(88.0, 96.0);
    double latency = randRange(12.0, 28.0);
    double uptime = randRange(99.1, 99.9);
    double bitrate = randRange(4.2, 5.8);
    double snr = randRange(22.0, 30.0);
    packet += static_cast<int>(randRange(80, 120));


    std::cout << "\033[1;32m";
    std::cout
        << "╔══════════════════════════════════════════════════════════╗\n";
    std::cout
        << "║           TRULINK DCA-6101  ▸  TELEMETRY RELAY           ║\n";
    std::cout << "║                  STATUS: \033[1;32m● NOMINAL\033[1;32m     "
                 "                   ║\n";
    std::cout
        << "╚══════════════════════════════════════════════════════════╝\n";
    std::cout << "\033[0m\n";

    // Signal animation
    std::cout << "\033[1;33m  SIGNAL STRENGTH\033[0m\n";
    std::cout << "  \033[32m";
    int bars = static_cast<int>(signal / 10);
    for (int i = 0; i < bars; ++i)
      std::cout << "▐█▌";
    std::cout << "\033[0m  " << signal << " %\n\n";

    std::cout << "\033[1;37m  SIGNAL STR     \033[0m"
              << bar(signal, 100, 30, "\033[32m") << "  \033[1;32m" << signal
              << " %\033[0m\n\n";
    std::cout << "\033[1;37m  LATENCY        \033[0m"
              << bar(latency, 50, 30, "\033[32m") << "  \033[1;32m" << latency
              << " ms\033[0m\n\n";
    std::cout << "\033[1;37m  UPTIME         \033[0m"
              << bar(uptime, 100, 30, "\033[32m") << "  \033[1;32m" << uptime
              << " %\033[0m\n\n";
    std::cout << "\033[1;37m  BITRATE        \033[0m"
              << bar(bitrate, 10, 30, "\033[32m") << "  \033[1;32m" << bitrate
              << " Mbps\033[0m\n\n";
    std::cout << "\033[1;37m  SNR            \033[0m"
              << bar(snr, 40, 30, "\033[32m") << "  \033[1;32m" << snr
              << " dB\033[0m\n\n";
    std::cout << "\033[1;37m  PACKETS SENT   \033[0m"
              << bar(100, 100, 30, "\033[32m") << "  \033[1;32m" << packet
              << "\033[0m\n\n";

    std::cout
        << "\033[90m  "
           "─────────────────────────────────────────────────────────\033[0m\n";
    std::cout << "\033[90m  Telemetry link stable. All channels "
                 "operational.\033[0m\n";

    std::cout.flush();
    std::this_thread::sleep_for(std::chrono::seconds(3));
  }
}
