#!/bin/bash
set -euo pipefail

echo "=== NAS-PRO BUILDER v3 STABLE ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf "$WORKDIR"
mkdir -p "$ROOTFS" "$ISO/boot/grub" "$ISO/live"

# =========================================================
# 1. BASE SYSTEM
# =========================================================
debootstrap --arch=amd64 bookworm "$ROOTFS" http://deb.debian.org/debian

# FIX: resolv + env issues
cp /etc/resolv.conf "$ROOTFS/etc/resolv.conf"

# =========================================================
# 2. APT SOURCES
# =========================================================
cat > "$ROOTFS/etc/apt/sources.list" <<EOF
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

# =========================================================
# 3. CORE SYSTEM (FIX FOR /usr/bin/env ERROR)
# =========================================================
chroot "$ROOTFS" /bin/bash -c "
apt-get update &&
apt-get install -y coreutils bash

apt-get install -y \
  linux-image-amd64 \
  initramfs-tools \
  systemd systemd-sysv dbus \
  sudo nginx openssh-server \
  curl wget git \
  live-boot live-config
"

# =========================================================
# 4. USER + CONFIG
# =========================================================
echo "nas-pro" > "$ROOTFS/etc/hostname"

chroot "$ROOTFS" /bin/bash -c "
useradd -m -s /bin/bash naspro || true
echo 'naspro:naspro' | chpasswd
echo 'root:naspro' | chpasswd
"

# =========================================================
# 5. WEB UI (PLACEHOLDER OR DIST)
# =========================================================
mkdir -p "$ROOTFS/var/www/nas-pro"

if [ -d dist ]; then
  cp -r dist/* "$ROOTFS/var/www/nas-pro/"
else
  echo "<h1>NAS-PRO v3 UI</h1>" > "$ROOTFS/var/www/nas-pro/index.html"
fi

# =========================================================
# 6. KERNEL + INITRD SAFE COPY
# =========================================================
KERNEL=$(ls "$ROOTFS/boot"/vmlinuz-* 2>/dev/null | head -n1 || true)
INITRD=$(ls "$ROOTFS/boot"/initrd.img-* 2>/dev/null | head -n1 || true)

if [ -z "$KERNEL" ] || [ -z "$INITRD" ]; then
  echo "ERROR: kernel or initrd missing"
  exit 1
fi

cp "$KERNEL" "$ISO/boot/vmlinuz"
cp "$INITRD" "$ISO/boot/initrd.img"

# =========================================================
# 7. SQUASHFS (ROOTFS)
# =========================================================
mksquashfs "$ROOTFS" "$ISO/live/filesystem.squashfs" -e boot

# =========================================================
# 8. GRUB CONFIG (SIMPLE + STABLE)
# =========================================================
cat > "$ISO/boot/grub/grub.cfg" <<EOF
set timeout=3
set default=0

menuentry "NAS-PRO v3 Boot" {
    linux /boot/vmlinuz boot=live quiet
    initrd /boot/initrd.img
}

menuentry "NAS-PRO Debug" {
    linux /boot/vmlinuz boot=live debug
    initrd /boot/initrd.img
}
EOF

# =========================================================
# 9. ISO BUILD
# =========================================================
grub-mkrescue -o "$OUTPUT" "$ISO"

echo "=== DONE ==="
ls -lh "$OUTPUT"