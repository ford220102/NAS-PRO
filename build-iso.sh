#!/bin/bash
set -e

echo "=== NAS-PRO ISO Builder ==="

WORKDIR=/tmp/nas-pro-build
ROOTFS=$WORKDIR/rootfs
ISODIR=$WORKDIR/iso
OUTPUT=nas-pro.iso

# Cleanup
rm -rf $WORKDIR
mkdir -p $ROOTFS $ISODIR/boot/grub $ISODIR/live

echo "[1/7] Bootstrapping Debian Bookworm..."
debootstrap --arch=amd64 bookworm $ROOTFS http://deb.debian.org/debian

echo "[2/7] Configuring apt sources..."
cat > $ROOTFS/etc/apt/sources.list << 'EOF'
deb http://deb.debian.org/debian bookworm main contrib non-free non-free-firmware
deb http://deb.debian.org/debian bookworm-updates main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
EOF

echo "[3/7] Installing system packages..."
chroot $ROOTFS apt-get update
chroot $ROOTFS apt-get install -y --no-install-recommends \
  linux-image-amd64 \
  grub-pc \
  grub-efi-amd64 \
  systemd \
  systemd-sysv \
  dbus \
  openssh-server \
  nginx \
  nodejs \
  npm \
  curl \
  wget \
  git \
  vim \
  htop \
  net-tools \
  iproute2 \
  iputils-ping \
  iptables \
  ufw \
  fail2ban \
  samba \
  nfs-kernel-server \
  mdadm \
  lvm2 \
  btrfs-progs \
  e2fsprogs \
  xfsprogs \
  smartmontools \
  hdparm \
  parted \
  fdisk \
  rsync \
  borgbackup \
  avahi-daemon \
  minidlna \
  transmission-daemon \
  ffmpeg \
  python3 \
  python3-pip \
  sudo \
  acl \
  attr \
  ntp \
  wireguard \
  openvpn \
  dnsmasq \
  snmp \
  lm-sensors \
  i2c-tools \
  pciutils \
  usbutils \
  cryptsetup \
  open-iscsi \
  nfs-common \
  cifs-utils \
  screen \
  tmux \
  zip \
  unzip \
  p7zip-full \
  tar \
  gzip
  
echo "[4/7] Installing Node.js 20 LTS..."
chroot $ROOTFS bash -c "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
chroot $ROOTFS apt-get install -y nodejs

echo "[5/7] Copying NAS-PRO UI..."
mkdir -p $ROOTFS/var/www/nas-pro
cp -r dist/ $ROOTFS/var/www/nas-pro/

# Nginx config
cat > $ROOTFS/etc/nginx/sites-available/nas-pro << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/nas-pro/dist;
    index index.html;
    server_name _;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
EOF

chroot $ROOTFS ln -sf /etc/nginx/sites-available/nas-pro /etc/nginx/sites-enabled/
chroot $ROOTFS rm -f /etc/nginx/sites-enabled/default

# Hostname
echo "nas-pro" > $ROOTFS/etc/hostname
cat > $ROOTFS/etc/hosts << 'EOF'
127.0.0.1   localhost
127.0.1.1   nas-pro
::1         localhost ip6-localhost ip6-loopback
EOF

# Root password: admin (do zmiany po instalacji)
chroot $ROOTFS bash -c "echo 'root:admin' | chpasswd"

# SSH config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' $ROOTFS/etc/ssh/sshd_config

# Auto-run installer on first boot
cp /dev/stdin $ROOTFS/etc/systemd/system/nas-pro-firstboot.service << 'EOF'
[Unit]
Description=NAS-PRO First Boot Setup
After=network.target
ConditionPathExists=!/var/lib/nas-pro/.configured

[Service]
Type=oneshot
ExecStart=/usr/local/bin/nas-pro-install.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

cp install.sh $ROOTFS/usr/local/bin/nas-pro-install.sh
chmod +x $ROOTFS/usr/local/bin/nas-pro-install.sh
chroot $ROOTFS systemctl enable nas-pro-firstboot.service
chroot $ROOTFS systemctl enable nginx
chroot $ROOTFS systemctl enable ssh

echo "[6/7] Building squashfs and ISO structure..."
mksquashfs $ROOTFS $ISODIR/live/filesystem.squashfs \
  -comp xz -e boot

# Copy kernel and initrd
cp $ROOTFS/boot/vmlinuz-* $ISODIR/boot/vmlinuz
cp $ROOTFS/boot/initrd.img-* $ISODIR/boot/initrd.img

# GRUB config
cat > $ISODIR/boot/grub/grub.cfg << 'EOF'
set timeout=5
set default=0

menuentry "Install NAS-PRO" {
    linux /boot/vmlinuz boot=live quiet splash
    initrd /boot/initrd.img
}

menuentry "Install NAS-PRO (debug mode)" {
    linux /boot/vmlinuz boot=live
    initrd /boot/initrd.img
}
EOF

echo "[7/7] Creating ISO..."
grub-mkrescue -o $OUTPUT $ISODIR \
  --modules="linux normal iso9660 biosdisk memdisk search tar ls" 2>/dev/null

echo ""
echo "=== Build complete! ==="
echo "ISO: $OUTPUT ($(du -sh $OUTPUT | cut -f1))"
