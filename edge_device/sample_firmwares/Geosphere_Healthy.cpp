#include <chrono>
#include <cmath>
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

static std::string waveform(int width) {
  std::string w;
  const char *chars[] = {"▁", "▂", "▃", "▄", "▅", "▆", "▇",
                         "█", "▇", "▆", "▅", "▄", "▃", "▂"};
  for (int i = 0; i < width; ++i) {
    int idx = static_cast<int>(std::rand() % 14);
    w += chars[idx];
  }
  return w;
}

auto main() -> int {
  std::srand(static_cast<unsigned>(std::time(nullptr)));

  while (true) {
    double depth = randRange(2400.0, 2600.0);
    double amplitude = randRange(0.02, 0.08);
    double frequency = randRange(18.0, 32.0);
    double temp = randRange(142.0, 158.0);
    double pressure = randRange(8800.0, 9200.0);
    double porosity = randRange(18.0, 24.0);

    // Clear screen

    std::cout << "\033[1;36m";
    std::cout
        << "╔══════════════════════════════════════════════════════════╗\n";
    std::cout
        << "║         GEOSPHERE DCA-6101  ▸  FORMATION MONITOR         ║\n";
    std::cout << "║                  STATUS: \033[1;32m● NOMINAL\033[1;36m     "
                 "                   ║\n";
    std::cout
        << "╚══════════════════════════════════════════════════════════╝\n";
    std::cout << "\033[0m\n";

    std::cout << "\033[1;33m  SEISMIC WAVEFORM\033[0m\n";
    std::cout << "  \033[32m" << waveform(54) << "\033[0m\n\n";

    std::cout << "\033[1;37m  DEPTH          \033[0m"
              << bar(depth - 2000, 1000, 30, "\033[32m") << "  \033[1;32m"
              << depth << " m\033[0m\n\n";

    std::cout << "\033[1;37m  AMPLITUDE      \033[0m"
              << bar(amplitude, 0.1, 30, "\033[32m") << "  \033[1;32m"
              << amplitude << " g\033[0m\n\n";

    std::cout << "\033[1;37m  FREQUENCY      \033[0m"
              << bar(frequency, 40, 30, "\033[32m") << "  \033[1;32m"
              << frequency << " Hz\033[0m\n\n";

    std::cout << "\033[1;37m  TEMPERATURE    \033[0m"
              << bar(temp, 200, 30, "\033[32m") << "  \033[1;32m" << temp
              << " °C\033[0m\n\n";

    std::cout << "\033[1;37m  PRESSURE       \033[0m"
              << bar(pressure, 12000, 30, "\033[32m") << "  \033[1;32m"
              << pressure << " psi\033[0m\n\n";

    std::cout << "\033[1;37m  POROSITY       \033[0m"
              << bar(porosity, 40, 30, "\033[32m") << "  \033[1;32m" << porosity
              << " %\033[0m\n\n";

    std::cout
        << "\033[90m  "
           "─────────────────────────────────────────────────────────\033[0m\n";
    std::cout << "\033[90m  All systems nominal. Formation data within "
                 "expected range.\033[0m\n";

    std::cout.flush();
    std::this_thread::sleep_for(std::chrono::seconds(3));
  }
}
