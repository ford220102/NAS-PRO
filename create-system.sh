#!/bin/bash

echo "========================================="
echo "  NAS-PRO SYSTEM INSTALLER"
echo "========================================="

# 1. Instalacja usług
echo "[1/5] Instalacja usług..."
sudo apt-get update -qq
sudo apt-get install -y -qq nginx samba samba-common nfs-kernel-server minidlna

# 2. Kopiowanie aplikacji
echo "[2/5] Kopiowanie aplikacji..."
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/

# 3. Konfiguracja Samby
echo "[3/5] Konfiguracja Samby..."
sudo cat > /etc/samba/smb.conf << 'SMB'
[global]
workgroup = WORKGROUP
server string = NAS-PRO
security = user
map to guest = Bad User

[Public]
path = /srv/nas/public
browseable = yes
read only = no
guest ok = yes
create mask = 0777
directory mask = 0777
SMB

sudo mkdir -p /srv/nas/public
sudo chmod 777 /srv/nas/public

# 4. Konfiguracja NFS
echo "[4/5] Konfiguracja NFS..."
echo "/srv/nas/public *(rw,sync,no_subtree_check,no_root_squash)" | sudo tee /etc/exports

# 5. Uruchomienie usług
echo "[5/5] Uruchamianie usług..."
sudo systemctl restart nginx smbd nmbd nfs-kernel-server
sudo systemctl enable nginx smbd nmbd nfs-kernel-server

echo ""
echo "========================================="
echo "  ✅ NAS-PRO SYSTEM READY!"
echo "========================================="
echo "Web UI: http://localhost"
echo "SMB: \\localhost\Public"
echo "NFS: localhost:/srv/nas/public"
echo ""
echo "Pliki w: /srv/nas/public"
echo "========================================="
