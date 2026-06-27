cmake_minimum_required(VERSION 3.16)
project(nas_pro_ui)

set(CMAKE_CXX_STANDARD 17)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(nas-ui main.cpp)

target_link_libraries(nas-ui Qt6::Widgets)
