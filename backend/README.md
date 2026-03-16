# Backend

## Run FastAPI

```bash
uvicorn main:app --reload
```

## Database test framework

This branch now includes reusable database-test scaffolding for all user roles.

### Install test dependencies

```bash
pip install -r requirements-dev.txt
```

### Run all database tests

```bash
pytest
```

### Run tests by user role

```bash
pytest -m developer
pytest -m developer_manager
pytest -m business_manager
pytest -m field_shop_professional
```

### Test structure

- `conftest.py`: shared in-memory SQLite database fixtures with foreign keys enabled
- `tests/factories.py`: reusable builders for users, firmware, devices, deploy/install/rejection records
- `tests/test_*_db.py`: starter test modules for each user role
- `test_db.py`: legacy integrity and relationship tests

### Writing new tests

Use the shared `factory` fixture to quickly create related database records.

Example:

```python
def test_example(factory):
	manager = factory.developer_manager()
	developer = factory.developer(manager=manager)
	firmware = factory.firmware(uploaded_by=developer)

	assert firmware.uploaded_by == developer.id
```
