import os
import threading
from datetime import datetime, timezone

from acceptance_status import update_acceptance_status
from database import SessionLocal
from iot import telemetry_listener
from models import Device


ACTIVE_DEVICE_ONLINE_MESSAGE = os.getenv(
	"ACTIVE_DEVICE_ONLINE_MESSAGE", "Device is Online"
)
EVENTHUB_CONNECTION_STRING = os.getenv("EVENTHUB_CONNECTION")


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


def telemetry_activity_worker():
	if not EVENTHUB_CONNECTION_STRING:
		return

	while True:
		try:
			telemetry_listener(on_activity=_record_device_activity)
		except Exception as ex:
			print(f"Active-device telemetry listener error: {ex}")


def telemetry_install_accept_worker():
	if not EVENTHUB_CONNECTION_STRING:
		return

	while True:
		try:
			telemetry_listener(on_activity=update_acceptance_status)
		except Exception as ex:
			print(f"Firmware telemetry listener error: {ex}")


def start_active_device_worker():
	threading.Thread(target=telemetry_activity_worker, daemon=True).start()


def start_firmware_worker():
	threading.Thread(target=telemetry_install_accept_worker, daemon=True).start()
