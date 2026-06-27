#!/bin/bash
set -e

echo "BUILDING NAS-PRO UI..."

mkdir -p build-gui
cd build-gui

cmake ../ui/desktop
make -j$(nproc)

echo "DONE: ./nas-ui"
