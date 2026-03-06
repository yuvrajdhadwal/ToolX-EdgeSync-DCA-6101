import msrest
from azure.iot.hub import IoTHubRegistryManager

def deploy_helper(device_id: str, iot_hub: IoTHubRegistryManager) -> bool:
    """
    @brief Sends a Deployment Message from Cloud to Edge Device
    """
    success = False
    try:
        iot_hub.send_c2d_message(device_id, "test_message", properties=
                                          {
                                              "property1": "myProperty",
                                              "property123": "yourProperty" # temp
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
