# Stock Management System

A modular stock-management application using React + JavaScript + CSS, Node.js + Express REST API, Prisma ORM, and MySQL.

## Features
- JWT login and role-aware API middleware
- Dashboard KPIs
- Product, category, warehouse, supplier, and customer master data
- Inventory balances and immutable stock movement ledger
- Stock receiving, issuing, and adjustment endpoints
- Purchase orders and goods receiving
- Sales orders and dispatch
- Warehouse transfers (dispatch and receiving)
- API validation, pagination, audit logging, Swagger/OpenAPI
- Separate frontend/backend libraries and module folders
- Docker Compose for MySQL, API, and frontend
- Seeded administrator and demo data

## Requirements
- Node.js 20+
- Docker Desktop (recommended) OR MySQL 8+
- npm

## Quick start (Docker)
1. Copy `.env.example` to `.env`.
2. Change `JWT_SECRET` and the seeded admin password.
3. Run:
   ```bash
   docker compose up --build
   ```
4. Open frontend: http://localhost:5173
5. API docs: http://localhost:4000/api-docs
6. Default seeded login:
   - Email: `admin@example.com`
   - Password: `ChangeMe123!`
   Change this immediately after first login.

## Local development
### Backend
```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Set `VITE_API_URL=http://localhost:4000/api/v1` in `frontend/.env`.

## Important inventory rules
- Every confirmed stock change creates a `StockMovement`.
- Inventory updates run inside database transactions.
- Transfers are represented as dispatch from source and receipt into destination.
- This starter uses moving weighted-average costing for receipt valuation. FIFO batch valuation can be added in the valuation library.
- Validate tax, accounting, approval, and stock policies against your local business requirements before production use.

## Project structure
See `docs/architecture.md` and `docs/maintenance-guide.md`.
