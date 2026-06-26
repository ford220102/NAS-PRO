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
  grub-pc-bin \
  grub-efi-amd64-bin \
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
  gzip

echo "[4/7] Configuring system & users..."
echo "nas-pro-server" > $ROOTFS/etc/hostname
echo "127.0.0.1 localhost nas-pro-server" > $ROOTFS/etc/hosts

# Hasło roota i konfiguracja użytkownika
echo "root:naspro" | chroot $ROOTFS chpasswd
chroot $ROOTFS useradd -m -s /bin/bash naspro || true
echo "naspro:naspro" | chroot $ROOTFS chpasswd
chroot $ROOTFS usermod -aG sudo naspro

echo "[5/7] Deploying Web UI and configuration..."
# Przygotowanie katalogu na Frontend
mkdir -p $ROOTFS/var/www/nas-pro
if [ -d "dist" ]; then
    cp -r dist/* $ROOTFS/var/www/nas-pro/
else
    echo "WARNING: dist/ folder not found! Frontend might be empty."
fi

chown -R www-data:www-data $ROOTFS/var/www/nas-pro
chmod -R 755 $ROOTFS/var/www/nas-pro

# Konfiguracja Nginx
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

# SSH config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' $ROOTFS/etc/ssh/sshd_config

# Auto-run instalatora przy pierwszym uruchomieniu
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

# Kopiowanie skryptu instalacyjnego
if [ -f "install.sh" ]; then
    cp install.sh $ROOTFS/usr/local/bin/nas-pro-install.sh
    chmod +x $ROOTFS/usr/local/bin/nas-pro-install.sh
else
    echo "WARNING: install.sh not found! Creating dummy script."
    cat > $ROOTFS/usr/local/bin/nas-pro-install.sh << 'EOF'
#!/bin/bash
echo "NAS-PRO First Boot Setup - dummy script"
mkdir -p /var/lib/nas-pro
touch /var/lib/nas-pro/.configured
EOF
    chmod +x $ROOTFS/usr/local/bin/nas-pro-install.sh
fi

# Włączanie usług
chroot $ROOTFS systemctl enable nas-pro-firstboot.service
chroot $ROOTFS systemctl enable nginx
chroot $ROOTFS systemctl enable ssh

echo "[6/7] Building squashfs and ISO structure..."
mksquashfs $ROOTFS $ISODIR/live/filesystem.squashfs -comp xz -e boot

# Kopiowanie jądra i initrd
cp $(ls -v $ROOTFS/boot/vmlinuz-* | tail -n1) $ISODIR/boot/vmlinuz
cp $(ls -v $ROOTFS/boot/initrd.img-* | tail -n1) $ISODIR/boot/initrd.img

# Konfiguracja GRUB dla trybu UEFI (zostanie odczytana z ISO)
cat > $ISODIR/boot/grub/grub.cfg << 'EOF'
set timeout=5
set default=0

menuentry "Install NAS-PRO (UEFI Mode)" {
    linux /boot/vmlinuz boot=live quiet splash
    initrd /boot/initrd.img
}
EOF

echo "[7/7] Generating hybrid ISO image..."

# 1. Przygotowanie stabilnego bootloadera ISOLINUX dla trybu BIOS
mkdir -p $ISODIR/isolinux

# Znajdź isolinux.bin w różnych możliwych lokalizacjach
ISOLINUX_BIN=""
for path in /usr/lib/ISOLINUX/isolinux.bin /usr/lib/syslinux/isolinux.bin /usr/lib/syslinux/bios/isolinux.bin; do
    if [ -f "$path" ]; then
        ISOLINUX_BIN="$path"
        echo "Found isolinux.bin at: $path"
        break
    fi
done

if [ -n "$ISOLINUX_BIN" ]; then
    cp "$ISOLINUX_BIN" $ISODIR/isolinux/
else
    echo "ERROR: isolinux.bin not found!"
    echo "Searching in /usr/lib/ ..."
    find /usr/lib -name "isolinux.bin" 2>/dev/null || true
    exit 1
fi

# Kopiuj moduły Syslinux z różnych możliwych lokalizacji
SYSLINUX_MODULES_DIRS="/usr/lib/syslinux/modules/bios /usr/lib/syslinux/bios /usr/lib/syslinux /usr/lib/ISOLINUX"
for module in ldlinux.c32 libutil.c32 menu.c32; do
    FOUND=0
    for dir in $SYSLINUX_MODULES_DIRS; do
        if [ -f "$dir/$module" ]; then
            cp "$dir/$module" $ISODIR/isolinux/
            echo "Copied $module from $dir"
            FOUND=1
            break
        fi
    done
    if [ $FOUND -eq 0 ]; then
        echo "WARNING: $module not found - trying to continue..."
    fi
done

# Menu dla trybu BIOS (ISOLINUX)
cat > $ISODIR/isolinux/isolinux.cfg << 'EOF'
DEFAULT menu.c32
PROMPT 0
TIMEOUT 50

MENU TITLE NAS-PRO Boot Menu (BIOS)

LABEL install
    MENU LABEL Install NAS-PRO System
    KERNEL /boot/vmlinuz
    APPEND initrd=/boot/initrd.img boot=live quiet splash
EOF

# 2. Przygotowanie czystego obrazu rozruchowego dla trybu UEFI
mkdir -p $ISODIR/boot/grub/x86_64-efi

# Kopiuj moduły GRUB jeśli istnieją
if [ -d "/usr/lib/grub/x86_64-efi" ]; then
    cp /usr/lib/grub/x86_64-efi/*.mod $ISODIR/boot/grub/x86_64-efi/ 2>/dev/null || true
    cp /usr/lib/grub/x86_64-efi/*.lst $ISODIR/boot/grub/x86_64-efi/ 2>/dev/null || true
    echo "Copied GRUB modules from /usr/lib/grub/x86_64-efi/"
elif [ -d "/usr/lib/grub/x86_64-efi-signed" ]; then
    cp /usr/lib/grub/x86_64-efi-signed/*.mod $ISODIR/boot/grub/x86_64-efi/ 2>/dev/null || true
    cp /usr/lib/grub/x86_64-efi-signed/*.lst $ISODIR/boot/grub/x86_64-efi/ 2>/dev/null || true
    echo "Copied GRUB modules from /usr/lib/grub/x86_64-efi-signed/"
fi

mkdir -p $WORKDIR/efi/boot

# Sprawdź czy grub-mkimage jest dostępny
if command -v grub-mkimage &> /dev/null; then
    grub-mkimage -d /usr/lib/grub/x86_64-efi/ \
      -O x86_64-efi \
      -o $WORKDIR/efi/boot/bootx64.efi \
      -p "/boot/grub" \
      part_msdos part_gpt iso9660 normal search 2>/dev/null || {
        echo "WARNING: grub-mkimage failed, trying alternative..."
        # Próba użycia alternatywnego katalogu
        grub-mkimage -d /usr/lib/grub/x86_64-efi-signed/ \
          -O x86_64-efi \
          -o $WORKDIR/efi/boot/bootx64.efi \
          -p "/boot/grub" \
          part_msdos part_gpt iso9660 normal search 2>/dev/null || true
    }
else
    echo "WARNING: grub-mkimage not found, creating placeholder..."
    # Utwórz pusty plik jako placeholder
    dd if=/dev/zero of=$WORKDIR/efi/boot/bootx64.efi bs=1M count=1 2>/dev/null
fi

# Pakowanie pliku .efi do obrazu FAT wymagane przez specyfikację UEFI
if command -v dd &> /dev/null && command -v mkfs.vfat &> /dev/null && command -v mmd &> /dev/null && command -v mcopy &> /dev/null; then
    dd if=/dev/zero of=$ISODIR/boot/grub/efi.img bs=1M count=4 2>/dev/null
    mkfs.vfat $ISODIR/boot/grub/efi.img 2>/dev/null
    mmd -i $ISODIR/boot/grub/efi.img ::/EFI 2>/dev/null || true
    mmd -i $ISODIR/boot/grub/efi.img ::/EFI/BOOT 2>/dev/null || true
    if [ -f "$WORKDIR/efi/boot/bootx64.efi" ]; then
        mcopy -i $ISODIR/boot/grub/efi.img $WORKDIR/efi/boot/bootx64.efi ::/EFI/BOOT/BOOTX64.EFI 2>/dev/null || true
    fi
    echo "Created UEFI boot image"
else
    echo "WARNING: Required tools for UEFI boot not found (dd, mkfs.vfat, mtools)"
fi

# 3. Budowanie ostatecznego hybrydowego ISO przez xorriso
echo "Building hybrid ISO with xorriso..."

if command -v xorriso &> /dev/null; then
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
    
    # Wyświetl informacje o utworzonym pliku
    if [ -f "$OUTPUT" ]; then
        ls -lh $OUTPUT
        echo ""
        echo "ISO image created successfully!"
        echo "Size: $(du -h $OUTPUT | cut -f1)"
    fi
else
    echo "ERROR: xorriso not found!"
    exit 1
fi