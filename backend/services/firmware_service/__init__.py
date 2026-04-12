"""
Firmware service module - centralized firmware business logic.

Exports all firmware operations organized by function:
- Utilities: status determination, DTO mapping, access control
- Queries: firmware retrieval by user role and status
- Approval: firmware approval and rejection workflows
- Deployment: device deployment and compatibility operations
"""

from .approval import approve_firmware, reject_firmware
from .deployment import cloud_to_many_device, deploy_firmware, get_compatible_devices
from .queries import get_firmware_by_status, get_firmware_device_types
from .utils import get_firmware_status, map_firmware_response, user_can_view_firmware

__all__ = [
    # Utilities
    "get_firmware_status",
    "map_firmware_response",
    "user_can_view_firmware",
    # Queries
    "get_firmware_device_types",
    "get_firmware_by_status",
    # Approval
    "approve_firmware",
    "reject_firmware",
    # Deployment
    "get_compatible_devices",
    "deploy_firmware",
    "cloud_to_many_device",
]
