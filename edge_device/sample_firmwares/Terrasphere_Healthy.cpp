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
    double vibration = randRange(0.8, 1.4);
    double wob = randRange(18.0, 26.0);
    double torque = randRange(8200.0, 9800.0);
    double rop = randRange(12.0, 18.0);
    double mwd_temp = randRange(138.0, 152.0);
    double shock = randRange(2.0, 6.0);


    std::cout << "\033[1;36m";
    std::cout
        << "╔══════════════════════════════════════════════════════════╗\n";
    std::cout
        << "║         TERRASPHERE DCA-6101  ▸  FORMATION EVAL          ║\n";
    std::cout << "║                  STATUS: \033[1;32m● NOMINAL\033[1;36m     "
                 "                   ║\n";
    std::cout
        << "╚══════════════════════════════════════════════════════════╝\n";
    std::cout << "\033[0m\n";

    // Drill bit animation
    std::cout << "\033[1;33m  DRILL DYNAMICS\033[0m\n";
    std::cout << "  \033[36m⬡ ⬡ ⬡  ROTATING  ⬡ ⬡ ⬡\033[0m  ROP: \033[32m" << rop
              << " m/hr\033[0m\n\n";

    std::cout << "\033[1;37m  VIBRATION      \033[0m"
              << bar(vibration, 5, 30, "\033[32m") << "  \033[1;32m"
              << vibration << " g\033[0m\n\n";
    std::cout << "\033[1;37m  WEIGHT ON BIT  \033[0m"
              << bar(wob, 50, 30, "\033[32m") << "  \033[1;32m" << wob
              << " klbf\033[0m\n\n";
    std::cout << "\033[1;37m  TORQUE         \033[0m"
              << bar(torque, 15000, 30, "\033[32m") << "  \033[1;32m" << torque
              << " ft·lbf\033[0m\n\n";
    std::cout << "\033[1;37m  RATE OF PEN    \033[0m"
              << bar(rop, 30, 30, "\033[32m") << "  \033[1;32m" << rop
              << " m/hr\033[0m\n\n";
    std::cout << "\033[1;37m  MWD TEMP       \033[0m"
              << bar(mwd_temp, 200, 30, "\033[32m") << "  \033[1;32m"
              << mwd_temp << " °C\033[0m\n\n";
    std::cout << "\033[1;37m  SHOCK LEVEL    \033[0m"
              << bar(shock, 20, 30, "\033[32m") << "  \033[1;32m" << shock
              << " g\033[0m\n\n";

    std::cout
        << "\033[90m  "
           "─────────────────────────────────────────────────────────\033[0m\n";
    std::cout << "\033[90m  Drilling parameters stable. Formation response "
                 "nominal.\033[0m\n";

    std::cout.flush();
    std::this_thread::sleep_for(std::chrono::seconds(3));
  }
}
