#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Build Debian Live ISO for NAS Pro
# Requires: live-build, debootstrap, squashfs-tools, xorriso,
#           isolinux, syslinux-efi, grub-pc-bin, grub-efi-amd64-bin, mtools
# =============================================================================

DIST="bookworm"
ARCH="amd64"
LB_DIR="live-build"
ISO_NAME="naspro-debian-${DIST}-${ARCH}.iso"

# --- Clean previous build ---------------------------------------------------
if [ -d "${LB_DIR}" ]; then
    rm -rf "${LB_DIR}"
fi
mkdir -p "${LB_DIR}"
cd "${LB_DIR}"

# --- Configure live-build ----------------------------------------------------
lb config \
    --distribution "${DIST}" \
    --architecture "${ARCH}" \
    --binary-images iso-hybrid \
    --binary-filesystem fat32 \
    --debian-installer false \
    --debian-installer-gui false \
    --archive-areas "main contrib non-free non-free-firmware" \
    --parent-archive-areas "main contrib non-free non-free-firmware" \
    --apt-indices false \
    --memtest none \
    --win32-loader false \
    --bootloader syslinux,grub-efi \
    --updates true \
    --security true \
    --backports false \
    --firmware-chroot true \
    --firmware-binary true \
    --initsystem systemd

# --- Package list ------------------------------------------------------------
mkdir -p config/package-lists

cat > config/package-lists/naspro.list.chroot << 'EOF'
# Kernel and boot
linux-image-amd64
linux-headers-amd64
initramfs-tools

# Live system
live-boot
live-config-systemd

# Bootloader (needed for install-to-disk)
grub-common
grub-pc-bin
grub-efi-amd64-bin
grub-efi-amd64-signed
shim-signed
syslinux-common
syslinux-efi
isolinux
mtools

# Firmware — critical for hardware boot
firmware-linux
firmware-linux-nonfree
firmware-misc-nonfree
firmware-realtek
firmware-atheros
firmware-brcm80211
firmware-iwlwifi
firmware-libertas
firmware-qlogic
firmware-bnx2
firmware-bnx2x

# Base system
systemd
systemd-sysv
udev
dbus
policykit-1
sudo
passwd
console-setup
console-data
kbd

# Network
net-tools
iproute2
iputils-ping
network-manager
openssh-server
ethtool

# Filesystem / partitioning tools
parted
gdisk
e2fsprogs
dosfstools
ntfs-3g
lvm2
mdadm

# Disk tools
smartmontools
hdparm
nvme-cli

# Web server
nginx

# Node.js
nodejs
npm

# System utilities
vim
nano
curl
wget
rsync
htop
tmux

# NAS services
samba
nfs-common
netatalk
avahi-daemon
zfsutils-linux
EOF

# --- Copy hooks from project into live-build config -------------------------
if [ -d "../config/hooks/live" ]; then
    mkdir -p config/hooks/live
    cp -r ../config/hooks/live/* config/hooks/live/
    chmod +x config/hooks/live/*.hook.chroot 2>/dev/null || true
fi

# --- Include frontend dist in rootfs -----------------------------------------
mkdir -p config/includes.chroot/usr/share/naspro
if [ -d "../dist" ]; then
    cp -r ../dist config/includes.chroot/usr/share/naspro/
fi

# --- Build the ISO -----------------------------------------------------------
lb build

# --- Move result to project root ---------------------------------------------
cd ..
if [ -f "${LB_DIR}/live-image-${ARCH}.hybrid.iso" ]; then
    mv "${LB_DIR}/live-image-${ARCH}.hybrid.iso" "${ISO_NAME}"
    echo "Build complete: ${ISO_NAME}"
    echo "Size: $(du -h "${ISO_NAME}" | cut -f1)"
else
    echo "Error: ISO build failed — no .iso file found."
    exit 1
fi
