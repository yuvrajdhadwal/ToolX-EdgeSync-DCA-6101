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

  while (true) {
    double depth = randRange(3100.0, 3300.0);
    double temp = randRange(155.0, 175.0);
    double pressure = randRange(10200.0, 10800.0);
    double flow = randRange(280.0, 320.0);
    double clarity = randRange(88.0, 98.0);
    double rotation = randRange(0.0, 360.0);


    std::cout << "\033[1;35m";
    std::cout
        << "╔══════════════════════════════════════════════════════════╗\n";
    std::cout
        << "║         PERISCOPE DCA-6101  ▸  DOWNHOLE CAMERA           ║\n";
    std::cout << "║                  STATUS: \033[1;32m● NOMINAL\033[1;35m     "
                 "                   ║\n";
    std::cout
        << "╚══════════════════════════════════════════════════════════╝\n";
    std::cout << "\033[0m\n";

    // ASCII camera view
    std::cout << "\033[1;33m  LIVE FEED\033[0m\n";
    std::cout << "\033[90m  "
                 "┌──────────────────────────────────────────────┐\033[0m\n";
    std::cout << "\033[90m  │\033[0m\033[32m  ····  ○  ····  ○  ····  ○  ····  "
                 "○  ····   \033[90m│\033[0m\n";
    std::cout << "\033[90m  │\033[0m\033[32m    Formation layer — sandstone @ "
              << static_cast<int>(depth) << "m     \033[90m│\033[0m\n";
    std::cout << "\033[90m  │\033[0m\033[32m  ····  ○  ····  ○  ····  ○  ····  "
                 "○  ····   \033[90m│\033[0m\n";
    std::cout << "\033[90m  "
                 "└──────────────────────────────────────────────┘\033[0m\n\n";

    std::cout << "\033[1;37m  DEPTH          \033[0m"
              << bar(depth - 2500, 1500, 30, "\033[32m") << "  \033[1;32m"
              << depth << " m\033[0m\n\n";
    std::cout << "\033[1;37m  TEMPERATURE    \033[0m"
              << bar(temp, 200, 30, "\033[32m") << "  \033[1;32m" << temp
              << " °C\033[0m\n\n";
    std::cout << "\033[1;37m  PRESSURE       \033[0m"
              << bar(pressure, 15000, 30, "\033[32m") << "  \033[1;32m"
              << pressure << " psi\033[0m\n\n";
    std::cout << "\033[1;37m  FLOW RATE      \033[0m"
              << bar(flow, 400, 30, "\033[32m") << "  \033[1;32m" << flow
              << " L/min\033[0m\n\n";
    std::cout << "\033[1;37m  IMAGE CLARITY  \033[0m"
              << bar(clarity, 100, 30, "\033[32m") << "  \033[1;32m" << clarity
              << " %\033[0m\n\n";
    std::cout << "\033[1;37m  ROTATION       \033[0m"
              << bar(rotation, 360, 30, "\033[32m") << "  \033[1;32m"
              << rotation << " °\033[0m\n\n";

    std::cout
        << "\033[90m  "
           "─────────────────────────────────────────────────────────\033[0m\n";
    std::cout << "\033[90m  Camera feed stable. All downhole parameters "
                 "nominal.\033[0m\n";

    std::cout.flush();
    std::this_thread::sleep_for(std::chrono::seconds(3));
  }
}
