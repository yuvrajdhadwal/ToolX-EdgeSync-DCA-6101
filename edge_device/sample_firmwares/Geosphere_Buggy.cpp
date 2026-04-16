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

static std::string waveform(int width, bool corrupted) {
  std::string w;
  const char *normal[] = {"▁", "▂", "▃", "▄", "▅", "▆", "▇",
                          "█", "▇", "▆", "▅", "▄", "▃", "▂"};
  const char *glitch[] = {"█", "█", "▁", "▁", "█", "▁", "█",
                          "█", "▁", "▁", "▁", "█", "█", "▁"};
  for (int i = 0; i < width; ++i) {
    if (corrupted && std::rand() % 3 == 0)
      w += glitch[std::rand() % 14];
    else
      w += normal[std::rand() % 14];
  }
  return w;
}

auto main() -> int {
  std::srand(static_cast<unsigned>(std::time(nullptr)));

  auto start = std::chrono::steady_clock::now();
  int tick = 0;

  while (true) {
    auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(
                       std::chrono::steady_clock::now() - start)
                       .count();

    // Degradation stages
    // 0-10s:  nominal
    // 10-20s: warning
    // 20-30s: critical
    // 30s+:   crash

    bool warning = elapsed >= 10;
    bool critical = elapsed >= 20;

    if (elapsed >= 30) {
      std::cout << "\033[1;31m";
      std::cout
          << "╔══════════════════════════════════════════════════════════╗\n";
      std::cout
          << "║         GEOSPHERE DCA-6101  ▸  FORMATION MONITOR         ║\n";
      std::cout
          << "║                  STATUS: ● FATAL ERROR                   ║\n";
      std::cout
          << "╚══════════════════════════════════════════════════════════╝\n";
      std::cout << "\033[0m\n";
      std::cout << "\033[1;31m  [FATAL] Sensor array unresponsive\033[0m\n";
      std::cout
          << "\033[1;31m  [FATAL] Formation data pipeline corrupted\033[0m\n";
      std::cout << "\033[1;31m  [FATAL] Memory fault at 0x00F4A231\033[0m\n";
      std::cout << "\033[1;31m  [FATAL] Core dump initiated...\033[0m\n\n";
      std::cout << "\033[90m  Firmware version 1.0.0 has encountered an "
                   "unrecoverable error.\033[0m\n";
      std::cout
          << "\033[90m  Please deploy updated firmware immediately.\033[0m\n";
      std::cout.flush();
      // Crash — exit so control plane sees the process die
      return 1;
    }

    // Dynamic sensor drift during degradation
    double depthDrift = critical  ? randRange(200, 800)
                        : warning ? randRange(20, 60)
                                  : 0;
    double ampSpike = critical  ? randRange(0.3, 0.9)
                      : warning ? randRange(0.1, 0.2)
                                : 0;
    double freqDrift = critical  ? randRange(10, 30)
                       : warning ? randRange(2, 6)
                                 : 0;
    double tempSpike = critical  ? randRange(40, 80)
                       : warning ? randRange(5, 15)
                                 : 0;
    double pressureSpike = critical  ? randRange(1000, 3000)
                           : warning ? randRange(100, 400)
                                     : 0;

    double depth = randRange(2400.0, 2600.0) + depthDrift;
    double amplitude = randRange(0.02, 0.08) + ampSpike;
    double frequency = randRange(18.0, 32.0) + freqDrift;
    double temp = randRange(142.0, 158.0) + tempSpike;
    double pressure = randRange(8800.0, 9200.0) + pressureSpike;
    double porosity = randRange(18.0, 24.0);

    std::string statusColor = critical  ? "\033[1;31m"
                              : warning ? "\033[1;33m"
                                        : "\033[1;32m";
    std::string statusText = critical  ? "● CRITICAL"
                             : warning ? "⚠ WARNING "
                                       : "● NOMINAL ";
    std::string barColor = critical  ? "\033[31m"
                           : warning ? "\033[33m"
                                     : "\033[32m";
    std::string waveColor = critical  ? "\033[31m"
                            : warning ? "\033[33m"
                                      : "\033[32m";


    std::cout << "\033[1;36m";
    std::cout
        << "╔══════════════════════════════════════════════════════════╗\n";
    std::cout
        << "║         GEOSPHERE DCA-6101  ▸  FORMATION MONITOR         ║\n";
    std::cout << "║                  STATUS: " << statusColor << statusText
              << "\033[1;36m                     ║\n";
    std::cout
        << "╚══════════════════════════════════════════════════════════╝\n";
    std::cout << "\033[0m\n";

    std::cout << "\033[1;33m  SEISMIC WAVEFORM\033[0m\n";
    std::cout << "  " << waveColor << waveform(54, critical || warning)
              << "\033[0m\n\n";

    std::cout << "\033[1;37m  DEPTH          \033[0m"
              << bar(depth - 2000, 1000, 30, barColor) << "  " << statusColor
              << depth << " m\033[0m\n\n";

    std::cout << "\033[1;37m  AMPLITUDE      \033[0m"
              << bar(amplitude, 0.1, 30, barColor) << "  " << statusColor
              << amplitude << " g\033[0m\n\n";

    std::cout << "\033[1;37m  FREQUENCY      \033[0m"
              << bar(frequency, 40, 30, barColor) << "  " << statusColor
              << frequency << " Hz\033[0m\n\n";

    std::cout << "\033[1;37m  TEMPERATURE    \033[0m"
              << bar(temp, 200, 30, barColor) << "  " << statusColor << temp
              << " °C\033[0m\n\n";

    std::cout << "\033[1;37m  PRESSURE       \033[0m"
              << bar(pressure, 12000, 30, barColor) << "  " << statusColor
              << pressure << " psi\033[0m\n\n";

    std::cout << "\033[1;37m  POROSITY       \033[0m"
              << bar(porosity, 40, 30, barColor) << "  " << statusColor
              << porosity << " %\033[0m\n\n";

    std::cout
        << "\033[90m  "
           "─────────────────────────────────────────────────────────\033[0m\n";

    if (critical) {
      std::cout << "\033[1;31m  [CRITICAL] Anomalous readings detected across "
                   "all sensors!\033[0m\n";
      std::cout << "\033[1;31m  [CRITICAL] Formation data integrity "
                   "compromised!\033[0m\n";
    } else if (warning) {
      std::cout << "\033[1;33m  [WARNING]  Sensor drift detected. Monitoring "
                   "closely...\033[0m\n";
      std::cout << "\033[1;33m  [WARNING]  Amplitude and pressure outside "
                   "normal range.\033[0m\n";
    } else {
      std::cout << "\033[90m  All systems nominal. Formation data within "
                   "expected range.\033[0m\n";
    }

    std::cout.flush();
    ++tick;
    std::this_thread::sleep_for(std::chrono::seconds(3));
  }
}
