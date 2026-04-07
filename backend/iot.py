import threading

import msrest
from azure.eventhub import EventHubConsumerClient
from azure.iot.hub import IoTHubRegistryManager
from pydantic import BaseModel


class FirmwareOverview(BaseModel):
    id: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: str
    description: str


def deploy_helper(device_id: str, iot_hub: IoTHubRegistryManager, firmware: FirmwareOverview) -> bool:
    """
    @brief Sends a Deployment Message from Cloud to Edge Device
    """
    success = False
    is_emergency = firmware.isEmergency == "1"
    try:
        message_body = (
            "EMERGENCY Firmware Deployment - Immediate attention required"
            if is_emergency
            else "New Firmware Update Deployed"
        )
        iot_hub.send_c2d_message(device_id, message_body, properties=
                                          {
                                              "isDeployment": "1",
                                              "firmwareID": firmware.id,
                                              "isEmergency": "1" if is_emergency else "0",
                                              "notificationType": "emergencyDeploy" if is_emergency else "standardDeploy",
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

def listen_for_device(
    event_connection_str: str,
    device_id: str,
    on_received: callable,
    timeout: int = 30,
):
    """
    @brief Listens to specific device for telemetry to confirm device gets proper firmware
    When edge device receives message -> Call on_received(data)
    Stop listening if timeout = 30 sec
    """
    received_event = threading.Event()

    def on_event(partition_context, event):
        device = event.system_properties.get(b'iot-connection-device-id', b'').decode()
        if device == device_id:
            body = event.body_as_str()
            on_received(body)
            received_event.set()
            partition_context.update_checkpoint(event)

    def run_client():
        client = EventHubConsumerClient.from_connection_string(
            event_connection_str,
            consumer_group="$Default",
        )
        with client:
            client.receive(
                on_event=on_event,
                max_wait_time=timeout,
            )

    thread = threading.Thread(target=run_client, daemon=True)
    thread.start()
    received_event.wait(timeout=timeout)

