#!/bin/bash

echo "BOOT → NAS-PRO SYSTEM"
sleep 1

echo "Starting Login Screen..."
./build-gui/login || ./ui/desktop/icons.sh
