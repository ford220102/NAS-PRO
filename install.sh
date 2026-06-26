#!/bin/bash
# NAS-PRO — Skrypt pierwszego uruchomienia (first boot)
# Uruchamiany automatycznie przy pierwszym starcie systemu
set -e

LOG=/var/log/nas-pro-install.log
exec > >(tee -a "$LOG") 2>&1

echo "=== UGOS Pro — First Boot Setup ==="
echo "Data: $(date)"

# Zabezpieczenie przed ponownym uruchomieniem
mkdir -p /var/lib/nas-pro
if [ -f /var/lib/nas-pro/.configured ]; then
  echo "[INFO] System już skonfigurowany, pomijam."
  exit 0
fi

echo "[1/6] Konfiguracja sieci..."
systemctl enable systemd-networkd systemd-resolved 2>/dev/null || true
systemctl start  systemd-networkd 2>/dev/null || true

IFACE=$(ip link show | grep -E "^[0-9]+: e" | head -1 | awk -F': ' '{print $2}' | cut -d'@' -f1)
if [ -n "$IFACE" ]; then
  cat > /etc/systemd/network/10-${IFACE}.network << EOF
[Match]
Name=$IFACE

[Network]
DHCP=yes
DNS=8.8.8.8
DNS=1.1.1.1
EOF
  systemctl restart systemd-networkd 2>/dev/null || true
  echo "[OK] Interfejs $IFACE skonfigurowany (DHCP)"
fi

echo "[2/6] Konfiguracja Samba (SMB)..."
mkdir -p /srv/nas/public /srv/nas/data
chmod 777 /srv/nas/public
groupadd -f nasusers
if id "naspro" &>/dev/null; then
  usermod -aG nasusers naspro
  (echo "naspro"; echo "naspro") | smbpasswd -a -s naspro 2>/dev/null || true
fi
chown -R root:nasusers /srv/nas/data
systemctl enable smbd nmbd 2>/dev/null || true
systemctl start  smbd nmbd 2>/dev/null || true
echo "[OK] Samba gotowa (\\\\nas-pro\\Public)"

echo "[3/6] Konfiguracja NFS..."
cat > /etc/exports << 'EOF'
/srv/nas/public  *(rw,sync,no_subtree_check,no_root_squash)
EOF
systemctl enable nfs-kernel-server 2>/dev/null || true
systemctl start  nfs-kernel-server 2>/dev/null || true
exportfs -ra 2>/dev/null || true
echo "[OK] NFS gotowy"

echo "[4/6] Konfiguracja miniDLNA (DLNA/UPnP)..."
mkdir -p /srv/nas/public/video /srv/nas/public/music /srv/nas/public/photos
systemctl enable minidlna 2>/dev/null || true
systemctl start  minidlna 2>/dev/null || true
echo "[OK] miniDLNA gotowy (port 8200)"

echo "[5/6] Konfiguracja firewall (UFW)..."
ufw --force reset            2>/dev/null || true
ufw default deny incoming    2>/dev/null || true
ufw default allow outgoing   2>/dev/null || true
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'UGOS Pro Web UI'
ufw allow 443/tcp  comment 'HTTPS'
ufw allow 137/udp  comment 'NetBIOS'
ufw allow 138/udp  comment 'NetBIOS'
ufw allow 139/tcp  comment 'Samba'
ufw allow 445/tcp  comment 'Samba'
ufw allow 2049/tcp comment 'NFS'
ufw allow 8200/tcp comment 'miniDLNA'
ufw --force enable 2>/dev/null || true
echo "[OK] Firewall skonfigurowany"

echo "[6/6] Uruchamianie UGOS Pro API..."
systemctl enable naspro-api 2>/dev/null || true
systemctl start  naspro-api 2>/dev/null || true
echo "[OK] API nasłuchuje na :3000"

# Oznacz jako skonfigurowane
touch /var/lib/nas-pro/.configured
echo "Data konfiguracji: $(date)" > /var/lib/nas-pro/.configured

IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "N/A")

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   UGOS Pro — Konfiguracja zakończona pomyślnie!         ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║   Web UI:   http://$IP                        "
echo "║   SSH:      ssh naspro@$IP                    "
echo "║   SMB:      \\\\$IP\\Public                     "
echo "║   NFS:      $IP:/srv/nas/public               "
echo "║   DLNA:     $IP:8200                          "
echo "╠══════════════════════════════════════════════════════════╣"
echo "║   Login: naspro / naspro                                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
