"""
Firmware service module.

Handles firmware upload, deployment, approval/rejection, and version management.
"""

# Core utilities and read operations
from .core import (
    download_firmware,
    get_firmware_by_id,
    get_firmware_by_status,
    get_firmware_device_types,
    get_firmware_status,
    get_region_from_coordinates,
    map_firmware_response,
    user_can_view_firmware,
)
# Deployment operations
from .deployment import (
    cloud_to_many_device,
    deploy_firmware,
    get_compatible_devices,
)
# Approval workflow
from .approval import (
    approve_firmware,
    reject_firmware,
)
# Upload operations
from .upload import upload_firmware
# Schemas
from .schemas import FirmwareResponse

__all__ = [
    # Schemas
    "FirmwareResponse",
    # Core utilities
    "get_firmware_status",
    "map_firmware_response",
    "user_can_view_firmware",
    "get_region_from_coordinates",
    # Read operations
    "get_firmware_by_id",
    "get_firmware_by_status",
    "get_firmware_device_types",
    "download_firmware",
    # Deployment
    "deploy_firmware",
    "cloud_to_many_device",
    "get_compatible_devices",
    # Approval
    "approve_firmware",
    "reject_firmware",
    # Upload
    "upload_firmware",
]
