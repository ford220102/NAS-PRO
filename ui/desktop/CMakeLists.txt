cmake_minimum_required(VERSION 3.16)
project(nas-pro-os)

set(CMAKE_CXX_STANDARD 17)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(nas-os os_shell.cpp)

target_link_libraries(nas-os Qt6::Widgets)
