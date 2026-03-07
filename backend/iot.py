import msrest
from azure.iot.hub import IoTHubRegistryManager
from pydantic import BaseModel

class FirmwareOverview(BaseModel):
    device_type: str
    developer: str
    version_number: str
    isEmergency: bool
    description: str


def deploy_helper(device_id: str, iot_hub: IoTHubRegistryManager, firmware: FirmwareOverview) -> bool:
    """
    @brief Sends a Deployment Message from Cloud to Edge Device
    """
    success = False
    try:
        iot_hub.send_c2d_message(device_id, "New Firmware Update Deployed", properties=
                                          {
                                              "isDeployment": "true",
                                              "isEmergency": firmware.isEmergency,
                                              "deviceType": firmware.device_type,
                                              "versionNumber": firmware.version_number,
                                              "developer": firmware.developer,
                                              "description": firmware.description
                                          })
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
