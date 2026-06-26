# 🖥️ UGOS Pro NASware

> Full self-hosted NAS management platform — inspired by UGREEN UGOS Pro

[![Deploy](https://github.com/USERNAME/ugospro/actions/workflows/deploy.yml/badge.svg)](https://github.com/USERNAME/ugospro/actions/workflows/deploy.yml)

**Demo na żywo:** `https://TWÓJ_USER.github.io/ugospro`

---

## ✨ Co zawiera

| Funkcja | Opis |
|---------|------|
| 🥾 **Boot Screen** | Auto-wykrywanie CPU/RAM/GPU/OS/VM/WSL2/Docker |
| 🔐 **Login + 2FA** | Uwierzytelnianie z kodem TOTP |
| 🖥️ **Pulpit** | Przeciągane okna, dock, topbar na żywo |
| 🎬 **Video Player** | Biblioteka wideo z pełnym odtwarzaczem |
| 🎵 **Music Player** | FLAC/MP3, albumy, artyści, gatunki |
| 📤 **Upload Manager** | Drag & drop na wolumeny NAS |
| 🛍️ **App Center** | 12+ aplikacji Docker z instalatorem |
| ⬇️ **Install Wizard** | Wybór dysku, GPU, PUID/PGID, docker-compose |
| 🐳 **Container Manager** | Start/Stop/Remove kontenerów |
| 🔵 **GPU Panel** | iGPU/dGPU: lspci, VAAPI, QuickSync, encodery |
| 🛡️ **VPN Manager** | WireGuard + OpenVPN, tunnele, serwery |
| 💽 **Storage Manager** | Wolumeny NVMe/RAID/HDD |
| 🌐 **Network Center** | Interfejsy sieciowe |
| 🔐 **Security Advisor** | Firewall, audit log, 2FA |
| 🖥️ **Control Panel** | Sensory, wentylatory, zadania, użytkownicy |
| 🎨 **Animated Background** | Canvas aurora + cząsteczki |

---

## 🚀 Deploy na GitHub Pages (3 kroki)

### Krok 1 — Fork lub klonuj

```bash
git clone https://github.com/TWÓJ_USER/ugospro.git
cd ugospro
```

### Krok 2 — Push na GitHub

```bash
git remote set-url origin https://github.com/TWÓJ_USER/ugospro.git
git push -u origin main
```

### Krok 3 — Włącz GitHub Pages

1. Repo → **Settings** → **Pages**
2. Source: **"GitHub Actions"**
3. Czekaj ~2 minuty

✅ Gotowe: **`https://TWÓJ_USER.github.io/ugospro`**

**Każdy `git push` = automatyczny redeploy!**

---

## 💻 Lokalnie

```bash
npm install
npm run dev
# → http://localhost:5173
```

## 🐳 Docker na NAS

```bash
docker run -d -p 3000:3000 \
  -v $(pwd):/app -w /app \
  node:20-alpine \
  sh -c "npm install && npm run dev -- --host"
# → http://192.168.1.X:3000
```

---

## 🔑 Kredencjały demo

| User | Hasło | 2FA |
|------|-------|-----|
| `admin` | `admin` | `123456` |
| `user` | `user123` | — |

---

## 📁 Struktura

```
ugospro/
├── .github/workflows/deploy.yml  ← Auto GitHub Pages deploy
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── AnimatedBackground.tsx
│   │   ├── AppStore.tsx
│   │   ├── BackupCenter.tsx
│   │   ├── BootScreen.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── Desktop.tsx
│   │   ├── DockerManager.tsx
│   │   ├── FanMonitor.tsx
│   │   ├── FileManager.tsx
│   │   ├── GpuPanel.tsx        ← lspci, VAAPI, QuickSync
│   │   ├── LoginScreen.tsx     ← 2FA
│   │   ├── MusicPlayer.tsx     ← FLAC/MP3 library
│   │   ├── NetworkCenter.tsx
│   │   ├── PhotoApp.tsx
│   │   ├── SecurityCenter.tsx
│   │   ├── StorageManager.tsx
│   │   ├── UgosProSystem.tsx   ← Boot→Login→Desktop
│   │   ├── UploadManager.tsx   ← Drag & drop
│   │   ├── VideoPlayer.tsx     ← Video library
│   │   ├── VpnManager.tsx      ← WireGuard/OpenVPN
│   │   └── WizardModal.tsx     ← Install wizard
│   └── data/
│       ├── catalog.ts
│       ├── hooks.ts
│       └── theme.ts
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.app.json
```

---

*UGOS Pro NASware — inspirowany platformą UGREEN · React 18 + Vite 5 + TypeScript*
# asdf
