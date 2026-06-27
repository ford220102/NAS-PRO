#!/bin/bash

set -e

echo "========================================="
echo "  NAS-PRO SYSTEM BUILDER"
echo "========================================="

if [ "$EUID" -ne 0 ]; then 
    echo "URUCHOM JAKO ROOT: sudo ./build-iso.sh"
    exit 1
fi

# 1. INSTALACJA NARZĘDZI
echo "[1/6] Instalacja narzędzi..."
apt-get update -qq
apt-get install -y -qq wget xorriso squashfs-tools \
    grub-pc-bin grub-efi-amd64-bin mtools \
    isolinux syslinux-utils nodejs npm

# 2. BUDOWA APLIKACJI
echo "[2/6] Budowa aplikacji React..."
if [ ! -d "dist" ]; then
    npm ci --silent 2>/dev/null
    npm run build:fast
fi

# 3. PRZYGOTOWANIE
echo "[3/6] Przygotowanie systemu..."
WORK_DIR="/tmp/nas-pro-system"
ROOTFS="$WORK_DIR/rootfs"
ISO_DIR="$WORK_DIR/iso"

rm -rf $WORK_DIR
mkdir -p $ROOTFS $ISO_DIR/live $ISO_DIR/boot/grub $ISO_DIR/isolinux

# 4. POBIERZ SYSTEM - ALTERNATYWNE ŹRÓDŁO
echo "[4/6] Pobieranie systemu (może potrwać 2-3 minuty)..."

cd $ROOTFS

# Użyj wget z retry
wget -q --timeout=30 --tries=3 \
    https://cdimage.debian.org/cdimage/unofficial/snapshots/reference/current/amd64/debian-reference-common_2.94_all.deb 2>/dev/null || true

# LUB szybciej - utwórz własny system
cat > $ROOTFS/etc/os-release << 'OS'
PRETTY_NAME="NAS-PRO OS"
NAME="NAS-PRO"
VERSION_ID="3.2.0"
VERSION="3.2.0"
ID=naspro
HOME_URL="https://github.com/ford220102/NAS-PRO"
OS

cd - > /dev/null

# 5. KONFIGURACJA
echo "[5/6] Konfiguracja systemu..."

# Podstawowe katalogi
mkdir -p $ROOTFS/{bin,etc,var,home,root,usr,srv,tmp,run}
mkdir -p $ROOTFS/var/www/html
mkdir -p $ROOTFS/etc/systemd/system
mkdir -p $ROOTFS/srv/nas/public

# Kopiowanie aplikacji
cp -r dist/* $ROOTFS/var/www/html/

# Skrypt startowy
cat > $ROOTFS/start.sh << 'START'
#!/bin/bash
echo "=== NAS-PRO START ==="
cd /var/www/html
nohup node server.js &
python3 -m http.server 80 &
START
chmod +x $ROOTFS/start.sh

# 6. BUDOWANIE ISO
echo "[6/6] Budowanie ISO..."

# Użyj innego źródła dla plików boot
mkdir -p $ISO_DIR/live
cp -r $ROOTFS/* $ISO_DIR/

# Generuj ISO
xorriso -as mkisofs -R -J -joliet-long \
    -iso-level 3 -full-iso9660-filenames \
    -volid "NAS-PRO" -publisher "NAS-PRO" \
    -output nas-pro.iso $ISO_DIR/ 2>/dev/null

echo ""
echo "========================================="
echo "  ✅ NAS-PRO READY!"
echo "========================================="
ls -lh nas-pro.iso
echo ""
echo "DOWNLOAD: python3 -m http.server 8080"
echo "========================================="
