# UGOS Pro NASware v3.2

> NAS Management Platform — interfejs webowy w stylu UGREEN UGOS Pro

---

## 🚀 Szybki start (przeglądarka)

```bash
npm install
npm run dev
```

Otwórz **http://localhost:5173**

**Dane logowania demo:**
- `admin` / `admin` (+ 2FA: `123456`)
- `user` / `user123`

---

## 💿 Budowanie ISO (Linux/Ubuntu)

```bash
# Wymagania
sudo apt-get install debootstrap squashfs-tools xorriso grub-pc-bin grub-efi-amd64-bin mtools

# Zbuduj React UI
npm ci && npm run build:fast

# Zbuduj ISO (wymaga root)
chmod +x build-iso.sh
sudo ./build-iso.sh
```

Powstanie plik `nas-pro.iso` gotowy do uruchomienia w VirtualBox lub na pendrive.

---

## 🖥️ VirtualBox — konfiguracja

1. **Nowa VM** → Typ: `Linux`, Wersja: `Debian (64-bit)`
2. RAM: minimum **2 GB** (zalecane 4 GB)
3. Dysk: **20 GB** (opcjonalnie)
4. Sieć: **NAT** lub **Host-only Adapter**
5. Nośnik optyczny: załaduj `nas-pro.iso`
6. Uruchom VM

Po uruchomieniu:
- Poczekaj na boot (30–60 sekund)
- Otwórz przeglądarkę na hoście: `http://<IP_VM>`
- Lub w VM: `http://localhost`

---

## 🌐 GitHub Actions (automatyczne ISO)

Push na `main` automatycznie buduje ISO.  
Pobierz z zakładki **Actions → Artifacts**.

---

## 📁 Udostępnianie plików

| Protokół | Adres                    |
|----------|--------------------------|
| SMB/Samba| `\\nas-pro\Public`       |
| NFS      | `nas-pro:/srv/nas/public`|
| DLNA     | Auto-wykrycie w sieci    |
| Web      | `http://nas-pro`         |

---

## 🔧 Domyślne dane

| Parametr | Wartość     |
|----------|-------------|
| Użytkownik | `naspro`  |
| Hasło    | `naspro`    |
| Root     | `naspro`    |
| Web UI   | port `80`   |
| SSH      | port `22`   |
| API      | port `3000` |
