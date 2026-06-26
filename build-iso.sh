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

cat > $ROOTFS/etc/default/live-boot << 'EOF'
LIVE_BOOT_CMDLINE="boot=live components quiet splash"
EOF

echo "root:naspro" | chroot $ROOTFS chpasswd
chroot $ROOTFS useradd -m -s /bin/bash naspro || true
echo "naspro:naspro" | chroot $ROOTFS chpasswd
chroot $ROOTFS usermod -aG sudo naspro

cat > $ROOTFS/etc/fstab << 'EOF'
proc            /proc           proc    defaults        0       0
/dev/sr0        /cdrom          iso9660 ro,noauto      0       0
EOF

echo "[5/7] Deploying Web UI and configuration..."
mkdir -p $ROOTFS/var/www/nas-pro
if [ -d "dist" ]; then
    cp -r dist/* $ROOTFS/var/www/nas-pro/
else
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
chroot $ROOTFS update-initramfs -u -k all

mksquashfs $ROOTFS $ISODIR/live/filesystem.squashfs -comp xz -e boot

cp $ROOTFS/boot/vmlinuz-* $ISODIR/boot/vmlinuz
cp $ROOTFS/boot/initrd.img-* $ISODIR/boot/initrd.img

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

# ===== POBRZ I ZAINSTALUJ SYSLINUX =====
echo "Setting up Syslinux..."

# Zainstaluj pakiety
sudo apt-get update
sudo apt-get install -y isolinux syslinux syslinux-common syslinux-efi

# Utwórz katalogi
mkdir -p $ISODIR/isolinux
mkdir -p $WORKDIR/syslinux

# Pobierz najnowszy Syslinux jeśli brakuje plików
if [ ! -f /usr/lib/syslinux/modules/bios/libcom32.c32 ]; then
    echo "Downloading Syslinux from official source..."
    cd $WORKDIR
    wget -q https://www.kernel.org/pub/linux/utils/boot/syslinux/syslinux-6.04-pre1.tar.gz
    tar -xzf syslinux-6.04-pre1.tar.gz
    cd syslinux-6.04-pre1
    
    # Kompiluj tylko jeśli potrzebne
    if [ ! -f bios/com32/lib/libcom32.c32 ]; then
        echo "Building Syslinux..."
        make bios 2>/dev/null || true
    fi
    
    # Kopiuj wszystkie pliki
    sudo mkdir -p /usr/lib/syslinux/modules/bios
    find . -name "*.c32" -exec sudo cp {} /usr/lib/syslinux/modules/bios/ \; 2>/dev/null || true
    find . -name "isolinux.bin" -exec sudo cp {} /usr/lib/ISOLINUX/ \; 2>/dev/null || true
    
    cd $WORKDIR
    rm -rf syslinux-6.04-pre1 syslinux-6.04-pre1.tar.gz
fi

# ===== KOPIUJ WSZYSTKIE PLIKI SYSLINUX =====
echo "Copying Syslinux files to ISO..."

# Lista wszystkich modułów do skopiowania
SYSLINUX_MODULES=(
    "ldlinux.c32"
    "libcom32.c32"
    "libutil.c32"
    "menu.c32"
    "vesamenu.c32"
    "chain.c32"
    "reboot.c32"
    "poweroff.c32"
    "gfxboot.c32"
    "hdt.c32"
    "ifcpu64.c32"
    "linux.c32"
    "memdisk"
    "pcitest.c32"
)

# Ścieżki do szukania
SYSLINUX_PATHS=(
    "/usr/lib/syslinux/modules/bios"
    "/usr/lib/syslinux/bios"
    "/usr/lib/syslinux"
    "/usr/lib/ISOLINUX"
    "/usr/share/syslinux"
    "/usr/lib/syslinux/efi64"
)

# Kopiuj isolinux.bin
for path in "${SYSLINUX_PATHS[@]}"; do
    if [ -f "$path/isolinux.bin" ]; then
        cp "$path/isolinux.bin" $ISODIR/isolinux/
        echo "  Found isolinux.bin in: $path"
        break
    fi
done

# Kopiuj wszystkie moduły
for module in "${SYSLINUX_MODULES[@]}"; do
    FOUND=0
    for path in "${SYSLINUX_PATHS[@]}"; do
        if [ -f "$path/$module" ]; then
            cp "$path/$module" $ISODIR/isolinux/
            echo "  Copied $module from $path"
            FOUND=1
            break
        fi
    done
    if [ $FOUND -eq 0 ]; then
        # Szukaj wszędzie
        FOUND_FILE=$(find /usr -name "$module" 2>/dev/null | head -1)
        if [ -n "$FOUND_FILE" ]; then
            cp "$FOUND_FILE" $ISODIR/isolinux/
            echo "  Found and copied $module from $FOUND_FILE"
        else
            echo "  WARNING: $module not found - creating placeholder"
            echo "ISOLINUX" > $ISODIR/isolinux/$module
        fi
    fi
done

# Sprawdź czy wszystkie pliki są na miejscu
echo ""
echo "Checking ISO isolinux directory:"
ls -la $ISODIR/isolinux/ | head -20

# Konfiguracja ISOLINUX
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

# Sprawdź zawartość ISO
echo ""
echo "Verifying ISO content:"
isoinfo -R -f -i $OUTPUT | grep -E "\.c32" | head -10