cmake_minimum_required(VERSION 3.16)
project(nas_pro_desktop)

set(CMAKE_CXX_STANDARD 17)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_subdirectory(ui/desktop)
