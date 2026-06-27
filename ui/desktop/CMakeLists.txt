cmake_minimum_required(VERSION 3.16)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTORCC ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(nas-ui
    main.cpp
    taskbar.cpp
    window_manager.cpp
)

target_include_directories(nas-ui PRIVATE ../core)

target_link_libraries(nas-ui Qt6::Widgets)
