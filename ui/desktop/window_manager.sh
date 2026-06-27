#!/bin/bash

clear
echo "=============================="
echo "   NAS-PRO WINDOW MANAGER    "
echo "=============================="
echo ""

echo "[1] Open Terminal Window"
echo "[2] Open File Manager"
echo "[3] Open System Info Window"
echo "[4] Exit WM"
echo ""

read -p "Select window: " w

open_window() {
  echo ""
  echo "----------------------------"
  echo " WINDOW: $1"
  echo "----------------------------"
  echo "$2"
  echo "----------------------------"
  echo ""
}

case $w in
  1) open_window "Terminal" "$(bash --version)" ;;
  2) open_window "Files" "$(ls -la)" ;;
  3) open_window "System" "$(uname -a)" ;;
  4) exit ;;
  *) echo "Invalid" ;;
esac
