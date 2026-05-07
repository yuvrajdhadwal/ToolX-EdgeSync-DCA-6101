import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from azure.iot.hub import IoTHubRegistryManager
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session
from geonamescache import GeonamesCache

from config import ACTIVE_DEVICE_ONLINE_MESSAGE, ONLINE_DEVICE_TTL_SECONDS
from database.database import SessionLocal
from database.models import Deploy, DeveloperManager, Device, FirmwareUpdate, Shop
from firmware.firmware_types import FirmwareOverview
from IoT.deployment import deploy_cloud_to_device
from sqlalchemy.orm import Session

# Cache for geonames data
_GN_CACHE = None

# Mapping of continent codes to names
CONTINENT_CODE_MAP = {
    'AF': 'Africa',
    'AN': 'Antarctica',
    'AS': 'Asia',
    'EU': 'Europe',
    'NA': 'North America',
    'SA': 'South America',
    'OC': 'Oceania',
}


def _get_geonames_cache():
    """Get or initialize the geonames cache."""
    global _GN_CACHE
    if _GN_CACHE is None:
        _GN_CACHE = GeonamesCache()
    return _GN_CACHE


def get_region_from_coordinates(
    latitude: Optional[float],
    longitude: Optional[float],
) -> str:
    """Determine continent from coordinates using geonames data."""
    if latitude is None or longitude is None:
        return "Unknown"

    if latitude < -90 or latitude > 90 or longitude < -180 or longitude > 180:
        return "Unknown"

    try:
        gc = _get_geonames_cache()
        cities = gc.get_cities()
        countries = gc.get_countries()
        
        # Find the closest city to the given coordinates
        min_distance = float('inf')
        closest_city = None
        
        for city_id, city in cities.items():
            # Skip cities without valid coordinates
            city_lat = city.get('latitude')
            city_lon = city.get('longitude')
            if city_lat is None or city_lon is None:
                continue
            
            try:
                city_lat = float(city_lat)
                city_lon = float(city_lon)
            except (ValueError, TypeError):
                continue
            
            # Simple squared distance (no need for sqrt since we're just comparing)
            distance = (latitude - city_lat) ** 2 + (longitude - city_lon) ** 2
            
            if distance < min_distance:
                min_distance = distance
                closest_city = city
        
        if closest_city:
            country_code = closest_city.get('countrycode')
            if country_code:
                country = countries.get(country_code)
                if country:
                    continent_code = country.get('continentcode')
                    continent = CONTINENT_CODE_MAP.get(continent_code, "Unknown")
                    return continent
        
        return "Unknown"
    except Exception as e:
        print(f"Error determining continent: {e}")
        return "Unknown"


def _normalize_to_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_online(last_online: Optional[datetime], cutoff: datetime) -> bool:
    normalized_last_online = _normalize_to_utc(last_online)
    normalized_cutoff = _normalize_to_utc(cutoff)
    if normalized_last_online is None or normalized_cutoff is None:
        return False
    return normalized_last_online >= normalized_cutoff


def _record_device_activity(device_id: str, body: str):
    if ACTIVE_DEVICE_ONLINE_MESSAGE.lower() not in body.lower():
        return

    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.serial_number == device_id).first()
        if not device:
            return

        device.last_online = datetime.now(timezone.utc)  # type: ignore
        db.commit()
    finally:
        db.close()


def check_pending_deployments(device_id: str):
    db = SessionLocal()
    try:
        pending_deploy = (
            db.query(Deploy)
            .filter(
                or_(Deploy.isAccepted.is_(None), Deploy.isAccepted == False),
                Deploy.device_serial == device_id,
            )
            .order_by(desc(Deploy.timestamp))
            .first()
        )

        ever_accepted_firmware = (
            db.query(Deploy)
            .filter(
                Deploy.isAccepted == True,
                Deploy.device_serial == device_id,
            )
            .first()
        )

        if ever_accepted_firmware and pending_deploy:
            return pending_deploy
        return None
    finally:
        db.close()


def _redeploy_firmware(db: Session):
    all_devices = db.query(Device).all()

    connection_str = os.getenv("IOT_CONNECTION")
    iot_hub = IoTHubRegistryManager.from_connection_string(connection_str)

    for device in all_devices:
        pending_deploy = check_pending_deployments(device.serial_number)

        if not pending_deploy:
            continue

        firmware = (
            db.query(FirmwareUpdate)
            .filter(FirmwareUpdate.id == pending_deploy.target_firmware_id)
            .first()
        )

        firmware_overview = FirmwareOverview(
            id=str(firmware.id),
            device_type=firmware.device_type,
            developer=str(firmware.uploaded_by or ""),
            version_number=firmware.version_number,
            isEmergency=(
                "1"
                if (bool(firmware.isEmergency) or pending_deploy.isEmergency)
                else "0"
            ),
            description=firmware.description or "",
        )

        deploy_cloud_to_device(device.serial_number, iot_hub, firmware_overview)


def get_active_devices(db: Session):
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
        .filter(Device.last_online.is_not(None))
        .all()
    )

    devices = [device for device in devices if _is_online(device.last_online, cutoff)]

    _redeploy_firmware(db)

    return [
        {
            "device_type": d.device_type,
            "version_number": d.firmware.version_number if d.firmware else "N/A",
            "last_update": (
                d.last_update.strftime("%Y-%m-%d %H:%M") if d.last_update else "N/A"  # type: ignore
            ),
            "shop_id": d.shop.id if d.shop else None,
            "shop_location": d.shop.location if d.shop else d.location,
            "location": d.shop.location if d.shop else d.location,
            "serial_number": d.serial_number,
            "description": d.description,
            "developer_manager": resolve_manager_name(d.developer_manager),  # type: ignore
            "latitude": d.shop.latitude if d.shop else d.latitude,
            "longitude": d.shop.longitude if d.shop else d.longitude,
            "region": get_region_from_coordinates(
                d.shop.latitude if d.shop else d.latitude,
                d.shop.longitude if d.shop else d.longitude,
            ),
        }
        for d in devices
    ]


def _get_shop_pin_color(active_device_count: int, total_device_count: int) -> str:
    if total_device_count <= 0:
        return "red"

    active_ratio = active_device_count / total_device_count

    if active_ratio < 0.10:
        return "red"
    if active_ratio < 0.25:
        return "black"
    if active_ratio < 0.50:
        return "blue"
    return "green"


def get_shop_activity(db: Session):
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ONLINE_DEVICE_TTL_SECONDS)
    shops = db.query(Shop).all()

    results = []
    for shop in shops:
        active_device_count = sum(
            1
            for device in shop.devices
            if _is_online(device.last_online, cutoff)
        )
        results.append(
            {
                "id": shop.id,
                "location": shop.location,
                "latitude": shop.latitude,
                "longitude": shop.longitude,
                "region": get_region_from_coordinates(shop.latitude, shop.longitude),
                "device_types": sorted(
                    {
                        device.device_type
                        for device in shop.devices
                        if device.device_type is not None and device.device_type.strip()
                    }
                ),
                "active_device_count": active_device_count,
                "total_device_count": len(shop.devices),
                "pin_color": _get_shop_pin_color(active_device_count, len(shop.devices)),
            }
        )

    return results

