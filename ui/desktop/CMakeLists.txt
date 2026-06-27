cmake_minimum_required(VERSION 3.16)
project(nas-pro-desktop)

set(CMAKE_CXX_STANDARD 17)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(nas-desktop shell.cpp)

target_link_libraries(nas-desktop Qt6::Widgets)
