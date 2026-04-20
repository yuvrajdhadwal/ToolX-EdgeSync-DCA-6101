cmake_minimum_required(VERSION 3.10)
project(EdgeSyncAgent)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON) # for clangd

# 1. Manually tell CMake where the headers are
# The Azure SDK install puts them in /usr/local/include/azureiot
include_directories(/usr/local/include/azureiot)

# 2. Tell the linker where the .a (static library) files are
link_directories(/usr/local/lib)

add_executable(main
    src/main.cpp
    src/setup.cpp
    src/shutdown.cpp
    src/stable.cpp
    src/download.cpp
    src/field_decision.cpp
    src/installation.cpp
    src/confirmation.cpp
    src/common.cpp
)

target_include_directories(main PRIVATE
    include
)

# 3. Explicitly link every required library component
target_link_libraries(main PRIVATE
    iothub_client
    iothub_client_mqtt_transport
    prov_auth_client 
    hsm_security_client
    utpm
    umqtt
    aziotsharedutil
    parson
    curl
    ssl
    crypto
    uuid
    pthread
    m
)

target_compile_options(main PRIVATE
    -Wall -Wextra -Wpedantic -Werror
    -Wshadow -Wconversion -Wsign-conversion
)
