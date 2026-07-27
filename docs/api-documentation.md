# API Documentation

The Rideal Multi-Vendor Food Delivery Platform exposes a RESTful JSON API.

## Base URL
`https://api.yourdomain.com/api`

## Authentication
All protected routes require a JWT bearer token passed in the `Authorization` header.
`Authorization: Bearer <token>`

---

## 1. Auth Routes (`/api/auth`)
- `POST /register`: Register a new user (Customer, Owner, Driver).
- `POST /login`: Authenticate and receive a JWT.
- `GET /me`: Get the current logged-in user's profile.

## 2. Customer Routes (`/api/users`)
- `PUT /profile`: Update customer profile.
- `GET /wallet`: Retrieve wallet balance and transaction history.
- `POST /address`: Add a new delivery address.

## 3. Restaurant Discovery (`/api/restaurants`)
- `GET /`: Search and filter restaurants by location, category, and rating.
- `GET /:id`: Get specific restaurant details and menu items.
- `GET /featured`: Retrieve featured/sponsored restaurants.

## 4. Order Management (`/api/orders`)
- `POST /checkout`: Create a new order (handles fee calculation and inventory deduction).
- `GET /`: List customer's previous orders.
- `GET /:id`: Get specific order details and live tracking status.
- `POST /:id/cancel`: Cancel an order and process wallet refunds.

## 5. Vendor Dashboard (`/api/owner`)
- `GET /dashboard`: Fetch daily/weekly sales analytics.
- `GET /orders`: View pending and active orders.
- `PUT /orders/:id/status`: Update order status (e.g., `Food Ready`).
- `POST /menu`: Add a new menu item to the restaurant catalog.
- `GET /settlements`: View historical settlements and payouts.

## 6. Delivery Partner (`/api/driver`)
- `GET /dashboard`: View earnings, online status, and active deliveries.
- `PUT /status`: Toggle `Online`/`Offline` status.
- `GET /orders/available`: Fetch available orders within the driver's zone (Fallback if Auto-Assignment fails).
- `PUT /orders/:id/accept`: Accept an assigned delivery request.
- `PUT /orders/:id/verify`: Verify delivery via Customer OTP or Digital QR Code.

## 7. Super Admin (`/api/admin`)
- `GET /dashboard`: Platform-wide analytics (Total Revenue, Active Drivers, Live Orders).
- `GET /users/pending`: View unapproved Vendor/Driver KYC registrations.
- `PUT /users/:id/approve`: Approve vendor or driver accounts.
- `POST /config/delivery`: Update global delivery charge engine rules.
- `GET /orders/export`: Download order history as a CSV file.

## Error Handling
The API uses standard HTTP status codes:
- `200 OK`: Success
- `201 Created`: Resource successfully created
- `400 Bad Request`: Invalid input or validation error
- `401 Unauthorized`: Missing or invalid JWT
- `403 Forbidden`: Insufficient permissions (Role-Based Access Control)
- `404 Not Found`: Resource does not exist
- `500 Internal Server Error`: Backend exception
