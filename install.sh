#!/bin/bash
# NAS-PRO First Boot / Install Script
set -e

LOG=/var/log/nas-pro-install.log
exec > >(tee -a $LOG) 2>&1

echo "=== NAS-PRO Installation ==="
echo "Czas: $(date)"

# Oznacz jako skonfigurowany
mkdir -p /var/lib/nas-pro
touch /var/lib/nas-pro/.configured

echo "[1/5] Konfiguracja sieci..."
systemctl enable systemd-networkd
systemctl start systemd-networkd

# Wykryj interfejs sieciowy
IFACE=$(ip link | grep -E "^[0-9]+: e" | head -1 | awk -F: '{print $2}' | tr -d ' ')

if [ -n "$IFACE" ]; then
    cat > /etc/systemd/network/10-eth.network << EOF
[Match]
Name=$IFACE

[Network]
DHCP=yes
EOF
    systemctl restart systemd-networkd
fi

echo "[2/5] Konfiguracja Samba..."
cat > /etc/samba/smb.conf << 'EOF'
[global]
   workgroup = WORKGROUP
   server string = NAS-PRO Server
   netbios name = NAS-PRO
   security = user
   map to guest = Bad User
   dns proxy = no

[Public]
   path = /srv/nas/public
   browsable = yes
   writable = yes
   guest ok = yes
   read only = no
   create mask = 0777
   directory mask = 0777

[Data]
   path = /srv/nas/data
   browsable = yes
   writable = yes
   guest ok = no
   read only = no
   valid users = @nasusers
EOF

mkdir -p /srv/nas/public /srv/nas/data
chmod 777 /srv/nas/public
groupadd -f nasusers
systemctl enable smbd nmbd
systemctl start smbd nmbd

echo "[3/5] Konfiguracja NFS..."
cat > /etc/exports << 'EOF'
/srv/nas/public *(rw,sync,no_subtree_check,no_root_squash)
EOF
systemctl enable nfs-kernel-server
systemctl start nfs-kernel-server

echo "[4/5] Konfiguracja miniDLNA (media server)..."
cat > /etc/minidlna.conf << 'EOF'
media_dir=V,/srv/nas/public/video
media_dir=A,/srv/nas/public/music
media_dir=P,/srv/nas/public/photos
friendly_name=NAS-PRO Media
inotify=yes
EOF
systemctl enable minidlna
systemctl start minidlna

echo "[5/5] Konfiguracja UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp      # Web UI
ufw allow 443/tcp     # HTTPS
ufw allow 137,138/udp # Samba
ufw allow 139,445/tcp # Samba
ufw allow 2049/tcp    # NFS
ufw allow 8200/tcp    # miniDLNA
ufw allow 9091/tcp    # Transmission
ufw --force enable

echo ""
echo "=== NAS-PRO gotowy! ==="
echo "Panel WWW:  http://$(hostname -I | awk '{print $1}')"
echo "SSH:        ssh root@$(hostname -I | awk '{print $1}')"
echo "Hasło root: admin (ZMIEŃ PO PIERWSZYM LOGOWANIU!)"
echo ""

# Restart nginx żeby załadować UI
systemctl restart nginx
