#!/bin/bash

clear
echo "==========================="
echo "     NAS-PRO LAUNCHER      "
echo "==========================="
echo ""
echo "1. Window Manager"
echo "2. System Shell"
echo "3. Storage"
echo "4. Network"
echo "5. Exit"
echo ""

read -p "Choose app: " a

case $a in
  1) bash ui/desktop/window_manager.sh ;;
  2) bash ui/desktop/nas-shell.sh ;;
  3) df -h ;;
  4) ip a ;;
  5) exit ;;
  *) echo "Invalid" ;;
esac
