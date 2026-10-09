# Workshop Registration System

A full-stack, enterprise-grade workshop registration and management platform built with a **Laravel 12 REST API** backend and a **Next.js 16 (App Router)** frontend. The system provides strict Role-Based Access Control (RBAC), atomic capacity management with pessimistic locking to prevent overbooking, audit trail tracking, and registration history.

---

## Architecture & Project Structure

The project is structured as a monorepo containing the following components:

```text
kenora-workshop-registration-system/
├── backend/          # Laravel 12 API (PHP 8.2+, Sanctum, MySQL, Concurrency Engine)
├── frontend/         # Next.js 16 App Router (React 19, TypeScript, Tailwind CSS, TanStack Query, Auth.js)
├── docs/             # Technical specifications & API contract documentation
└── README.md         # Root documentation and local setup instructions
```

---

## Prerequisites

Ensure the following runtimes and tools are installed on your machine before starting:

- **PHP**: `^8.2` with extensions enabled: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `bcmath`, `curl`
- **Composer**: `^2.x`
- **Node.js**: `^18.x` or `^20.x` (LTS recommended)
- **npm**: `^10.x`
- **MySQL Server**: `^8.0` or MariaDB `^10.4`

---

## Local Setup: Step-by-Step Instructions

Follow these instructions to run both the Laravel backend API and the Next.js frontend concurrently.

### 1. Backend Setup (Laravel API)

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
```

#### Step 1.1: Install Dependencies
```bash
composer install
```

#### Step 1.2: Configure Environment Variables
Copy the example environment configuration:
```bash
cp .env.example .env
```
*(On Windows PowerShell, run: `copy .env.example .env`)*

Open `.env` and verify your MySQL database connection parameters:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=workshop_registration
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

#### Step 1.3: Generate Application Key
```bash
php artisan key:generate
```

#### Step 1.4: Prepare Database & Run Migrations with Seeds
Ensure the database exists in MySQL (e.g. `CREATE DATABASE workshop_registration;`), then run migrations and seed sample users and workshops:
```bash
php artisan migrate --seed
```
> **Tip:** If resetting your local database at any point, run `php artisan migrate:fresh --seed`.

#### Step 1.5: Start the Backend Server
```bash
php artisan serve
```
The API server will start at **`http://localhost:8000`** (or `http://127.0.0.1:8000`).

---

### 2. Frontend Setup (Next.js Application)

Open a second terminal window and navigate to the `frontend` directory:

```bash
cd frontend
```

#### Step 2.1: Install Dependencies
```bash
npm install
```

#### Step 2.2: Configure Environment Variables
Create your local environment file:
```bash
cp .env.example .env.local
```
*(On Windows PowerShell, run: `copy .env.example .env.local`)*

Ensure `.env.local` contains the following settings:
```env
# Auth.js secret key
AUTH_SECRET=development_secret_key_change_in_production_32chars

# Backend API URL (points to the Laravel /api route prefix)
API_URL=http://localhost:8000/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

#### Step 2.3: Start the Development Server
```bash
npm run dev
```
The Next.js application will start at **`http://localhost:3000`**.

Open your browser and visit:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## Default Seed Accounts & Credentials

The database seeders (`AdminSeeder` and `WorkshopSeeder`) populate three pre-configured accounts covering all permission levels.

All default accounts share the password: **`password`**

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `password` | Full system access: User management (create/edit/toggle status), Audit Logs inspection, Workshops management |
| **Manager** | `manager@example.com` | `password` | Workshop management (create/edit), Attendee registrations & cancellations, View capacity & attendee lists |
| **Staff** | `staff@example.com` | `password` | Attendee registrations & cancellations, View workshop schedules & attendee lists |

---

## Concurrency & Race-Condition Testing

The registration system uses database-level pessimistic locking (`SELECT ... FOR UPDATE`) inside transactions to guarantee that simultaneous registrations never exceed a workshop's capacity.

To execute the built-in parallel concurrency benchmark:

```bash
cd backend
php artisan concurrency:demo --capacity=20 --attempts=25
```

This command creates an isolated workshop with 20 seats, fires 25 parallel registration attempts simultaneously via background sub-processes, and prints a summary verifying that exactly 20 succeeded and 5 were rejected with `422 Workshop is full`.

---

## Running Automated Tests & Code Quality

### Backend Tests
```bash
cd backend
php artisan test
```

### Frontend Typechecking & Linting
```bash
cd frontend
npm run typecheck
npm run lint
```

---

## API Documentation

The complete REST API specification is documented in [`docs/API_CONTRACT.md`](file:///docs/API_CONTRACT.md), covering:
- Authentication (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`)
- User Management (`/api/users`)
- Workshops (`/api/workshops`)
- Registrations & Cancellations (`/api/workshops/{id}/registrations`, `/api/registrations/{id}/cancel`)
- Audit Trail (`/api/audit-logs`)

---

## System Assumptions

- **Audit Logs Access**: Audit log viewing (`GET /api/audit-logs`) is restricted to administrators (`role:admin`) as the brief's role-permission matrix does not delegate audit history inspection to managers or staff.
- **Registration Audit Exclusion**: Attendee registrations and cancellations are not duplicated in `audit_logs` because the append-only `registrations` table already provides the complete, authoritative historical record.
