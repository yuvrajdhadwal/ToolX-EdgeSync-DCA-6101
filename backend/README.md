# Backend

## Run Backend Tests

```bash
./run_backend_tests.sh
```

## Run One Backend Test File

```bash
./run_backend_tests.sh test_api.py
```

You can also pass an absolute or relative file path:

```bash
./run_backend_tests.sh ./test/test_api.py
```

## Run FastAPI

```bash
uvicorn main:app --reload
```

## Build Backend (tests first, then start server)

```bash
./build_backend.sh
```
