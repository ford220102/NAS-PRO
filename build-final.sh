#!/bin/bash

echo "========================================="
echo "  NAS-PRO FINAL SYSTEM BUILDER"
echo "  Zero debootstrap - gotowy system"
echo "========================================="

if [ "$EUID" -ne 0 ]; then 
    echo "URUCHOM JAKO ROOT: sudo ./build-final.sh"
    exit 1
fi

# 1. BUDOWA APLIKACJI
echo "[1/6] Budowanie aplikacji React..."
npm ci --silent 2>/dev/null
npm run build:fast

# 2. POBIERZ GOTOWY SYSTEM
echo "[2/6] Pobieranie gotowego systemu..."
WORK_DIR="/tmp/nas-pro-final"
ROOTFS="$WORK_DIR/rootfs"
ISO_DIR="$WORK_DIR/iso"

rm -rf $WORK_DIR
mkdir -p $ROOTFS $ISO_DIR/live $ISO_DIR/boot/grub $ISO_DIR/isolinux

# Pobierz minimalny Debian (gotowy obraz)
cd $ROOTFS
wget -q --show-progress https://github.com/debuerreotype/debuerreotype/releases/download/20240522/bookworm-amd64.tar.xz
tar -xf bookworm-amd64.tar.xz
cd - > /dev/null

# 3. KONFIGURACJA SYSTEMU
echo "[3/6] Konfiguracja systemu..."

cat > $ROOTFS/tmp/setup.sh << 'SETUP'
#!/bin/bash
set -e

# APT
echo "Instalacja pakietów..."
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
    linux-image-amd64 \
    linux-headers-amd64 \
    firmware-linux \
    firmware-linux-nonfree \
    firmware-iwlwifi \
    firmware-realtek \
    firmware-atheros \
    pciutils \
    usbutils \
    dmidecode \
    hwinfo \
    lm-sensors \
    smartmontools \
    nvme-cli \
    mdadm \
    lvm2 \
    nginx \
    samba \
    samba-common \
    nfs-kernel-server \
    minidlna \
    nodejs \
    npm \
    curl \
    wget \
    htop \
    neofetch \
    avahi-daemon \
    avahi-utils \
    openssh-server \
    sudo \
    rsync \
    parted \
    gdisk \
    dosfstools \
    e2fsprogs \
    xfsprogs \
    btrfs-progs \
    ntfs-3g \
    exfatprogs \
    fuse3 \
    systemd \
    udev \
    dbus \
    network-manager \
    net-tools \
    iputils-ping \
    nano \
    vim-tiny \
    rsyslog \
    logrotate

# Użytkownicy
echo "root:naspro" | chpasswd
useradd -m -s /bin/bash naspro 2>/dev/null || true
echo "naspro:naspro" | chpasswd
usermod -aG sudo,dialout,disk,cdrom,floppy,audio,video,plugdev,users naspro 2>/dev/null || true

# Katalogi
mkdir -p /srv/nas/public /srv/nas/private /srv/nas/media
chown -R naspro:naspro /srv/nas
chmod 755 /srv/nas/public /srv/nas/media
chmod 700 /srv/nas/private

# Hostname
echo "nas-pro" > /etc/hostname
cat > /etc/hosts << HOSTS
127.0.0.1 localhost
127.0.1.1 nas-pro
::1 localhost ip6-localhost ip6-loopback
HOSTS

# SAMBA
cat > /etc/samba/smb.conf << 'SMB'
[global]
workgroup = WORKGROUP
server string = NAS-PRO
netbios name = NAS-PRO
security = user
map to guest = Bad User
guest account = nobody

[Public]
path = /srv/nas/public
browseable = yes
read only = no
guest ok = yes
create mask = 0777
directory mask = 0777
force user = naspro

[Private]
path = /srv/nas/private
browseable = no
read only = no
guest ok = no
create mask = 0700
directory mask = 0700
valid users = naspro

[Media]
path = /srv/nas/media
browseable = yes
read only = no
guest ok = yes
create mask = 0777
directory mask = 0777
force user = naspro
SMB

# NFS
cat > /etc/exports << NFS
/srv/nas/public *(rw,sync,no_subtree_check,no_root_squash)
/srv/nas/media *(rw,sync,no_subtree_check,no_root_squash)
/srv/nas/private *(rw,sync,no_subtree_check,no_root_squash)
NFS

# NGINX
cat > /etc/nginx/sites-available/nas-pro << 'NGX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html;
    server_name _;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
NGX

ln -sf /etc/nginx/sites-available/nas-pro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# DLNA
cat > /etc/minidlna.conf << 'DLNA'
port=8200
media_dir=/srv/nas/public
media_dir=/srv/nas/media
friendly_name=NAS-PRO DLNA
db_dir=/var/cache/minidlna
log_dir=/var/log
inotify=yes
DLNA

# Sieć
cat > /etc/systemd/network/eth0.network << NET
[Match]
Name=eth0
[Network]
DHCP=yes
NET

# Skrypt wykrywania sprzętu
cat > /usr/local/bin/hardware.sh << 'HW'
#!/bin/bash
echo "=== NAS-PRO HARDWARE ==="
echo "PCI Devices:"
lspci -v
echo ""
echo "CPU:"
lscpu
echo ""
echo "Memory:"
free -h
echo ""
echo "Disks:"
lsblk -f
echo ""
echo "Network:"
ip a
HW
chmod +x /usr/local/bin/hardware.sh

# Web UI
mkdir -p /var/www/html
cp -r /tmp/webapp/* /var/www/html/

# API Server
cat > /var/www/html/server.js << 'API'
const http = require('http');
const { exec } = require('child_process');

http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/api/hardware') {
        exec('lspci -v', (err, stdout) => {
            res.end(JSON.stringify({ status: 'ok', hardware: stdout }));
        });
    } else {
        res.end(JSON.stringify({ 
            status: 'ok', 
            message: 'NAS-PRO API v3.2',
            version: '3.2.0'
        }));
    }
}).listen(3000, '0.0.0.0');
API

chown -R naspro:naspro /var/www/html

# Usługi
systemctl enable nginx smbd nmbd nfs-kernel-server minidlna ssh avahi-daemon
systemctl enable systemd-networkd systemd-resolved

# Czyszczenie
apt-get clean
rm -rf /var/lib/apt/lists/*
rm -f /tmp/setup.sh
SETUP

chmod +x $ROOTFS/tmp/setup.sh

# 4. KOPIOWANIE APLIKACJI
echo "[4/6] Kopiowanie aplikacji..."
mkdir -p $ROOTFS/tmp/webapp
cp -r dist/* $ROOTFS/tmp/webapp/

# 5. INSTALACJA
echo "[5/6] Instalacja systemu..."
chroot $ROOTFS /tmp/setup.sh

# 6. BUDOWANIE ISO
echo "[6/6] Budowanie ISO..."

# SquashFS
mksquashfs $ROOTFS $WORK_DIR/filesystem.squashfs -comp xz -b 1M -e boot -noappend -quiet

# Jądro
cp $ROOTFS/boot/vmlinuz-* $ISO_DIR/live/vmlinuz
cp $ROOTFS/boot/initrd.img-* $ISO_DIR/live/initrd.img
cp $WORK_DIR/filesystem.squashfs $ISO_DIR/live/filesystem.squashfs

# GRUB
cat > $ISO_DIR/boot/grub/grub.cfg << 'GRUB'
set default=0
set timeout=5
menuentry "NAS-PRO" {
    linux /live/vmlinuz boot=live components quiet
    initrd /live/initrd.img
}
GRUB

# ISOLINUX
cat > $ISO_DIR/isolinux/isolinux.cfg << 'ISO'
default live
label live
  kernel /live/vmlinuz
  append initrd=/live/initrd.img boot=live components quiet
ISO

cp /usr/lib/ISOLINUX/isolinux.bin $ISO_DIR/isolinux/ 2>/dev/null || true

# Tworzenie ISO
xorriso -as mkisofs -iso-level 3 -full-iso9660-filenames \
    -volid "NAS-PRO" -publisher "NAS-PRO" \
    -eltorito-boot isolinux/isolinux.bin \
    -eltorito-catalog isolinux/boot.cat \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
    -isohybrid-gpt-basdat -output nas-pro.iso $ISO_DIR/

echo ""
echo "========================================="
echo "  ✅ NAS-PRO SYSTEM READY!"
echo "========================================="
echo "ISO: $(pwd)/nas-pro.iso"
echo "SIZE: $(du -h nas-pro.iso | cut -f1)"
echo ""
echo "LOGIN: root / naspro"
echo "WEB: http://localhost"
echo "API: http://localhost:3000"
echo "SMB: \\\\nas-pro\\Public"
echo "========================================="
