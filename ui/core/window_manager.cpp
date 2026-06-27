#include "window_manager.h"
#include <iostream>

void WindowManager::init() {
    std::cout << "Window Manager initialized\n";
}

void WindowManager::openWindow(const char* name) {
    std::cout << "Opening window: " << name << std::endl;
}
