#include <vector>
#include <string>

struct Window {
    std::string name;
    bool active;
};

class WindowManager {
public:
    static std::vector<Window> windows;

    static void createWindow(const std::string& name) {
        windows.push_back({name, true});
    }

    static void listWindows() {
        for (auto &w : windows) {
            printf("Window: %s\n", w.name.c_str());
        }
    }
};

std::vector<Window> WindowManager::windows;
