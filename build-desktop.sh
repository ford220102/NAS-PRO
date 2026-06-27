#!/bin/bash
set -e

mkdir -p build-desktop
cd build-desktop

cmake ../ui/desktop
make -j$(nproc)
