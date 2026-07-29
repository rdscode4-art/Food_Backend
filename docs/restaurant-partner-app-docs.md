# Restaurant Partner App Documentation

This document outlines all the APIs and frontend implementation notes required to build the Fast Food Restaurant Partner App.

## Frontend Implementation Notes

1. **Pending Approval State:**
   - Restaurant owners must be approved by an Admin before they can manage their restaurant or receive orders.
   - Similar to delivery partners, if the user logs in and has `isApproved: false`, they should be directed to a "Pending Admin Approval" screen. Once approved, the `/api/owner/*` endpoints become accessible.

2. **Real-time Order Alerts (Websockets):**
   - Connect to the `ws://localhost:6030` socket server.
   - Emit a `join` event with `restaurant_<RESTAURANT_ID>` (the specific syntax can be tailored based on your socket initialization logic, currently it targets the user ID of the owner and potentially a restaurant room).
   - When a new order is placed, an `order_update` event will be emitted. The app should ideally play an audio chime and show a prominent alert to the staff to accept or reject the order immediately.

3. **Menu Management & Inventory:**
   - Menu items can be soft-deleted automatically if they exist in past orders.
   - Inventory tracking: You can pass `stockCount` and `autoDisableOnEmpty`. The backend deducts stock on order checkout automatically.

4. **Multi-Branch Support:**
   - A single owner can create multiple restaurants (branches) by sending the same `brandName`.
   - All management APIs (Menu, Orders, Dashboard, Coupons) now require `:restaurantId` in the path.

---

## API Reference

### 1. Authentication

**Signup (Restaurant Owner)**
```bash
curl -X POST http://localhost:6030/api/auth/signup/restaurant-owner \
-H "Content-Type: application/json" \
-d '{"name":"Jane Owner","email":"jane@example.com","password":"password123","phone":"7777777777","businessName":"Jane Burger Shop"}'
```

**Verify OTP**
```bash
curl -X POST http://localhost:6030/api/auth/verify-otp \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com","code":"1234","purpose":"signup"}'
```

**Login**
```bash
curl -X POST http://localhost:6030/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com","password":"password123"}'
```

**Forgot Password**
```bash
curl -X POST http://localhost:6030/api/auth/forgot-password \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com"}'
```

**Reset Password**
```bash
curl -X POST http://localhost:6030/api/auth/reset-password \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com","code":"1234","newPassword":"newpassword123"}'
```

**Refresh Token**
```bash
curl -X POST http://localhost:6030/api/auth/refresh-token \
-H "Cookie: refreshToken=YOUR_REFRESH_TOKEN"
```

**Logout**
```bash
curl -X POST http://localhost:6030/api/auth/logout \
-H "Authorization: Bearer <TOKEN>"
```

### 2. Restaurant Profile Management

**Create Restaurant Profile (Branch)**
```bash
curl -X POST http://localhost:6030/api/owner/restaurant \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"name":"Jane Burger Shop","brandName":"Jane Burgers","address":"456 Food Ave","location":{"type":"Point","coordinates":[77.2,28.7]},"deliveryFee":30,"minOrder":100,"deliveryRadius":10}'
```

**Get All Own Restaurants (Branches)**
```bash
curl -X GET http://localhost:6030/api/owner/restaurants \
-H "Authorization: Bearer <TOKEN>"
```

**Update Restaurant Details**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"deliveryTime":35}'
```

**Toggle Restaurant Active Status**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/toggle-active \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"status":"Open"}'
```

### 3. Menu Management

**Add Menu Item**
```bash
curl -X POST http://localhost:6030/api/owner/restaurant/<restaurantId>/menu \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"name":"Cheese Burger","price":150,"category":"Burgers","stockCount":50,"autoDisableOnEmpty":true,"isCombo":false}'
```

**Get Menu Items**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/menu \
-H "Authorization: Bearer <TOKEN>"
```

**Update Menu Item**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/menu/<itemId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"price": 160}'
```

**Delete Menu Item (Handles soft/hard delete automatically)**
```bash
curl -X DELETE http://localhost:6030/api/owner/restaurant/<restaurantId>/menu/<itemId> \
-H "Authorization: Bearer <TOKEN>"
```

**Toggle Item Availability (Out of stock)**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/menu/<itemId>/toggle-availability \
-H "Authorization: Bearer <TOKEN>"
```

### 4. Order Management (Strict State Machine)

**Get All Incoming Orders**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/orders \
-H "Authorization: Bearer <TOKEN>"
```

**Accept Order**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/accept \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"preparationTime": 20}'
```

**Reject Order (Triggers Refund)**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/reject \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"reason":"Item out of stock"}'
```

**Mark as Preparing**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/preparing \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Ready for Pickup (Releases job to Delivery Partners)**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/ready \
-H "Authorization: Bearer <TOKEN>"
```

### 5. Analytics

**Get Dashboard Stats**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/dashboard \
-H "Authorization: Bearer <TOKEN>"
```

### 6. Vendor Coupons

**Create a Vendor Coupon**
```bash
curl -X POST http://localhost:6030/api/owner/restaurant/<restaurantId>/coupons \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"code":"JANE20","discountType":"percentage","discountValue":20,"startDate":"2023-12-01T00:00:00Z","expiryDate":"2024-12-31T23:59:59Z"}'
```

**Get Vendor Coupons**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/coupons \
-H "Authorization: Bearer <TOKEN>"
```

**Update Vendor Coupon**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/coupons/<couponId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"isActive":false}'
```

**Delete Vendor Coupon**
```bash
curl -X DELETE http://localhost:6030/api/owner/restaurant/<restaurantId>/coupons/<couponId> \
-H "Authorization: Bearer <TOKEN>"
```

### 7. Vendor Settlements

**Get Settlement History**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/settlements \
-H "Authorization: Bearer <TOKEN>"
```

```bash
curl -X POST http://localhost:6030/api/owner/restaurant/<restaurantId>/settlements/generate \
-H "Authorization: Bearer <TOKEN>"
```

### 8. Phase 3 Additions (Micro-Details)

**Update Restaurant Profile (e.g. Preparation Time)**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"preparationTime": 15}'
```

**Set Low Stock Alerts for Menu Item**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/menu/<menuItemId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"lowStockAlert": true, "lowStockThreshold": 5}'
```

### 9. Dine-In & Table Management

**Get All Tables for Restaurant**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/tables \
-H "Authorization: Bearer <TOKEN>"
```

**Create a New Table**
```bash
curl -X POST http://localhost:6030/api/owner/restaurant/<restaurantId>/tables \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"tableNumber": "T-01", "capacity": 4}'
```

**Generate QR Code for Table Ordering**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/tables/<tableId>/qr \
-H "Authorization: Bearer <TOKEN>"
```

### 10. Reviews & Ratings

**Get All Customer Reviews**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/reviews \
-H "Authorization: Bearer <TOKEN>"
```

### 11. Sponsored Listings & Advertisements (PRD 36)

**View Active Advertisement Campaigns**
*(Note: Ad campaigns are created by Admins, but owners can view their active budgets and statuses here)*
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/advertisements \
-H "Authorization: Bearer <TOKEN>"
```

### 8. New Missing Endpoints

**Update / Delete Menu Item**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/menu/<itemId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"price": 14}'

curl -X DELETE http://localhost:6030/api/owner/restaurant/<restaurantId>/menu/<itemId> \
-H "Authorization: Bearer <TOKEN>"
```

**Toggle Menu Item Availability**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/menu/<itemId>/toggle-availability \
-H "Authorization: Bearer <TOKEN>"
```

**Update Order Status (Accept, Reject, Preparing, Ready)**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/accept -H "Authorization: Bearer <TOKEN>"
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/reject -H "Authorization: Bearer <TOKEN>"
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/preparing -H "Authorization: Bearer <TOKEN>"
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/orders/<orderId>/ready -H "Authorization: Bearer <TOKEN>"
```

**Get Table QR**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/<restaurantId>/tables/<tableId>/qr \
-H "Authorization: Bearer <TOKEN>"
```

**Update / Delete Coupon**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/<restaurantId>/coupons/<couponId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"discountValue": 25}'

curl -X DELETE http://localhost:6030/api/owner/restaurant/<restaurantId>/coupons/<couponId> \
-H "Authorization: Bearer <TOKEN>"
```
