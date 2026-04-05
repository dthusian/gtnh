# ROSSI

ROSSI is a small real-time operating system targeting OpenComputers. It is a replacement for OpenOS
and is designed for use in embedded systems.

Features:
- Headless operation
- Operates off a floppy with no hard drive, so that it is easier to inspect with another computer.
- No config file, app does needed config
- Support for HV1 global command: status and fwupd protocols

## Boot sequence

- OpenLoader loads init.lua from floppy
- init.lua
  - Search for floppy
  - Read config file
  - Begin new log
  - Define core functions
  - Handoff to app.lua
- app.lua
  - Starts desired services
  - Registers event handlers