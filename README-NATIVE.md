NAS-PRO - Native OS version

This branch removes all Web UI (React/Vite).
System is being converted to native desktop OS architecture.

New structure:
- kernel/        -> system kernel layer
- init/          -> init system
- system/        -> core services
- ui/            -> native desktop UI (Qt/GTK)
- apps/          -> system applications
- boot/          -> boot configuration
- installer/     -> system installer
- build/         -> ISO build system
