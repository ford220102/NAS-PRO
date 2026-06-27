#!/bin/bash
set -e

mkdir -p build-gui
cd build-gui

cmake ../ui/desktop
make -j$(nproc)

echo "Built: nas-desktop + nas-login"
