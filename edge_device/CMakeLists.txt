cmake_minimum_required(VERSION 3.10)
project(EdgeSyncAgent)

set(CMAKE_CXX_STANDARD 17)

# 1. Manually tell CMake where the headers are
# The Azure SDK install puts them in /usr/local/include/azureiot
include_directories(/usr/local/include/azureiot)

# 2. Tell the linker where the .a (static library) files are
link_directories(/usr/local/lib)

add_executable(base_firmware base_firmware.cpp)

# 3. Explicitly link every required library component
# This avoids the "azure_iot_sdks::" namespace issue
target_link_libraries(base_firmware PRIVATE 
    iothub_client
    iothub_client_mqtt_transport
    aziotsharedutil
    umqtt
    curl
    ssl
    crypto
    uuid
    pthread
)
