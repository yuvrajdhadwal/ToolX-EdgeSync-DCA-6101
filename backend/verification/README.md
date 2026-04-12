# verification

This folder contains backend token verification and authorization utilities.

## Purpose

- Centralize JWT token creation and validation logic.
- Provide reusable authorization helpers for routers and services.
- Keep authentication/authorization concerns separate from route handlers.

## Current contents

- `security.py`: helpers for:
  - access token creation
  - token decoding/verification
  - extracting authenticated user from auth headers
  - role-based guard checks (for example, developer manager requirements)
