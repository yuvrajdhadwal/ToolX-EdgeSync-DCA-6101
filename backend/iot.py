import threading
import time
from typing import List, Set

import msrest
from azure.eventhub import EventHubConsumerClient
from azure.iot.hub import IoTHubRegistryManager
from azure.iot.device.aio import IoTHubDeviceClient
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
    try:
        iot_hub.send_c2d_message(device_id, "New Firmware Update Deployed", properties=
                                          {
                                              "isDeployment": "1",
                                              "firmwareID": firmware.id,
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


def listen_for_device_activity(
    event_connection_str: str,
    on_activity: callable,
):
    """
    @brief Continuously listens for telemetry events and reports device activity.
    Calls on_activity(device_id, body) for every telemetry event received.
    """

    def on_event(partition_context, event):
        device = event.system_properties.get(b'iot-connection-device-id', b'').decode()
        if device:
            body = event.body_as_str()
            on_activity(device, body)
            partition_context.update_checkpoint(event)

    client = EventHubConsumerClient.from_connection_string(
        event_connection_str,
        consumer_group="$Default",
    )
    with client:
        client.receive(on_event=on_event)


def get_active_devices_from_iothub(
    iot_connection_str: str,
    device_ids: List[str],
) -> List[str]:
    """
    @brief Returns devices currently connected according to IoT Hub registry state.
    """
    iot_hub = IoTHubRegistryManager.from_connection_string(iot_connection_str)
    active_ids: List[str] = []

    for device_id in device_ids:
        try:
            device = iot_hub.get_device(device_id)
            connection_state = getattr(device, "connection_state", None) or getattr(device, "connectionState", None)
            if str(connection_state).lower() == "connected":
                active_ids.append(device_id)
        except Exception:
            continue
    
    return active_ids

