#!/bin/bash
set -e

echo "=== NAS-PRO CLEAN ISO BUILDER (FIXED) ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $ROOTFS $ISO/boot/grub $ISO/live

# -----------------------------
# 1. ROOTFS
# -----------------------------
debootstrap --arch=amd64 bookworm $ROOTFS http://deb.debian.org/debian

cat > $ROOTFS/etc/apt/sources.list <<EOF
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

chroot $ROOTFS apt-get update

chroot $ROOTFS apt-get install -y \
  linux-image-amd64 \
  initramfs-tools \
  systemd systemd-sysv dbus sudo \
  nginx openssh-server curl wget git \
  samba nfs-kernel-server \
  live-boot live-config

# -----------------------------
# 2. CONFIG SYSTEM
# -----------------------------
echo "nas-pro" > $ROOTFS/etc/hostname

mkdir -p $ROOTFS/var/www/nas-pro
cp -r dist/* $ROOTFS/var/www/nas-pro/ 2>/dev/null || true

cat > $ROOTFS/etc/systemd/system/nas-pro.service <<EOF
[Unit]
Description=NAS-PRO Web UI
After=network.target

[Service]
ExecStart=/usr/sbin/nginx -g 'daemon off;'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

chroot $ROOTFS systemctl enable nas-pro.service
chroot $ROOTFS systemctl enable ssh

# -----------------------------
# 3. INITRAMFS + KERNEL FIX
# -----------------------------
chroot $ROOTFS update-initramfs -u -k all

VMLINUX=$(ls $ROOTFS/boot/vmlinuz-* | head -n1)
INITRD=$(ls $ROOTFS/boot/initrd.img-* | head -n1)

cp "$VMLINUX" $ISO/boot/vmlinuz
cp "$INITRD" $ISO/boot/initrd.img

# -----------------------------
# 4. SQUASHFS
# -----------------------------
mksquashfs $ROOTFS $ISO/live/filesystem.squashfs -e boot

# -----------------------------
# 5. GRUB
# -----------------------------
cat > $ISO/boot/grub/grub.cfg <<EOF
set timeout=3
set default=0

menuentry "NAS-PRO Boot" {
    linux /boot/vmlinuz boot=live quiet
    initrd /boot/initrd.img
}

menuentry "NAS-PRO Debug" {
    linux /boot/vmlinuz boot=live debug
    initrd /boot/initrd.img
}
EOF

# -----------------------------
# 6. ISO BUILD (SAFE)
# -----------------------------
grub-mkrescue -o $OUTPUT $ISO

echo "=== DONE ==="
ls -lh $OUTPUT