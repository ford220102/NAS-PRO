#!/bin/bash

echo "==================="
echo " NAS-PRO DESKTOP"
echo "==================="
echo "[1] File Manager"
echo "[2] Terminal"
echo "[3] Settings"
echo "[4] Network"
echo "[5] Shutdown"
echo ""

read -p "Select app: " a

case $a in
  1) echo "Opening File Manager..." ;;
  2) bash ;;
  3) echo "Settings opened" ;;
  4) ip a ;;
  5) exit ;;
esac
