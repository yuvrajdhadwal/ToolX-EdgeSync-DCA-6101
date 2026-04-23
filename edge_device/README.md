# Edge Device State Machine

## States

**Start Up:** On Device Bootup, Fork-Exec Most Recent Firmware. If no firmware pushed to device yet
forkexec default. Once Firmware exec success, establish connection with IoT hub and and publish
device to cloud message containing important device information (updating devices table)

**Stable:** Device is online and regularly sending heartbeat to server; it is listening for 
any deployments

**Deployed:** Device receives cloud to device message for deployment and displays incoming firmware
version and requests field/shop person to review

**Rejected:** Incoming firmware deployment is rejected by the field/shop person and device to cloud
message is sent to server to inform it of decision. This will include rejection comment from
field/shop person

**Accepted:** Incoming firmware deployment is accepted and edge device starts to download firmware
binary

**Download:** Downloads the approved firmware from backend endpoint

**Installation:** Forks and then Executes the new binary process

**Confirmation:** If new firmware binary execs without issue, delete old binary and send
installation confirmation device to cloud message

## Device StartUp

`docker build -t edge-device:v1 .` \

test7:
```
docker run --rm -it -e IOTHUB_CONNECTION_STRING="HostName=ToolXEdgeSyncIoT.azure-devices.net;DeviceId=test7;SharedAccessKey=sRBHViIcpaTjc9Ld6FlV0q3KcEms0Obv+8hvL72ZZFY=" -e EXTERNAL_API_URL_EDGE_DEVICE="http://host.docker.internal:8000" -e DEVICE_ID="test7" -e HEARTBEAT_SECONDS="15" -e CONFIRMATION_HEARTBEATS="1" edge-device:v1
```

TUSN103:

```
docker run --rm -it -e IOTHUB_CONNECTION_STRING="<YOUR_IOTHUB_CONNECTION_STRING>" -e EXTERNAL_API_URL_EDGE_DEVICE="http://host.docker.internal:8000" -e DEVICE_ID="TUSN103" -e HEARTBEAT_SECONDS="15" -e CONFIRMATION_HEARTBEATS="1" edge-device:v1
```
