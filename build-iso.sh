#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  NAS-PRO LIVE FIX — uruchom na działającym systemie
#  Naprawia: kiosk, X11, nginx, React UI
#  Użycie: sudo bash fix-live.sh
# ═══════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[INFO]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }

[ "$EUID" -ne 0 ] && err "Uruchom jako root: sudo bash fix-live.sh"

echo -e "${GREEN}NAS-PRO Live Fix — start${NC}"

# ── 1. Zainstaluj brakujące paczki ──────────────────────────────
warn "Instaluję brakujące pakiety..."
apt-get update -qq
apt-get install -y -qq \
  xserver-xorg xserver-xorg-core xinit \
  xserver-xorg-input-all \
  xserver-xorg-video-intel xserver-xorg-video-amdgpu \
  xserver-xorg-video-vmware xserver-xorg-video-qxl \
  xserver-xorg-video-fbdev xserver-xorg-video-vesa \
  xserver-xorg-video-modesetting \
  libgl1-mesa-dri mesa-utils \
  openbox chromium \
  fonts-noto fonts-liberation \
  x11-xserver-utils x11-utils dbus-x11 \
  unclutter \
  nginx nodejs npm \
  2>/dev/null || true
log "Pakiety OK"

# ── 2. Twórz użytkownika jeśli nie istnieje ──────────────────────
id naspro &>/dev/null || useradd -m -s /bin/bash naspro
echo "naspro:naspro" | chpasswd
for g in sudo video audio docker render; do
  groupadd -f $g 2>/dev/null || true
  usermod -aG $g naspro 2>/dev/null || true
done
echo "naspro ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/naspro
chmod 440 /etc/sudoers.d/naspro
log "Użytkownik naspro OK"

# ── 3. Auto-login TTY1 ───────────────────────────────────────────
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf <<'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin naspro --noclear %I $TERM
Type=idle
RestartSec=0
TimeoutStopSec=0
EOF
log "Auto-login OK"

# ── 4. Wykryj GPU i wygeneruj xorg.conf ──────────────────────────
warn "Wykrywam GPU..."
PCI=$(lspci 2>/dev/null | grep -iE "vga|display|3d" || true)
echo "PCI GPU: $PCI"

DRIVER="modesetting"
echo "$PCI" | grep -qi "vmware"  && DRIVER="vmware"
echo "$PCI" | grep -qi "qxl"     && DRIVER="qxl"
echo "$PCI" | grep -qi "intel"   && DRIVER="intel"
echo "$PCI" | grep -qi "amd\|radeon" && DRIVER="amdgpu"
echo "$PCI" | grep -qi "nvidia"  && DRIVER="nouveau"

# Sprawdź VM
VIRT=$(systemd-detect-virt 2>/dev/null || echo "none")
[ "$VIRT" = "vmware" ]     && DRIVER="vmware"
[ "$VIRT" = "oracle" ]     && DRIVER="modesetting"
[ "$VIRT" = "kvm" ]        && DRIVER="qxl"
[ "$VIRT" = "qemu" ]       && DRIVER="modesetting"

log "GPU driver: $DRIVER (VM: $VIRT)"

mkdir -p /etc/X11
cat > /etc/X11/xorg.conf <<XEOF
Section "ServerFlags"
    Option "AutoAddDevices" "true"
    Option "AllowEmptyInput" "false"
EndSection

Section "Device"
    Identifier "VideoCard"
    Driver     "$DRIVER"
    Option     "AccelMethod" "none"
EndSection

Section "Screen"
    Identifier "Screen0"
    Device     "VideoCard"
    DefaultDepth 24
    SubSection "Display"
        Depth 24
        Modes "1920x1080" "1280x720" "1024x768"
    EndSubSection
EndSection

Section "InputDevice"
    Identifier "Keyboard"
    Driver     "evdev"
    Option     "XkbLayout" "pl"
EndSection
XEOF
log "xorg.conf OK (driver: $DRIVER)"

# ── 5. Nginx + React UI ──────────────────────────────────────────
mkdir -p /var/www/nas-pro

# Sprawdź czy jest dist/ w bieżącym katalogu
if [ -d "$(pwd)/dist" ] && [ -f "$(pwd)/dist/index.html" ]; then
  cp -r "$(pwd)/dist/." /var/www/nas-pro/
  log "React UI skopiowany z dist/"
else
  warn "Brak dist/ — tworzę wbudowany UI..."
  cat > /var/www/nas-pro/index.html <<'HTMLEOF'
<!DOCTYPE html>
<html lang="pl"><head>
<meta charset="UTF-8"><title>UGOS Pro</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#05070b;color:#e2eaf5;font-family:system-ui,sans-serif;
     min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#0f1521;border:1px solid #1a2535;border-radius:20px;
      padding:44px 40px;width:400px;text-align:center}
.logo{width:64px;height:64px;background:linear-gradient(135deg,#00c2a8,#14b8a6);
      border-radius:18px;display:flex;align-items:center;justify-content:center;
      font-size:22px;font-weight:900;color:#000;margin:0 auto 20px}
h1{font-size:28px;font-weight:800}h1 span{color:#00c2a8}
p{color:#64748b;font-size:13px;margin:8px 0 32px}
label{display:block;text-align:left;font-size:11px;color:#64748b;margin-bottom:6px}
input{width:100%;padding:12px 16px;background:#0a1018;border:1.5px solid #1a2535;
      border-radius:10px;color:#e2eaf5;font-size:14px;margin-bottom:18px;outline:none}
input:focus{border-color:#00c2a8}
button{width:100%;padding:13px;background:linear-gradient(135deg,#00c2a8,#14b8a6);
       color:#000;border:none;border-radius:11px;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:20px}
.hint{background:#131c28;border:1px solid #1a2535;border-radius:10px;
      padding:14px;font-size:12px;color:#64748b;line-height:2;text-align:left}
</style></head><body>
<div class="card">
  <div class="logo">UG</div>
  <h1>UGOS <span>Pro</span></h1>
  <p>NAS Management Platform</p>
  <label>Użytkownik</label>
  <input type="text" id="u" value="admin" autocomplete="off">
  <label>Hasło</label>
  <input type="password" id="p" value="admin">
  <button onclick="login()">Zaloguj się</button>
  <div class="hint"><b>Demo:</b><br>admin / admin (2FA: 123456)<br>user / user123</div>
</div>
<script>
function login(){
  const u=document.getElementById('u').value,p=document.getElementById('p').value;
  if((u==='admin'&&p==='admin')||(u==='user'&&p==='user123')){
    document.body.innerHTML='<div style="color:#00c2a8;font-size:20px;font-weight:800;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%)">⟳ Ładowanie UGOS Pro...</div>';
  } else {
    document.querySelector('input[type=password]').style.borderColor='#ef4444';
    setTimeout(()=>document.querySelector('input[type=password]').style.borderColor='#1a2535',1500);
  }
}
document.addEventListener('keydown',e=>e.key==='Enter'&&login());
</script></body></html>
HTMLEOF
fi

cat > /etc/nginx/sites-available/default <<'EOF'
server {
    listen 80 default_server;
    root /var/www/nas-pro;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

systemctl enable nginx 2>/dev/null
systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null
log "Nginx OK"

# ── 6. Kiosk start script ────────────────────────────────────────
mkdir -p /home/naspro/.config/openbox

cat > /home/naspro/.start-kiosk.sh <<'EOF'
#!/bin/bash
export HOME=/home/naspro
export DISPLAY=:0
export XAUTHORITY=/home/naspro/.Xauthority

LOG=/tmp/naspro-kiosk.log
echo "[$(date)] START" >> "$LOG"

# Startuj X
/usr/bin/Xorg :0 vt1 -nolisten tcp -br >> "$LOG" 2>&1 &
XPID=$!

# Czekaj na X
for i in $(seq 1 20); do
  xdpyinfo -display :0 &>/dev/null && break
  sleep 1
done

xset -display :0 s off 2>/dev/null || true
xset -display :0 -dpms 2>/dev/null || true
xrandr --display :0 --auto 2>/dev/null || true

# Openbox
openbox --display :0 &
sleep 1

# Czekaj na nginx
for i in $(seq 1 30); do
  curl -sf http://localhost/ &>/dev/null && break
  sleep 1
done

echo "[$(date)] Chromium start" >> "$LOG"

# Chromium kiosk
exec chromium \
  --display=:0 \
  --kiosk \
  --no-first-run \
  --no-default-browser-check \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-extensions \
  --disable-gpu-sandbox \
  --start-fullscreen \
  --app=http://localhost \
  >> "$LOG" 2>&1
EOF
chmod +x /home/naspro/.start-kiosk.sh

cat > /home/naspro/.config/openbox/rc.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <desktops><number>1</number></desktops>
  <applications>
    <application class="*">
      <decor>no</decor>
      <maximized>yes</maximized>
    </application>
  </applications>
  <keyboard>
    <keybind key="C-A-t">
      <action name="Execute"><command>xterm</command></action>
    </keybind>
  </keyboard>
</openbox_config>
EOF

chown -R naspro:naspro /home/naspro
log "Kiosk script OK"

# ── 7. Systemd kiosk service ─────────────────────────────────────
cat > /etc/systemd/system/naspro-kiosk.service <<'EOF'
[Unit]
Description=NAS-PRO Kiosk
After=nginx.service network.target
Wants=nginx.service

[Service]
Type=simple
User=naspro
Group=naspro
Environment=HOME=/home/naspro
Environment=DISPLAY=:0
TTYPath=/dev/tty1
StandardInput=tty
ExecStartPre=/bin/sleep 3
ExecStart=/home/naspro/.start-kiosk.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable naspro-kiosk
systemctl start naspro-kiosk &
log "Kiosk service uruchomiony!"

# ── 8. Pokaż IP ──────────────────────────────────────────────────
IP=$(hostname -I | awk '{print $1}' || echo "brak")

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  NAS-PRO FIX ZAKOŃCZONY!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "  IP systemu:    ${YELLOW}$IP${NC}"
echo -e "  Web UI:        ${YELLOW}http://$IP${NC}"
echo -e "  Kiosk status:  $(systemctl is-active naspro-kiosk 2>/dev/null || echo 'starting...')"
echo -e "  Nginx status:  $(systemctl is-active nginx 2>/dev/null)"
echo ""
echo -e "  Sprawdź logi kiosk:"
echo -e "  ${YELLOW}journalctl -u naspro-kiosk -f${NC}"
echo -e "  ${YELLOW}cat /tmp/naspro-kiosk.log${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
