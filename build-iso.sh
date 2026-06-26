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
  initramfs-tools \
  systemd \
  systemd-sysv \
  dbus \
  openssh-server \
  nginx \
  curl \
  wget \
  git \
  vim \
  htop \
  net-tools \
  iproute2 \
  iputils-ping \
  iptables \
  samba \
  nfs-kernel-server \
  minidlna \
  ufw \
  sudo \
  e2fsprogs \
  fdisk \
  tar \
  gzip \
  live-boot \
  live-config \
  live-config-systemd

echo "[4/7] Configuring system & users..."
echo "nas-pro-server" > $ROOTFS/etc/hostname
echo "127.0.0.1 localhost nas-pro-server" > $ROOTFS/etc/hosts

# Konfiguracja dla live-boot
cat > $ROOTFS/etc/default/live-boot << 'EOF'
# Live-boot configuration
LIVE_BOOT_CMDLINE="boot=live components quiet splash"
EOF

echo "root:naspro" | chroot $ROOTFS chpasswd
chroot $ROOTFS useradd -m -s /bin/bash naspro || true
echo "naspro:naspro" | chroot $ROOTFS chpasswd
chroot $ROOTFS usermod -aG sudo naspro

# Tworzymy plik /etc/fstab
cat > $ROOTFS/etc/fstab << 'EOF'
# /etc/fstab: static file system information.
proc            /proc           proc    defaults        0       0
/dev/sr0        /cdrom          iso9660 ro,noauto      0       0
EOF

echo "[5/7] Deploying Web UI and configuration..."
mkdir -p $ROOTFS/var/www/nas-pro
if [ -d "dist" ]; then
    cp -r dist/* $ROOTFS/var/www/nas-pro/
else
    echo "WARNING: dist/ folder not found! Frontend might be empty."
    cat > $ROOTFS/var/www/nas-pro/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head><title>NAS-PRO</title></head>
<body>
<h1>NAS-PRO System</h1>
<p>Welcome to NAS-PRO - Debian based NAS system</p>
</body>
</html>
EOF
fi

chown -R www-data:www-data $ROOTFS/var/www/nas-pro
chmod -R 755 $ROOTFS/var/www/nas-pro

cat > $ROOTFS/etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/nas-pro;
    index index.html;
    server_name _;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' $ROOTFS/etc/ssh/sshd_config

# Skrypt pierwszego uruchomienia
cat > $ROOTFS/usr/local/bin/nas-pro-install.sh << 'EOF'
#!/bin/bash
echo "NAS-PRO First Boot Setup"
mkdir -p /var/lib/nas-pro
touch /var/lib/nas-pro/.configured
systemctl enable nginx
systemctl enable ssh
systemctl start nginx
systemctl start ssh
EOF
chmod +x $ROOTFS/usr/local/bin/nas-pro-install.sh

# Usługa pierwszo-uruchomieniowa
cat > $ROOTFS/etc/systemd/system/nas-pro-firstboot.service << 'EOF'
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

chroot $ROOTFS systemctl enable nas-pro-firstboot.service
chroot $ROOTFS systemctl enable nginx
chroot $ROOTFS systemctl enable ssh

echo "[6/7] Building squashfs and ISO structure..."

# Poprawne stworzenie initramfs
chroot $ROOTFS update-initramfs -u -k all

# Budowanie squashfs
mksquashfs $ROOTFS $ISODIR/live/filesystem.squashfs -comp xz -e boot

# Kopiowanie jądra i initrd
KERNEL_VERSION=$(ls -v $ROOTFS/boot/vmlinuz-* | tail -n1 | sed 's/.*vmlinuz-//')
cp $ROOTFS/boot/vmlinuz-* $ISODIR/boot/vmlinuz
cp $ROOTFS/boot/initrd.img-* $ISODIR/boot/initrd.img

# Konfiguracja GRUB dla UEFI
cat > $ISODIR/boot/grub/grub.cfg << 'EOF'
set timeout=5
set default=0

menuentry "Install NAS-PRO (UEFI Mode)" {
    linux /boot/vmlinuz boot=live components quiet splash
    initrd /boot/initrd.img
}

menuentry "Install NAS-PRO (UEFI Mode - Debug)" {
    linux /boot/vmlinuz boot=live components
    initrd /boot/initrd.img
}
EOF

echo "[7/7] Generating hybrid ISO image..."

# ===== INSTALUJ BRAKUJĄCE PLIKI SYSLINUX =====
echo "Installing Syslinux files..."

# Zainstaluj pakiety jeśli brakuje
sudo apt-get update
sudo apt-get install -y isolinux syslinux syslinux-common

mkdir -p $ISODIR/isolinux

# Kopiuj pliki Syslinux z różnych lokalizacji
SYSLINUX_PATHS=(
    "/usr/lib/syslinux/modules/bios"
    "/usr/lib/syslinux/bios"
    "/usr/lib/syslinux"
    "/usr/lib/ISOLINUX"
    "/usr/share/syslinux"
)

# Kopiuj isolinux.bin
for path in "${SYSLINUX_PATHS[@]}"; do
    if [ -f "$path/isolinux.bin" ]; then
        cp "$path/isolinux.bin" $ISODIR/isolinux/
        echo "  Found isolinux.bin in: $path"
        break
    fi
done

# Kopiuj moduły .c32
MODULES="ldlinux.c32 libutil.c32 menu.c32 vesamenu.c32 chain.c32 reboot.c32 poweroff.c32"
for module in $MODULES; do
    for path in "${SYSLINUX_PATHS[@]}"; do
        if [ -f "$path/$module" ]; then
            cp "$path/$module" $ISODIR/isolinux/
            echo "  Copied $module from $path"
            break
        fi
    done
done

# Menu dla BIOS
cat > $ISODIR/isolinux/isolinux.cfg << 'EOF'
DEFAULT vesamenu.c32
PROMPT 0
TIMEOUT 50

MENU TITLE NAS-PRO Boot Menu

LABEL install
    MENU LABEL ^Install NAS-PRO System
    KERNEL /boot/vmlinuz
    APPEND initrd=/boot/initrd.img boot=live components quiet splash

LABEL install-debug
    MENU LABEL Install NAS-PRO (^Debug)
    KERNEL /boot/vmlinuz
    APPEND initrd=/boot/initrd.img boot=live components

LABEL reboot
    MENU LABEL ^Reboot
    KERNEL reboot.c32

LABEL poweroff
    MENU LABEL ^Power Off
    KERNEL poweroff.c32
EOF

# ===== PRZYGOTOWANIE UEFI =====
mkdir -p $ISODIR/boot/grub/x86_64-efi

if [ -d "/usr/lib/grub/x86_64-efi" ]; then
    cp /usr/lib/grub/x86_64-efi/*.mod $ISODIR/boot/grub/x86_64-efi/ 2>/dev/null || true
    cp /usr/lib/grub/x86_64-efi/*.lst $ISODIR/boot/grub/x86_64-efi/ 2>/dev/null || true
fi

mkdir -p $WORKDIR/efi/boot

if command -v grub-mkimage &> /dev/null; then
    grub-mkimage -d /usr/lib/grub/x86_64-efi/ \
      -O x86_64-efi \
      -o $WORKDIR/efi/boot/bootx64.efi \
      -p "/boot/grub" \
      part_msdos part_gpt iso9660 normal search 2>/dev/null || true
fi

if [ -f "$WORKDIR/efi/boot/bootx64.efi" ]; then
    dd if=/dev/zero of=$ISODIR/boot/grub/efi.img bs=1M count=4 2>/dev/null
    mkfs.vfat $ISODIR/boot/grub/efi.img 2>/dev/null
    mmd -i $ISODIR/boot/grub/efi.img ::/EFI 2>/dev/null || true
    mmd -i $ISODIR/boot/grub/efi.img ::/EFI/BOOT 2>/dev/null || true
    mcopy -i $ISODIR/boot/grub/efi.img $WORKDIR/efi/boot/bootx64.efi ::/EFI/BOOT/BOOTX64.EFI 2>/dev/null || true
fi

# ===== BUDOWANIE ISO =====
echo "Building ISO with xorriso..."

xorriso -as mkisofs -R -J -joliet-long \
  -b isolinux/isolinux.bin \
  -c isolinux/boot.cat \
  -no-emul-boot -boot-load-size 4 -boot-info-table \
  -eltorito-alt-boot \
  -e boot/grub/efi.img \
  -no-emul-boot \
  -isohybrid-gpt-basdat \
  -o $OUTPUT $ISODIR

echo "=== Success! Created $OUTPUT ==="
ls -lh $OUTPUT