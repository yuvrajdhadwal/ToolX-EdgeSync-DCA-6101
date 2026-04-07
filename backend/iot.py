import os
import threading
import time
from typing import Callable, List, Optional, Set

import msrest
from azure.eventhub import EventHubConsumerClient
from azure.iot.hub import IoTHubRegistryManager
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class FirmwareOverview(BaseModel):
    id: str
    device_type: str
    developer: str
    version_number: str
    isEmergency: str
    description: str


def deploy_helper(
    device_id: str, iot_hub: IoTHubRegistryManager, firmware: FirmwareOverview
) -> bool:
    """
    @brief Sends a Deployment Message from Cloud to Edge Device
    """
    success = False
    is_emergency = firmware.isEmergency == "1"
    try:
        iot_hub.send_c2d_message(
            device_id,
            "New Firmware Update Deployed",
            properties={
                "isDeployment": "1",
                "firmwareID": firmware.id,
                "isEmergency": firmware.isEmergency,
                "deviceType": firmware.device_type,
                "versionNumber": firmware.version_number,
                "developer": firmware.developer,
                "description": firmware.description,
            },
        )
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




def telemetry_listener(
    on_activity: Optional[Callable[[str, str], None]] = None,
    on_error_callback: Optional[Callable] = None,
):
    """
    @brief Listens to Event Hub for telemetry and invokes callbacks.
    If on_activity is provided, calls on_activity(device_id, body) for each event.
    """
    client = EventHubConsumerClient.from_connection_string(
        conn_str=os.getenv("EVENTHUB_CONNECTION"), consumer_group="$Default"
    )

    with client:
        client.receive_batch(
            on_event_batch=lambda partition_context, events: on_event_batch(
                partition_context, events, on_activity
            ),
            on_error=lambda partition_context, error: on_error(
                partition_context, error, on_error_callback
            ),
        )


def on_event_batch(
    partition_context,
    events,
    on_activity: Optional[Callable[[str, str], None]] = None,
):
    """
    @brief Processes a batch of events from Event Hub.
    Extracts device_id and body, then calls on_activity callback if provided.
    """
    for event in events:

        if event.body_as_str() != "Device is Online":
            continue
        device_id = event.system_properties.get(
            b"iothub-connection-device-id", b""
        ).decode()
        body = event.body_as_str()
        
        if not device_id:
            continue

        if on_activity:
            on_activity(device_id, body)
        else:
            # Fallback logging if no callback provided
            print(f"[{device_id}] {body}")
    
    
    partition_context.update_checkpoint()


def on_error(partition_context, error, on_error_callback: Optional[Callable] = None):
    """
    @brief Handles errors from Event Hub listener.
    """
    if partition_context:
        print(
            "An exception: {} occurred during receiving from Partition: {}.".format(
                error, partition_context.partition_id
            )
        )
    else:
        print(
            "An exception: {} occurred during the load balance process.".format(error)
        )

    if on_error_callback:
        on_error_callback(partition_context, error)
