# Restaurant Partner App Documentation

This document outlines all APIs required to build the Vendor/Restaurant Partner App.
Base URL: `https://foodbackend.ridealdigitalseva.com`
All protected routes require: `Authorization: Bearer <TOKEN>`

---

## Frontend Implementation Notes

1. **Pending Approval State:**
   - After signup, owner must be approved by Admin before accessing management APIs.
   - On login, if `isApproved: false`, show a "Pending Admin Approval" screen.
   - Only `/api/owner/profile` and `/api/owner/restaurant` (POST) work before approval.

2. **Real-time Order Alerts (WebSockets):**
   - Connect to `wss://foodbackend.ridealdigitalseva.com`
   - Emit: `socket.emit('join', 'restaurant_<RESTAURANT_ID>')`
   - Listen for: `new_order` (play chime + show alert), `order_cancelled`
   - Low stock: `low_stock_alert` event fires when menu item stock falls below threshold.

3. **Multi-Branch Support:**
   - One owner can manage multiple restaurants (branches).
   - All management APIs require `:restaurantId` in the URL path.

4. **Image Upload Flow:**
   - Step 1: Upload image ? get URL back.
   - Step 2: Save that URL in menu item / restaurant profile `image` field.

---

## API Reference

### 1. Authentication

**Signup (Restaurant Owner)**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/signup/restaurant-owner \
-H "Content-Type: application/json" \
-d '{"name":"Jane Owner","email":"jane@example.com","password":"password123","phone":"7777777777","businessName":"Jane Burger Shop"}'
```

**Verify OTP**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/verify-otp \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com","code":"1234","purpose":"signup"}'
```

**Login**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com","password":"password123"}'
```

> Response includes `token` (access token) and `refreshToken`. Store both.

**Forgot Password**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/forgot-password \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com"}'
```

**Reset Password**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/reset-password \
-H "Content-Type: application/json" \
-d '{"email":"jane@example.com","code":"1234","newPassword":"newpassword123"}'
```

**Refresh Token**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/refresh-token \
-H "Cookie: refreshToken=YOUR_REFRESH_TOKEN"
```

**Logout**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/logout \
-H "Authorization: Bearer <TOKEN>"
```

---

### 2. Owner Profile & Restaurant Management

**Get Owner Profile** *(No approval required)*
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/profile \
-H "Authorization: Bearer <TOKEN>"
```

**Create Restaurant / Branch** *(No approval required)*
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/owner/restaurant \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{
  "name": "Jane Burger Shop",
  "brandName": "Jane Burgers",
  "address": "456 Food Ave, Delhi",
  "location": {"type":"Point","coordinates":[77.2,28.7]},
  "deliveryFee": 30,
  "minOrder": 100,
  "deliveryRadius": 10,
  "cuisine": ["Fast Food","Burgers"],
  "phone": "9876543210"
}'
```

> Returns restaurant object with `_id`. Save this as `restaurantId` for all further calls.

**Get All Own Restaurants (Branches)** *(No approval required)*
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurants \
-H "Authorization: Bearer <TOKEN>"
```

**Update Restaurant Details** *(Requires approval)*
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"deliveryTime":35,"deliveryFee":40,"minOrder":150,"preparationTime":15}'
```

**Toggle Restaurant Open/Closed Status** *(Requires approval)*
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/toggle-active \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"isActive": true}'
```

---

### 3. Menu Management *(Requires approval)*

**Add Menu Item**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/menu \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{
  "name": "Cheese Burger",
  "price": 150,
  "category": "Burgers",
  "description": "Juicy beef patty with cheese",
  "stockCount": 50,
  "autoDisableOnEmpty": true,
  "lowStockAlert": true,
  "lowStockThreshold": 5,
  "isCombo": false,
  "image": "https://foodbackend.ridealdigitalseva.com/public/uploads/burger.jpg"
}'
```

**Get All Menu Items**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/menu \
-H "Authorization: Bearer <TOKEN>"
```

**Update Menu Item**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/menu/<itemId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"price": 160, "stockCount": 40, "lowStockThreshold": 5}'
```

**Delete Menu Item** *(Soft-deletes if item has past orders)*
```bash
curl -X DELETE https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/menu/<itemId> \
-H "Authorization: Bearer <TOKEN>"
```

**Toggle Item Availability (Mark as Out of Stock)**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/menu/<itemId>/toggle-availability \
-H "Authorization: Bearer <TOKEN>"
```

---

### 4. Order Management *(Requires approval)*

Order State Machine: `placed` ? `accepted` ? `preparing` ? `ready_for_pickup` ? `delivered` / `cancelled`

**Get All Orders (with optional status filter)**
```bash
curl -X GET "https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/orders" \
-H "Authorization: Bearer <TOKEN>"

# Filter by status:
curl -X GET "https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/orders?status=placed" \
-H "Authorization: Bearer <TOKEN>"
```

**Accept Order**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/orders/<orderId>/accept \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"preparationTime": 20}'
```

**Reject Order** *(Auto-triggers refund)*
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/orders/<orderId>/reject \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"reason": "Item out of stock"}'
```

**Mark as Preparing**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/orders/<orderId>/preparing \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Ready for Pickup** *(Notifies delivery partners)*
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/orders/<orderId>/ready \
-H "Authorization: Bearer <TOKEN>"
```

**Cancel Order** *(Owner-initiated cancel)*
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/orders/<orderId>/cancel \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"reason": "Kitchen closed unexpectedly"}'
```

---

### 5. Dashboard & Analytics *(Requires approval)*

**Get Dashboard Stats**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/dashboard \
-H "Authorization: Bearer <TOKEN>"
```

> Response includes: `totalOrders`, `totalRevenue`, `pendingOrders`, `todayOrders`, `topSellingItems`, `recentOrders`

---

### 6. Vendor Coupons *(Requires approval)*

**Create Coupon**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/coupons \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{
  "code": "JANE20",
  "discountType": "percentage",
  "discountValue": 20,
  "startDate": "2024-01-01T00:00:00Z",
  "expiryDate": "2024-12-31T23:59:59Z",
  "minOrderAmount": 200,
  "maxUses": 100
}'
```

**Get All Coupons**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/coupons \
-H "Authorization: Bearer <TOKEN>"
```

**Update Coupon**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/coupons/<couponId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"isActive": false, "discountValue": 25}'
```

**Delete Coupon**
```bash
curl -X DELETE https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/coupons/<couponId> \
-H "Authorization: Bearer <TOKEN>"
```

---

### 7. Settlements *(Requires approval)*

**Get Settlement History**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/settlements \
-H "Authorization: Bearer <TOKEN>"
```

**Generate Settlement Report**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/settlements/generate \
-H "Authorization: Bearer <TOKEN>"
```

---

### 8. Dine-In & Table Management *(Requires approval)*

**Get All Tables**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/tables \
-H "Authorization: Bearer <TOKEN>"
```

**Create Table**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/tables \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"tableNumber": "T-01", "capacity": 4}'
```

**Get QR Code for Table** *(For QR-based ordering)*
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/tables/<tableId>/qr \
-H "Authorization: Bearer <TOKEN>"
```

---

### 9. Reviews & Ratings *(Requires approval)*

**Get All Customer Reviews**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/reviews \
-H "Authorization: Bearer <TOKEN>"
```

---

### 10. Advertisements *(Requires approval)*

**View Active Ad Campaigns** *(Ads are created by Admin, owners can view)*
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/advertisements \
-H "Authorization: Bearer <TOKEN>"
```

---

### 11. Inventory / Raw Materials *(Requires approval)*

**Get Inventory**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/inventory \
-H "Authorization: Bearer <TOKEN>"
```

**Add Inventory Item**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/inventory \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"name": "Tomato", "unit": "kg", "stockCount": 50, "reorderLevel": 10, "supplier": "Local Farm"}'
```

**Update Inventory Item**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/owner/restaurant/<restaurantId>/inventory/<itemId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"stockCount": 45, "supplier": "Fresh Market"}'
```

---

### 12. Image Upload

**Upload Image** *(Returns public URL to use in menu/restaurant profile)*
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/owner/upload-image \
-H "Authorization: Bearer <TOKEN>" \
-F "file=@/path/to/image.jpg"
```

> **Response:**
> ```json
> { "success": true, "data": { "url": "https://foodbackend.ridealdigitalseva.com/public/uploads/image-123.jpg" } }
> ```
> Use this `url` in subsequent API calls as the `image` field.

---

## WebSocket Events Reference

| Event (Listen) | When | Payload |
|---|---|---|
| `new_order` | Customer places order | `{ orderId, items, totalAmount, customerName }` |
| `order_cancelled` | Customer/Admin cancels | `{ orderId, reason }` |
| `order_status_changed` | Status updated | `{ orderId, status }` |
| `low_stock_alert` | Item stock below threshold | `{ menuItemId, name, stockCount }` |

**Connect & Join Room:**
```javascript
const socket = io('wss://foodbackend.ridealdigitalseva.com');
socket.emit('join', 'restaurant_<RESTAURANT_ID>');
```
