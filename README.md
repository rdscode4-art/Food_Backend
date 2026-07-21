# Fast Food Marketplace Backend

A complete Node.js + Express + MongoDB backend powering a three-app ecosystem: 
1. **Consumer App**
2. **Delivery Partner App**
3. **Restaurant Partner App**

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your values (MongoDB URI, JWT secrets, SMTP credentials, etc).
3. **Seed the Database:**
   Run the seeder to populate the database with categories, restaurants, menu items, and test users.
   ```bash
   node src/seed.js
   ```
4. **Start the Server:**
   ```bash
   npm run dev
   ```

## Test Credentials (from Seed)

- **Admin:** `admin@fastfood.com` / `password123`
- **Restaurant Owner 1:** `john@burgerking.com` / `password123`
- **Restaurant Owner 2:** `mario@pizzahut.com` / `password123`
- **Delivery Partner 1:** `raju@delivery.com` / `password123`
- **Delivery Partner 2:** `sham@delivery.com` / `password123`
*(Note: Customers use OTP signup, but you can create one via `POST /api/auth/signup`)*

---

## Order State Machine Diagram

The core of the system is a strict Order state machine to prevent race conditions across the 3 apps.

```text
                  [ CUSTOMER PLACES ORDER ]
                              │
                              ▼
                         ( placed )
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                            │
        ▼                                            ▼
   ( accepted )                                ( rejected )
        │                                       [ TERMINAL ]
        ▼                                      (Refund Mocked)
  ( preparing )
        │
        ▼
( ready_for_pickup )
        │
        ▼
   ( assigned )
        │
        ▼
  ( picked_up )
        │
        ▼
( out_for_delivery )
        │
        ▼
   ( delivered )
   [ TERMINAL ]
 (Payout Created)
```
*(Customer can also trigger `cancelled` if the status is still `placed`)*

---

## Full API List

### Auth (`/api/auth`)
- `POST /signup` - Standard customer signup
- `POST /signup/restaurant-owner`
- `POST /signup/delivery-partner`
- `POST /verify-otp`
- `POST /resend-otp`
- `POST /login`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /refresh-token`
- `POST /logout`

### Discovery & Menu (`/api/restaurants` & `/api/menu`)
- `GET /restaurants/categories`
- `GET /restaurants/featured`
- `GET /restaurants/fastest`
- `GET /restaurants/popular`
- `GET /restaurants/:id`
- `GET /menu/:restaurantId`
- `GET /menu/item/:itemId`
- `GET /restaurants/search`

### Customer Core (`/api/user`, `/api/cart`, `/api/wishlist`, `/api/order`)
- `GET /user/profile`, `PUT /user/profile`
- `GET /user/addresses`, `POST /user/addresses`, `PUT /user/addresses/:id`, `DELETE /user/addresses/:id`
- `GET /user/payment-methods`, `POST /user/payment-methods`, `DELETE /user/payment-methods/:id`
- `GET /cart`, `POST /cart`, `PUT /cart`, `DELETE /cart/:id`
- `GET /wishlist`, `POST /wishlist/toggle`
- `POST /order/checkout`
- `GET /order`, `GET /order/:id`
- `PUT /order/:id/cancel`
- `GET /order/:id/track` (Real-time Delivery Partner GPS fetch)
- `POST /order/:id/review`
- `GET /order/:id/help`
- `POST /payments/mock-charge`

### Restaurant Partner (`/api/owner`)
- `POST /restaurant`, `GET /restaurant`, `PUT /restaurant`, `PUT /restaurant/toggle-active`
- `GET /restaurant/menu`, `POST /restaurant/menu`, `PUT /restaurant/menu/:itemId`, `DELETE /restaurant/menu/:itemId`, `PUT /restaurant/menu/:itemId/toggle-availability`
- `GET /dashboard` (Complex Aggregations)
- `GET /orders`, `GET /orders/:id`
- `PUT /orders/:id/accept`
- `PUT /orders/:id/reject`
- `PUT /orders/:id/preparing`
- `PUT /orders/:id/ready`

### Delivery Partner (`/api/partner`)
- `PUT /online-status`
- `PUT /location` (Syncs live to active Orders)
- `GET /orders/available`
- `PUT /orders/:id/accept`
- `PUT /orders/:id/picked-up`
- `PUT /orders/:id/out-for-delivery`
- `PUT /orders/:id/deliver` (Triggers Payout generation)
- `GET /payouts/summary`
- `GET /payouts/history`

### Admin & Static (`/api/admin`, `/api/static`)
- `GET /admin/restaurant-owners/pending`, `PUT /admin/restaurant-owners/:id/approve`, `PUT /admin/restaurant-owners/:id/reject`
- `GET /admin/delivery-partners/pending`, `PUT /admin/delivery-partners/:id/approve`, `PUT /admin/delivery-partners/:id/reject`
- `GET /admin/restaurants/pending`, `PUT /admin/restaurants/:id/approve`, `PUT /admin/restaurants/:id/reject`
- `GET /admin/stats`
- `PUT /admin/users/:id/suspend`, `PUT /admin/users/:id/unsuspend`
- `GET /static/contact-us`, `GET /static/help-faq`
