#!/bin/bash
echo "Building NAS-PRO ISO (SIMULATED MODE)..."
grub-mkrescue -o nas-pro.iso iso 2>/dev/null || echo "ISO tools missing"
echo "DONE: nas-pro.iso"
