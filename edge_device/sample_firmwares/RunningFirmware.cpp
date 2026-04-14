#include <chrono>
#include <iostream>
#include <thread>

auto main() -> int {
  while (true) {
    std::cout << "Running Firmware! . . . \n";
    std::this_thread::sleep_for(std::chrono::seconds(3));
  }
}
