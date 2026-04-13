from typing import Callable, Optional

from azure.eventhub import EventHubConsumerClient
from config import EVENTHUB_CONNECTION_STRING
from map.active_devices import _record_device_activity


def telemetry_activity_worker():
    if not EVENTHUB_CONNECTION_STRING:
        return

    while True:
        try:
            telemetry_listener(on_activity=_record_device_activity)
        except Exception as ex:
            print(EVENTHUB_CONNECTION_STRING)
            print(f"Active-device telemetry listener error: {ex}")


def telemetry_listener(
    on_activity: Optional[Callable[[str, str], None]] = None,
    on_error_callback: Optional[Callable] = None,
):
    """
    @brief Listens to Event Hub for telemetry and invokes callbacks.
    If on_activity is provided, calls on_activity(device_id, body) for each event.
    """
    client = EventHubConsumerClient.from_connection_string(
        conn_str=EVENTHUB_CONNECTION_STRING, consumer_group="$Default"
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
