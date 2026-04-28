# ToolX-EdgeSync-DCA-6101 Release Notes

## Overview

ToolX-EdgeSync-DCA-6101 is a scalable software infrastructure for managing over-the-air (OTA) firmware updates across industrial edge devices running embedded Linux. The system will streamline update deployment, ensure end-to-end security, and support future growth with modular architecture and cloud-native components.

**[Try it Out!](https://toolxedgesync-g0ekfec6d3ayeubw.eastus-01.azurewebsites.net/)**

---

## Features v1.0 — 04/28/2026

### All Users
- Registration and Login abilities
- View User Profile
- Logout

### Developer
- Upload new Firmware to database
- View existing firmware and their detail page (Accepted, Pending, Rejected)
- Download existing firmware from the firmware detail page

### Developer Manager
- Accept and reject pending firmware from developers
- View existing firmware and their detail page (Accepted, Pending, Rejected)
- Download existing firmware from the firmware detail page

### Business Manager
- View existing firmware and their detail page (Accepted, Pending, Rejected)
- Download existing firmware from the firmware detail page
- Deploy firmware from the firmware page to multiple (filtered) devices
- View existing devices and their detail page
- View Device Deployment history from the device page
- Delete device instance
- Add new Device instance
- Navigate world map and view shop pins
- Filter world map by regions
- View shop device list in world map page
- Filter devices by: Serial Number, Type, Activity Status, and Firmware Version
- Deploy to devices from world map
- Add shop instance

### Field/Shop Technician
- View existing devices and their detail page
- View Device Deployment history from the device page
- Download firmware existing on current device

---

## Fixed Bugs

### Sprint 1
- Login/Register buttons existing in all pages regardless of if logged in or not
- Ability to access home page even when not logged in
- UI inconsistencies between screens
- Upload page failure due to the change of the developer schema
- Logout button appearing in wrong location
- Add device allowed empty entry

### Sprint 2
- Deployment to one or many Azure IoT devices not properly working for C2D messaging
- Edge devices not having full integration with backend
- Default firmware version for new devices being v1.0 instead of v0.0

### Sprint 3
- Developer Manager taken to accept tab after accepting pending firmware
- Developer Manager taken to reject tab after rejecting pending firmware
- New device instances not having a default firmware version upon creation
- Missing download firmware option for Field Technician
- Failing to update database when firmware is accepted by Developer Manager
- Field Shop Professional being able to remove devices from their device table

---

## Known Issues

- Developer Manager not being sent to pending table after confirming firmware
- Inaccurate region bounding parameters
- Firmware tab taking time to pop up after deploy button is pressed
- Deployment status taking time to update after a recent deployment

---

## Installation Guide

See the existing installation guide here:
[Installation Guide]([https://github.com/yuvrajdhadwal/ToolX-EdgeSync-DCA-6101/blob/main/Installation%20Guide.pdf](https://github.com/yuvrajdhadwal/ToolX-EdgeSync-DCA-6101/blob/Update-README/INSTALLATION_GUIDE.md))

---

## License

[MIT](https://github.com/yuvrajdhadwal/ToolX-EdgeSync-DCA-6101/blob/main/LICENSE)
