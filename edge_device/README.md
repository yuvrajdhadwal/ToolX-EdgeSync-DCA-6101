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

**Verification:** Firmware binary download is complete and is verified to ensure no packet loss 
or corruption or security issues

**Execution:** Forks and then Executes the new binary process

**Confirmation:** If new firmware binary execs without issue, delete old binary and send
installation confirmation device to cloud message


