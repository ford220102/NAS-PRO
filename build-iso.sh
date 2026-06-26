#!/bin/bash
set -e

echo "=== NAS-PRO STABLE v2 DESKTOP OS ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $ROOTFS $ISO/boot/grub $ISO/live

# -----------------------------
# BASE SYSTEM
# -----------------------------
debootstrap --arch=amd64 bookworm $ROOTFS http://deb.debian.org/debian

cat > $ROOTFS/etc/apt/sources.list <<EOF
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

chroot $ROOTFS apt-get update

chroot $ROOTFS apt-get install -y \
  systemd systemd-sysv dbus sudo \
  linux-image-amd64 initramfs-tools \
  nginx openssh-server curl wget git \
  xorg openbox lightdm \
  chromium \
  network-manager \
  live-boot live-config

# -----------------------------
# USERS
# -----------------------------
echo "nas-pro" > $ROOTFS/etc/hostname
echo "root:naspro" | chroot $ROOTFS chpasswd

chroot $ROOTFS useradd -m -s /bin/bash naspro || true
echo "naspro:naspro" | chroot $ROOTFS chpasswd
chroot $ROOTFS usermod -aG sudo naspro

# -----------------------------
# UI (React/Vite DESKTOP MODE)
# -----------------------------
mkdir -p $ROOTFS/var/www/nas-pro

if [ -d "dist" ]; then
    cp -r dist/* $ROOTFS/var/www/nas-pro/
else
    cat > $ROOTFS/var/www/nas-pro/index.html <<EOF
<!DOCTYPE html>
<html>
<head>
  <title>NAS-PRO Desktop</title>
  <style>
    body { margin:0; font-family:sans-serif; background:#0f172a; color:white; }
    .bar { height:50px; background:#111827; display:flex; align-items:center; padding:10px; }
    .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:20px; }
    .card { background:#1f2937; padding:20px; border-radius:10px; text-align:center; }
  </style>
</head>
<body>
  <div class="bar">NAS-PRO Desktop OS</div>
  <div class="grid">
    <div class="card">📁 Files</div>
    <div class="card">🌐 Browser</div>
    <div class="card">⚙️ Settings</div>
    <div class="card">💾 Storage</div>
  </div>
</body>
</html>
EOF
fi

chown -R www-data:www-data $ROOTFS/var/www/nas-pro

# -----------------------------
# NGINX UI SERVER
# -----------------------------
cat > $ROOTFS/etc/nginx/sites-available/default <<EOF
server {
    listen 80;
    root /var/www/nas-pro;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
    }
}
EOF

# -----------------------------
# ENABLE SERVICES
# -----------------------------
chroot $ROOTFS systemctl enable nginx
chroot $ROOTFS systemctl enable ssh

# -----------------------------
# INITRAMFS + KERNEL FIX
# -----------------------------
chroot $ROOTFS update-initramfs -u -k all

VMLINUX=$(ls $ROOTFS/boot/vmlinuz-* | head -n1)
INITRD=$(ls $ROOTFS/boot/initrd.img-* | head -n1)

cp "$VMLINUX" $ISO/boot/vmlinuz
cp "$INITRD" $ISO/boot/initrd.img

# -----------------------------
# SQUASHFS
# -----------------------------
mksquashfs $ROOTFS $ISO/live/filesystem.squashfs -e boot

# -----------------------------
# GRUB UI BOOT
# -----------------------------
cat > $ISO/boot/grub/grub.cfg <<EOF
set timeout=3
set default=0

menuentry "NAS-PRO Desktop UI" {
    linux /boot/vmlinuz boot=live quiet splash
    initrd /boot/initrd.img
}

menuentry "NAS-PRO Debug Mode" {
    linux /boot/vmlinuz boot=live debug
    initrd /boot/initrd.img
}
EOF

# -----------------------------
# BUILD ISO
# -----------------------------
grub-mkrescue -o $OUTPUT $ISO

echo "=== BUILD DONE ==="
ls -lh $OUTPUT