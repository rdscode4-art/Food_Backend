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

3. **Menu Management Soft-Deletes:**
   - When an owner tries to delete a menu item (`DELETE /api/owner/restaurant/menu/:itemId`), the API determines if it should be hard-deleted or soft-deleted (marked `isAvailable: false`) based on whether it appears in past orders to preserve order history integrity.

4. **Dashboard Data:**
   - The `/api/owner/dashboard` endpoint returns pre-calculated aggregation pipelines for total revenue, active orders, and top-selling items. Use this data to render charts (e.g., Chart.js or Recharts).

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

### 2. Restaurant Profile Management

**Create Restaurant Profile (Once per owner)**
```bash
curl -X POST http://localhost:6030/api/owner/restaurant \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"name":"Jane Burger Shop","address":"456 Food Ave","location":{"type":"Point","coordinates":[77.2,28.7]},"deliveryFee":30,"minOrder":100}'
```

**Get Restaurant Profile**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant \
-H "Authorization: Bearer <TOKEN>"
```

**Update Restaurant Details**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"deliveryTime":35}'
```

**Toggle Restaurant Active Status (Pause incoming orders)**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/toggle-active \
-H "Authorization: Bearer <TOKEN>"
```

### 3. Menu Management

**Add Menu Item**
```bash
curl -X POST http://localhost:6030/api/owner/restaurant/menu \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"name":"Cheese Burger","price":150,"category":"Burgers"}'
```

**Get Menu Items**
```bash
curl -X GET http://localhost:6030/api/owner/restaurant/menu \
-H "Authorization: Bearer <TOKEN>"
```

**Delete Menu Item (Handles soft/hard delete automatically)**
```bash
curl -X DELETE http://localhost:6030/api/owner/restaurant/menu/<itemId> \
-H "Authorization: Bearer <TOKEN>"
```

**Toggle Item Availability (Out of stock)**
```bash
curl -X PUT http://localhost:6030/api/owner/restaurant/menu/<itemId>/toggle-availability \
-H "Authorization: Bearer <TOKEN>"
```

### 4. Order Management (Strict State Machine)

**Get All Incoming Orders**
```bash
curl -X GET http://localhost:6030/api/owner/orders \
-H "Authorization: Bearer <TOKEN>"
```

**Accept Order**
```bash
curl -X PUT http://localhost:6030/api/owner/orders/<orderId>/accept \
-H "Authorization: Bearer <TOKEN>"
```

**Reject Order (Triggers Refund)**
```bash
curl -X PUT http://localhost:6030/api/owner/orders/<orderId>/reject \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"reason":"Item out of stock"}'
```

**Mark as Preparing**
```bash
curl -X PUT http://localhost:6030/api/owner/orders/<orderId>/preparing \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Ready for Pickup (Releases job to Delivery Partners)**
```bash
curl -X PUT http://localhost:6030/api/owner/orders/<orderId>/ready \
-H "Authorization: Bearer <TOKEN>"
```

### 5. Analytics

**Get Dashboard Stats**
```bash
curl -X GET http://localhost:6030/api/owner/dashboard \
-H "Authorization: Bearer <TOKEN>"
```
