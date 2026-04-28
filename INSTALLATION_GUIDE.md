# ToolX-EdgeSync-DCA-6101 Installation Guide


## Getting Started

You can use the hosted website or run the project locally for development.

**Hosted Website:** [https://toolxedgesync-g0ekfec6d3ayeubw.eastus-01.azurewebsites.net/](https://toolxedgesync-g0ekfec6d3ayeubw.eastus-01.azurewebsites.net/)

**Startup Device Simulators** — run one of these in a separate terminal tab per device:

```bash
docker run --rm -it \
  -e IOTHUB_CONNECTION_STRING="AZURE_IOT_DEVICE_CONNECTION_STRING" \
  -e EXTERNAL_API_URL_EDGE_DEVICE="HOSTED_WEBSITE_URL" \
  -e DEVICE_ID="AZURE_IOT_DEVICE_ID" \
  -e HEARTBEAT_SECONDS="HEARTBEAT_INTERVAL_TIME_SECONDS" \
  -e CONFIRMATION_HEARTBEATS="NUMBER_OF_SUCCESSFUL_HEARTBEATS_FOR_TRANSITION_BETWEEN_BLUEGREEN_DURING_DEPLOYMENT" \
  edge-device:v1
```

---

## Prerequisites

- Python 3.8+
- Node.js 16+
- Docker
- IoT Hub

---

## Installation

1. **Clone the codebase:**
   ```bash
   git clone https://github.com/yuvrajdhadwal/ToolX-EdgeSync-DCA-6101.git
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Build the Docker container:**
   ```bash
   cd edge_device && docker build -t edge-device:v1 .
   ```

4. **Set up `.env` file** — add the following variables:
   - `SECRET_KEY`
   - `ALGORITHM`
   - `LOCAL_ORIGIN`
   - `IOT_CONNECTION`
   - `EVENTHUB_CONNECTION`
   - `EXTERNAL_API_URL`

---

## Run Instructions

1. **Start the frontend** (in its own terminal tab):
   ```bash
   npm run dev
   ```

2. **Start the backend** (in its own terminal tab):
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Startup Device Simulators** — run one of these per device (in separate terminal tabs):
   ```bash
   docker run --rm -it \
     -e IOTHUB_CONNECTION_STRING="AZURE_IOT_DEVICE_CONNECTION_STRING" \
     -e EXTERNAL_API_URL_EDGE_DEVICE="http://host.docker.internal:8000" \
     -e DEVICE_ID="AZURE_IOT_DEVICE_ID" \
     -e HEARTBEAT_SECONDS="HEARTBEAT_INTERVAL_TIME_SECONDS" \
     -e CONFIRMATION_HEARTBEATS="NUMBER_OF_SUCCESSFUL_HEARTBEATS_FOR_TRANSITION_BETWEEN_BLUEGREEN_DURING_DEPLOYMENT" \
     edge-device:v1
   ```

---

## Local Access

| Service | URL |
|---|---|
| Frontend | http://localhost:5173/ |
| Backend Swagger UI | http://127.0.0.1:8000/docs |
