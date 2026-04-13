def get_region_from_coordinates(
    latitude: Optional[float],
    longitude: Optional[float],
) -> str:
    if latitude is None or longitude is None:
        return "Unknown"

    if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
        return "Unknown"

    if latitude <= -60:
        return "Antarctica"

    if -35 <= latitude <= 37 and -20 <= longitude <= 55:
        return "Africa"

    if 5 <= latitude <= 83 and -170 <= longitude <= -52:
        return "North America"

    if -55 <= latitude <= 7 and -85 <= longitude <= -35:
        return "South America"

    if 34 <= latitude <= 82 and -31 <= longitude <= 60:
        return "Europe"

    if -50 <= latitude <= 10 and 110 <= longitude <= 180:
        return "Oceania"

    if -10 <= latitude <= 81 and 26 <= longitude <= 180:
        return "Asia"

    return "Unknown"

def _record_device_activity(device_id: str, body: str):
    if ACTIVE_DEVICE_ONLINE_MESSAGE.lower() not in body.lower():
        return

    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.serial_number == device_id).first()
        if not device:
            return

        device.last_online = datetime.now(timezone.utc)
        db.commit()
    finally:
        db.close()

def get_active_devices():
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ONLINE_DEVICE_TTL_SECONDS)

    manager_lookup = {
        manager.id: manager.username for manager in db.query(DeveloperManager).all()
    }

    def resolve_manager_name(value: Optional[str]) -> str:
        if value is None:
            return ""
        raw_value = str(value).strip()
        if not raw_value:
            return ""
        if raw_value.isdigit():
            return manager_lookup.get(int(raw_value), raw_value)
        return raw_value

    devices = (
        db.query(Device)
        .filter(Device.last_online.is_not(None), Device.last_online >= cutoff)
        .all()
    )

    return [
        {
            "device_type": d.device_type,
            "version_number": d.firmware.version_number if d.firmware else "N/A",
            "last_update": (
                d.last_update.strftime("%Y-%m-%d %H:%M") if d.last_update else "N/A"
            ),
            "location": d.location,
            "serial_number": d.serial_number,
            "description": d.description,
            "developer_manager": resolve_manager_name(d.developer_manager),
            "latitude": d.latitude,
            "longitude": d.longitude,
            "region": get_region_from_coordinates(d.latitude, d.longitude),
        }
        for d in devices
    ]