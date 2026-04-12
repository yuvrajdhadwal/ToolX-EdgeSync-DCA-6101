# Firmware Service

Centralized business logic for firmware operations in the ToolX EdgeSync system. Organized into specialized modules: `utils.py` for status determination and response mapping, `queries.py` for role-based firmware retrieval, `approval.py` for approval and rejection workflows, and `deployment.py` for device deployment operations with IoT Cloud-to-Device messaging. All functions are exported through `__init__.py` for clean importing in routers and other services.
