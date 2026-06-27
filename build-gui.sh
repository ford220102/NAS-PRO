#!/bin/bash
set -e

mkdir -p build-gui
cd build-gui

cmake ../ui/desktop
make -j$(nproc)

echo "NAS-PRO GUI BUILT: ./nas-desktop"
