#!/bin/bash
set -e

echo "=== NAS-PRO BUILDER v2 PRO STABLE ==="

WORKDIR=/tmp/nas-pro
ROOTFS=$WORKDIR/rootfs
ISO=$WORKDIR/iso
OUTPUT=nas-pro.iso

rm -rf $WORKDIR
mkdir -p $ROOTFS $ISO/boot/grub $ISO/live

# -----------------------
# 1. BASE SYSTEM
# -----------------------
debootstrap --arch=amd64 bookworm $ROOTFS http://deb.debian.org/debian

cat > $ROOTFS/etc/apt/sources.list <<EOF
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

chroot $ROOTFS apt-get update

# MUST HAVE KERNEL FIX
chroot $ROOTFS apt-get install -y \
  linux-image-amd64 \
  initramfs-tools \
  systemd systemd-sysv dbus \
  sudo nginx openssh-server \
  curl wget git vim \
  live-boot live-config

# -----------------------
# 2. USERS + SYSTEM
# -----------------------
echo "nas-pro" > $ROOTFS/etc/hostname

echo "root:naspro" | chroot $ROOTFS chpasswd

useradd -m -s /bin/bash naspro -R $ROOTFS || true
echo "naspro:naspro" | chroot $ROOTFS chpasswd || true
chroot $ROOTFS usermod -aG sudo naspro || true

# -----------------------
# 3. UI (REACT/VITE)
# -----------------------
mkdir -p $ROOTFS/var/www/nas-pro

if [ -d "dist" ]; then
  cp -r dist/* $ROOTFS/var/www/nas-pro/
else
  cat > $ROOTFS/var/www/nas-pro/index.html <<EOF
<!doctype html>
<html>
<head><title>NAS-PRO</title></head>
<body style="background:#0a0f1c;color:white;font-family:sans-serif">
<h1>NAS-PRO SYSTEM ONLINE</h1>
<p>UI not built yet</p>
</body>
</html>
EOF
fi

chown -R www-data:www-data $ROOTFS/var/www/nas-pro

# nginx UI
cat > $ROOTFS/etc/nginx/sites-available/default <<EOF
server {
    listen 80 default_server;
    root /var/www/nas-pro;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# -----------------------
# 4. ENABLE SERVICES
# -----------------------
cat > $ROOTFS/etc/systemd/system/nas-pro.service <<EOF
[Unit]
Description=NAS-PRO UI
After=network.target

[Service]
ExecStart=/usr/sbin/nginx -g 'daemon off;'
Restart=always

[Install]
WantedBy=multi-user.target
EOF

chroot $ROOTFS systemctl enable nas-pro.service
chroot $ROOTFS systemctl enable ssh

# -----------------------
# 5. KERNEL FIX (IMPORTANT)
# -----------------------
chroot $ROOTFS update-initramfs -u -k all

VMLINUX=$(ls $ROOTFS/boot/vmlinuz-* | head -n1)
INITRD=$(ls $ROOTFS/boot/initrd.img-* | head -n1)

cp "$VMLINUX" $ISO/boot/vmlinuz
cp "$INITRD" $ISO/boot/initrd.img

# -----------------------
# 6. SQUASHFS
# -----------------------
mksquashfs $ROOTFS $ISO/live/filesystem.squashfs -e boot

# -----------------------
# 7. GRUB
# -----------------------
cat > $ISO/boot/grub/grub.cfg <<EOF
set timeout=3
set default=0

menuentry "NAS-PRO UI OS" {
    linux /boot/vmlinuz boot=live quiet
    initrd /boot/initrd.img
}

menuentry "NAS-PRO DEBUG" {
    linux /boot/vmlinuz boot=live debug
    initrd /boot/initrd.img
}
EOF

# -----------------------
# 8. ISO BUILD
# -----------------------
grub-mkrescue -o $OUTPUT $ISO

echo "=== DONE ==="
ls -lh $OUTPUT