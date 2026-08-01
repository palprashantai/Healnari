# Business Backend API

A robust backend API built with **NestJS**, **MySQL**, and **Sequelize ORM**. 

It dynamically generates beautifully styled Excel and CSV files when users ask to download reports, and provides complete REST APIs for data management.

---

## 🛠️ Features

- **NestJS Architecture**: Highly organized module-controller-service pattern.
- **Dynamic Excel & CSV Exporter**: Generates flat, formatted files from complex nested database tables automatically:
  - zebra-striped, auto-fit Excel sheets (using `exceljs`).
  - RFC 4180 quote-escaped, tab-flattened CSV files.
- **Aggregated Business Charts APIs**: Specialized aggregates optimized for frontend dashboard charting libraries (revenue monthly trend, category sales share, category stock levels, customer cities, order statuses). Includes a high-performance combined `dashboard-summary` endpoint.
- **REST APIs**: Full implementation of endpoints (`/api/products`, `/api/orders`, `/api/reports/sales`) with robust pagination, sorting, filter, and export parameter support.
- **Robust Error Handling & Security**: Passwords hashed with `bcrypt`, endpoints protected by JWT validation, parameterized database queries.

---

## 📂 Project Structure
```text
├── config/
│   ├── db.config.js       # Sequelize DB connection details
│   └── swagger.js         # Extended Swagger Open API 3.0 specs
├── controllers/
│   ├── auth.controller.js # Admin Authentication
│   ├── chart.controller.js # Business charts analytics data aggregations
│   ├── product.controller.js # Products retrieval REST API
│   ├── order.controller.js   # Orders retrieval REST API
│   └── report.controller.js  # Sales Reports REST API (Paginated, Sorted & Exportable)
├── middleware/
│   ├── auth.middleware.js # Bearer JWT validation & role check
│   └── error.middleware.js # Central error & Sequelize exception formatting
├── models/
│   ├── index.js           # Sequelize initialization & association setup
│   ├── user.model.js      # User model definition
│   ├── product.model.js   # Product model definition
│   ├── customer.model.js  # Customer model definition
│   ├── order.model.js     # Order model definition
│   ├── orderItem.model.js # OrderItem model definition
│   └── sale.model.js      # Sale model definition
├── routes/
│   ├── auth.routes.js     # Authentication routes
│   ├── chart.routes.js    # Dashboard aggregation analytics routes
│   ├── product.routes.js  # Product REST API (secured)
│   ├── order.routes.js    # Order REST API (secured)
│   └── report.routes.js   # Reports REST API (secured)
├── seeders/
│   └── seed.js            # Table sync & database test-data seeder script
├── services/
│   ├── db.service.js      # Dynamic Sequelize ORM query mapper
│   ├── csv.service.js     # Zero-dependency RFC 4180 CSV builder
│   └── excel.service.js   # Flat Excel generator using ExcelJS
├── .env.example           # Environment template configurations
├── app.js                 # Application startup
├── package.json           # Dependencies and scripts configuration
└── Business.postman_collection.json # Extended Postman Collection
```

---

## ⚡ Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MySQL Server** (running locally or remotely)

### 2. Install Dependencies
Clone the repository and run:
```bash
npm install
```

### 3. Environment Setup
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your credentials:
```ini
# Port and Mode
PORT=5000
NODE_ENV=development

# MySQL DB Settings
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=business_db

# JWT Secrets
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h
```

### 4. Database Setup & Seeding
This project comes with an automated seeder that:
1. Connects to your MySQL server.
2. Creates the schema database if it doesn't exist.
3. Synchronizes and creates all required tables.
4. Populates realistic test data.

To initialize the database and seed the tables, run:
```bash
npm run db:init
```

---

## 🚀 Running the App
Start the development server with live reload:
```bash
npm run dev
```
For production:
```bash
npm start
```
The server will boot and verify database connectivity, listening on port `5000` (or your configured port).

---

## 📖 Swagger API Documentation
Once the server is running, you can access the interactive Swagger OpenAPI 3.0 documentation page directly at:
👉 **[http://localhost:5000/api-docs](http://localhost:5000/api-docs)**

This interactive UI has been fully extended to document the aggregation analytics paths, pagination/sorting fields, and Excel/CSV download parameters!

---

## 🧪 Testing the APIs (Postman)
1. Open Postman.
2. Click **Import** and select the collection file inside the project root folder.
3. First execute the **Admin Login** request. The test script in the collection will automatically extract the JWT token and save it to your Postman global variables (`admin_token`).
4. You can now execute any of the pre-loaded **Dashboard charts**, or **REST APIs** without needing to manually copy-paste the token!

### Credentials for Admin Login:
- **Email**: `admin@example.com`
- **Password**: `password123`

---

## 📑 API Endpoints Documentation

### 1. Authentication
* **POST `/api/auth/login`**
  * Body: `{"email": "admin@example.com", "password": "password123"}`
  * Response: Standard JWT Token + Admin profile detail.

### 2. Business Analytics Charts (Protected)
* **GET `/api/reports/charts/dashboard-summary`**
  * Returns core KPI summaries and aggregated revenue trends, category sales, stock distributions, customer geographic share, and order shares in a single payload.
* **GET `/api/reports/charts/revenue-trend`**
* **GET `/api/reports/charts/category-sales`**
* **GET `/api/reports/charts/stock-levels`**
* **GET `/api/reports/charts/customer-cities`**
* **GET `/api/reports/charts/order-distribution`**

### 3. REST APIs (Protected)
* **GET `/api/products`**
  * Query parameters: `category`, `minPrice`, `maxPrice`, `page`, `limit`, `sortBy`, `sortOrder`
* **GET `/api/orders`**
  * Query parameters: `status`, `page`, `limit`, `sortBy`, `sortOrder`
* **GET `/api/reports/sales`**
  * Query parameters: `startDate`, `endDate`, `page`, `limit`, `sortBy`, `sortOrder`, `format` (`excel` | `csv`)
