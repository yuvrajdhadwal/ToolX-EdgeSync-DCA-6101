# build
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y \
	g++ \
	cmake \
	make \
	curl \
	git \
	libcurl4-openssl-dev \
	libssl-dev \
	uuid-dev \
	build-essential \
	ca-certificates

WORKDIR /app

RUN git clone -b lts_03_2025 https://github.com/Azure/azure-iot-sdk-c.git && \
	cd azure-iot-sdk-c && \
	git submodule update --init && \
	mkdir -p build && cd build && \
	cmake .. && \
	cmake --build . -j $(nproc) && \
	cmake --install . && \
	cd ../..

COPY base_firmware.cpp .
COPY CMakeLists.txt .

RUN cmake -S . -B build -DCMAKE_PREFIX_PATH=/usr/local && \
    cmake --build build --config Release

# run
FROM ubuntu:22.04 AS runner

RUN apt-get update && apt-get install -y \
	libcurl4 \
	openssl \
	libuuid1

WORKDIR /app

COPY --from=builder /app/build/base_firmware .

CMD ["./base_firmware"]
