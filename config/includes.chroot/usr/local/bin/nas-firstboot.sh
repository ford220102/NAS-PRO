#!/bin/bash
# NAS-PRO First Boot Configuration

echo "=== NAS-PRO First Boot Setup ==="

# Tworzenie użytkownika systemowego
if ! id "naspro" &>/dev/null; then
    useradd -r -m -d /home/naspro -s /bin/bash naspro
    echo "naspro:naspro" | chpasswd
    usermod -aG sudo naspro
    echo "Utworzono użytkownika naspro"
fi

# Tworzenie katalogów udostępniania
mkdir -p /srv/nas/public
mkdir -p /srv/nas/private
chown -R naspro:naspro /srv/nas
chmod 755 /srv/nas/public
chmod 700 /srv/nas/private
echo "Utworzono katalogi udostępniania"

# Konfiguracja sieci - DHCP
if ! systemctl is-active --quiet networking; then
    systemctl enable networking
    systemctl start networking
fi

# Uruchomienie wszystkich usług
echo "Uruchamianie usług..."
systemctl enable nginx
systemctl enable smbd
systemctl enable nmbd
systemctl enable nfs-kernel-server
systemctl enable minidlna
systemctl enable nas-pro
systemctl enable ssh
systemctl enable avahi-daemon

systemctl restart nginx
systemctl restart smbd
systemctl restart nmbd
systemctl restart nfs-kernel-server
systemctl restart minidlna
systemctl restart nas-pro
systemctl restart ssh
systemctl restart avahi-daemon

# Usunięcie skryptu po pierwszym uruchomieniu
rm -f /usr/local/bin/nas-firstboot.sh

echo "=== NAS-PRO skonfigurowany pomyślnie! ==="
echo "Interfejs webowy: http://localhost"
echo "SMB: \\nas-pro\Public"
echo "NFS: nas-pro:/srv/nas/public"
echo "SSH: ssh naspro@nas-pro (hasło: naspro)"
