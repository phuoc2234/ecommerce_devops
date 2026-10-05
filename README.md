E-Commerce Website
A simple, full-featured e-commerce web application built with Node.js, Express, EJS and MySQL. It includes product management, shopping cart, checkout, user authentication, order management, and an admin dashboard.

# E-Commerce Website

A server-rendered e-commerce application built with Node.js, Express, EJS,
Sequelize, and MySQL. The application provides product browsing, authentication,
shopping cart and checkout flows, order history, and an admin dashboard.

## Features

- User registration and login
- Product and category management for administrators
- Shopping cart and checkout
- Order history and order details
- Product image uploads in `public/uploads/products`
- Admin management for products, categories, inventory, and orders
- Automatic database schema synchronization and starter data on startup

## Tech Stack

- Node.js and Express
- EJS templates
- MySQL with Sequelize
- Bootstrap 5
- Multer for image uploads

## Prerequisites

- Node.js 18 or newer
- MySQL running locally or on a reachable server
- A MySQL database created for the application

## Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd E_Commerce
   npm install
   ```

2. Create a `.env` file in the project root:

   ```dotenv
   PORT=3000
   SESSION_SECRET=replace-with-a-long-random-value
   DB_NAME=warehouses_db
   DB_USER=root
   DB_PASS=root
   DB_HOST=127.0.0.1
   DB_DIALECT=mysql
   DB_PORT=3307
   ```

   Change the database values to match your MySQL installation. The application
   reads these variables from `.env` when it starts.

3. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), or the URL using the
   port configured in `PORT`.

## API Documentation

Open `/api-docs` on the running server to browse routes grouped by the Admin,
Auth, Cart, Orders, Profile, and User routers. Swagger lists each route's HTTP
method and indicates whether it returns JSON, renders an HTML page, or redirects.
Protected routes require an authenticated session; sign in to the application
first and use the same browser session when making requests from Swagger UI.

On startup, the application synchronizes the Sequelize models and creates the
default accounts and starter products/categories when they do not already exist.
You do not need to run Sequelize CLI migrations or seeders for the normal local
setup.

## Default Accounts

The startup seeder creates these accounts if they do not exist:

| Role  | Email               | Password   |
| ----- | ------------------- | ---------- |
| Admin | `admin@example.com` | `admin123` |
| User  | `user@example.com`  | `user123`  |

Change or remove these credentials before deploying outside a local development
environment.

## Project Structure

```text
app.js                 Application entry point
config/                Database configuration
controllers/           Request handlers
models/                Sequelize models
routes/                Express route definitions
seeders/               Startup seed data
views/                 EJS templates
public/                Static assets and uploaded product images
```

## Available Commands

```bash
npm run dev             Start the server with Nodemon
```

The project currently does not define an `npm start` script.
<<<<<<< HEAD
=======

## SQL Server / SSMS (local SQL Server Express)

SSMS is the management application; the actual database service is Microsoft
SQL Server. This project can use SQL Server after installing the `tedious`
driver. The repository includes `.env.sqlserver.example` with the connection
settings for a local `SQLEXPRESS` instance.

1. In SSMS, connect to `localhost\\SQLEXPRESS` using Windows Authentication.
2. Create a SQL Server login and database user (replace the example password
   before executing):

   ```sql
   CREATE LOGIN ecommerce_app WITH PASSWORD = 'Use-A-Long-Unique-Password!';
   GO
   CREATE DATABASE warehouses_db;
   GO
   USE warehouses_db;
   GO
   CREATE USER ecommerce_app FOR LOGIN ecommerce_app;
   ALTER ROLE db_owner ADD MEMBER ecommerce_app;
   GO
   ```

3. Copy the variables from `.env.sqlserver.example` into `.env`, use the same
   password in `DB_PASS`, then run `npm.cmd run dev` from PowerShell.

On first startup Sequelize creates the tables and the application seeders add
the default accounts, categories, and products. Do not run the SQL files in
`backup/` in SSMS: they are MySQL exports, not SQL Server scripts.
>>>>>>> 6996f48 (Initial commit - Phuoc Store)
