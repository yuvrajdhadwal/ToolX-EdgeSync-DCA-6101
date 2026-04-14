import datetime
import os
from datetime import datetime, timezone
from typing import Optional

import msrest
from azure.iot.hub import IoTHubRegistryManager
from config import EXTERNAL_API_URL
from database.database_types import UserRole
from database.models import BusinessManager, Deploy, Device, FirmwareUpdate
from fastapi import HTTPException
from firmware.firmware_types import FirmwareOverview
from IoT.iot_types import DeployManyRequest
from login.authentication import get_authenticated_user
from sqlalchemy.orm import Session


def deploy_to_devices(
    payload: DeployManyRequest,
    db: Session,
    authorization: Optional[str],
):
    user = get_authenticated_user(authorization, db)

    if bool(user.type != UserRole.business_manager):
        raise HTTPException(
            status_code=403, detail="Only business managers can deploy firmware"
        )

    firmware = (
        db.query(FirmwareUpdate)
        .filter(FirmwareUpdate.id == payload.firmware_id)
        .first()
    )
    if not firmware:
        raise HTTPException(status_code=404, detail="Firmware not found")

    if firmware.approved_by is None or firmware.declined_by is not None:
        raise HTTPException(
            status_code=400, detail="Only approved firmware can be deployed"
        )

    business_manager = (
        db.query(BusinessManager).filter(BusinessManager.id == user.id).first()
    )
    if not business_manager:
        raise HTTPException(status_code=404, detail="Business manager not found")

    connection_str = os.getenv("IOT_CONNECTION")
    iot_hub = (
        IoTHubRegistryManager.from_connection_string(connection_str)
        if connection_str
        else None
    )

    firmware_overview = FirmwareOverview(
        id=str(firmware.id),
        device_type=firmware.device_type,  # type: ignore
        developer=str(firmware.uploaded_by or ""),
        version_number=firmware.version_number,  # type: ignore
        isEmergency="1" if (bool(firmware.isEmergency) or payload.isEmergency) else "0",
        description=firmware.description or "",  # type: ignore
    )

    results = []
    for serial in payload.serial_numbers:
        device = db.query(Device).filter(Device.serial_number == serial).first()
        if not device:
            results.append({"serial_number": serial, "status": "not found"})
            continue

        iot_status = "not configured"
        if iot_hub:
            try:
                sent = deploy_cloud_to_device(serial, iot_hub, firmware_overview)
                iot_status = "sent" if sent else "failed"
            except Exception as e:
                print(f"IoT error for {serial}: {e}")
                iot_status = "failed"

        existing_deploy = (
            db.query(Deploy)
            .filter(
                Deploy.device_serial == serial,
                Deploy.isActive == True,
            )
            .first()
        )
        if existing_deploy:
            existing_deploy.isActive = False  # type: ignore

        device.firmware_id = payload.firmware_id  # type: ignore
        device.last_update = datetime.now(timezone.utc)  # type: ignore

        deploy = Deploy(
            manager_id=business_manager.id,
            target_firmware_id=payload.firmware_id,
            device_serial=serial,
            device_firmware_id=payload.firmware_id,
            timestamp=datetime.now(timezone.utc),
            isActive=True,
            isEmergency=payload.isEmergency,
        )
        db.add(deploy)
        results.append(
            {
                "serial_number": serial,
                "status": "deployed",
                "iot_notification": iot_status,
            }
        )

    db.commit()
    return {
        "message": f"Deployed to {len([r for r in results if r['status'] == 'deployed'])} device(s)",
        "results": results,
    }


def deploy_cloud_to_device(
    device_id: str, iot_hub: IoTHubRegistryManager, firmware: FirmwareOverview
) -> bool:
    """
    @brief Sends a Deployment Message from Cloud to Edge Device
    """
    success = False
    try:
        print(EXTERNAL_API_URL)
        iot_hub.send_c2d_message(
            device_id,
            "New Firmware Update Deployed",
            properties={
                "isDeployment": "1",
                "firmwareID": firmware.id,
                "isEmergency": "1" if firmware.isEmergency == "1" else "0",
                "deviceType": firmware.device_type,
                "versionNumber": firmware.version_number,
                "developer": firmware.developer,
                "description": firmware.description,
                "download_link": f"{EXTERNAL_API_URL}/firmware/{firmware.id}/device_download",
            },
        )
        success = True
    except msrest.exceptions.HttpOperationError as ex:
        print("HttpOperationError error {0}".format(ex.response.text))
        success = False
    except Exception as ex:
        print("Unexpected error {0}".format(ex))
        success = False
    except KeyboardInterrupt:
        print("{} stopped".format(__file__))
        success = False
    finally:
        return success
