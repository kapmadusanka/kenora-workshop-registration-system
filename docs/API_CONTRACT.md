# Workshop System API Contract

## Authentication

### POST `/api/auth/login`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`, `Accept: application/json`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "secretpassword"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "token": "1|abc...",
      "token_type": "Bearer",
      "expires_at": "2026-10-09T19:21:08Z",
      "user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin",
        "is_active": true
      }
    }
    ```
  - `401 Unauthorized`:
    ```json
    {
      "message": "Invalid email or password",
      "errors": {}
    }
    ```
  - `403 Forbidden`:
    ```json
    {
      "message": "This account is deactivated. Please contact an admin.",
      "errors": {}
    }
    ```
  - `422 Unprocessable Content`:
    ```json
    {
      "message": "The given data was invalid.",
      "errors": {
        "email": ["The email field is required."]
      }
    }
    ```
  - `429 Too Many Requests`:
    ```json
    {
      "message": "Too many login attempts. Please try again later."
    }
    ```

### POST `/api/auth/logout`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`, `Accept: application/json`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "message": "Logged out"
    }
    ```
  - `401 Unauthorized`:
    ```json
    {
      "message": "Unauthenticated."
    }
    ```

### GET `/api/auth/me`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`, `Accept: application/json`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com",
        "role": "admin",
        "is_active": true
      }
    }
    ```
  - `401 Unauthorized`:
    ```json
    {
      "message": "Unauthenticated."
    }
    ```

## Roles
- `admin`
- `manager`
- `staff`

User `id` is a `number`.
