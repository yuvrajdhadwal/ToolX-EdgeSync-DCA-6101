from backend.database.models import User

def user_can_view_firmware(user: User, firmware_id: int) -> bool:
    return any(firmware.id == firmware_id for firmware in user.viewable_firmware)