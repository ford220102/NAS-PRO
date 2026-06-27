#!/bin/bash

clear
echo "==========================="
echo "   NAS-PRO DESKTOP SHELL   "
echo "==========================="
echo ""
echo "1. System Info"
echo "2. Storage"
echo "3. Network"
echo "4. Apps"
echo "5. Exit"
echo ""

read -p "Select option: " opt

case $opt in
  1) uname -a ;;
  2) df -h ;;
  3) ip a ;;
  4) ls ui/apps ;;
  5) exit ;;
  *) echo "Invalid option" ;;
esac
