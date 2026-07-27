# Consumer App Documentation

This document outlines all the APIs and frontend implementation notes required to build the Fast Food Consumer App.

## Frontend Implementation Notes

1. **Authentication State:**
   - Store the `accessToken` in memory or secure storage. Attach it as a `Bearer` token to the `Authorization` header for all protected requests.
   - The `refreshToken` is handled automatically via HTTP-only cookies.
   - **OTP Flow:** The signup process has two steps. Step 1: `POST /signup`. Step 2: Navigate to an OTP verification screen and call `POST /verify-otp`.

2. **Real-time Order Updates (Socket.io):**
   - Connect to the socket server at `ws://localhost:5000`.
   - On successful login, emit a `join` event with the user's `_id` so the server knows where to send direct notifications.
   - Listen for the `order_update` event to show toast notifications and automatically refetch order details/status.

3. **Live Order Tracking:**
   - For an active order, poll `GET /api/order/:id/track` every 5-10 seconds OR rely on socket events to update the delivery partner's marker on a map view.
   - Use a mapping library (e.g., Google Maps, Mapbox, Leaflet) to plot the restaurant location, the user's delivery address, and the `deliveryPartner.currentLocation.coordinates`.

4. **Cart Management:**
   - Cart state is tied to a single restaurant. If the user tries to add an item from a different restaurant, the API will return a 409 Conflict. Prompt the user: "Clear cart and add this item?" If yes, call `DELETE /api/cart` first, then add the new item.

5. **Mock Payment Flow:**
   - After `POST /api/order/checkout`, the server generates an order with `paymentStatus = "pending"`.
   - The app should immediately call `POST /api/payments/mock-charge` with the new `orderId`. If it succeeds, the order is ready for the restaurant. If it fails, show an error and prompt to retry payment.

---

## Comprehensive API Reference

### 1. Authentication (`/api/auth`)

**Signup**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
-H "Content-Type: application/json" \
-d '{"name":"John Doe","email":"john@example.com","password":"password123","phone":"9999999999"}'
```

**Verify OTP**
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","code":"1234","purpose":"signup"}'
```

**Resend OTP**
```bash
curl -X POST http://localhost:5000/api/auth/resend-otp \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","purpose":"signup"}'
```

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","password":"password123"}'
```

**Forgot Password**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com"}'
```

**Reset Password**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","code":"1234","newPassword":"newpassword123"}'
```

**Refresh Token (uses HTTP-only cookie)**
```bash
curl -X POST http://localhost:5000/api/auth/refresh-token
```

**Logout Current Device**
```bash
curl -X POST http://localhost:5000/api/auth/logout \
-H "Authorization: Bearer <TOKEN>"
```

**Logout All Devices**
```bash
curl -X POST http://localhost:5000/api/auth/logout-all \
-H "Authorization: Bearer <TOKEN>"
```

### 2. User Profile & Addresses (`/api/user`)

**Get Profile**
```bash
curl -X GET http://localhost:5000/api/user/profile \
-H "Authorization: Bearer <TOKEN>"
```

**Update Profile**
```bash
curl -X PUT http://localhost:5000/api/user/profile \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"name":"John Updated"}'
```

**Get All Addresses**
```bash
curl -X GET http://localhost:5000/api/user/addresses \
-H "Authorization: Bearer <TOKEN>"
```

**Create Address**
```bash
curl -X POST http://localhost:5000/api/user/addresses \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"label":"Home","street":"123 Main St","city":"Metro","zip":"10001","fullAddress":"123 Main St, Metro 10001","location":{"type":"Point","coordinates":[77.1,28.6]}}'
```

**Update Address**
```bash
curl -X PUT http://localhost:5000/api/user/addresses/<addressId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"isDefault":true}'
```

**Delete Address**
```bash
curl -X DELETE http://localhost:5000/api/user/addresses/<addressId> \
-H "Authorization: Bearer <TOKEN>"
```

**Get Payment Methods**
```bash
curl -X GET http://localhost:5000/api/user/payment-methods \
-H "Authorization: Bearer <TOKEN>"
```

**Add Payment Method**
```bash
curl -X POST http://localhost:5000/api/user/payment-methods \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"type":"card","details":"4242"}'
```

**Delete Payment Method**
```bash
curl -X DELETE http://localhost:5000/api/user/payment-methods/<paymentMethodId> \
-H "Authorization: Bearer <TOKEN>"
```

### 3. Discovery & Menu (`/api/restaurants` & `/api/menu`)

**Get Categories**
```bash
curl -X GET http://localhost:5000/api/restaurants/categories
```

**Get Featured Restaurants**
```bash
curl -X GET http://localhost:5000/api/restaurants/featured
```

**Get Fastest Restaurants**
```bash
curl -X GET http://localhost:5000/api/restaurants/fastest
```

**Get Popular Restaurants**
```bash
curl -X GET http://localhost:5000/api/restaurants/popular
```

**Search Restaurants (Advanced)**
```bash
curl -X GET "http://localhost:5000/api/restaurants/search?q=burger&isVeg=true&minRating=4&freeDelivery=true&sort=delivery_time" \
-H "Authorization: Bearer <TOKEN>"
```

**Get Restaurant Detail**
```bash
curl -X GET http://localhost:5000/api/restaurants/<restaurantId>
```

**Get Menu for Restaurant**
```bash
curl -X GET http://localhost:5000/api/menu/<restaurantId>
```

**Get Specific Menu Item Detail**
```bash
curl -X GET http://localhost:5000/api/menu/item/<itemId>
```

### 4. Cart (`/api/cart`)

**Get Current Cart**
```bash
curl -X GET http://localhost:5000/api/cart \
-H "Authorization: Bearer <TOKEN>"
```

**Add Item to Cart**
*(Note: Automatically calculates taxes, platformFee, smallOrderFee, and surgeFee)*
```bash
curl -X POST http://localhost:5000/api/cart \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"menuItemId":"<menuId>","quantity":1}'
```

**Update Cart Item Quantity**
```bash
curl -X PUT http://localhost:5000/api/cart/<menuItemId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"quantity":2}'
```

**Delete Item from Cart**
```bash
curl -X DELETE http://localhost:5000/api/cart/<menuItemId> \
-H "Authorization: Bearer <TOKEN>"
```

**Clear Entire Cart**
```bash
curl -X DELETE http://localhost:5000/api/cart \
-H "Authorization: Bearer <TOKEN>"
```

### 5. Wishlist (`/api/wishlist`)

**Get Wishlist**
```bash
curl -X GET http://localhost:5000/api/wishlist \
-H "Authorization: Bearer <TOKEN>"
```

**Toggle Item in Wishlist**
```bash
curl -X POST http://localhost:5000/api/wishlist/toggle \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"itemType":"restaurant","itemId":"<restaurantId>"}'
```

### 6. Notifications (`/api/notifications`)

**Get All Notifications**
```bash
curl -X GET http://localhost:5000/api/notifications \
-H "Authorization: Bearer <TOKEN>"
```

**Mark Notification as Read**
```bash
curl -X PUT http://localhost:5000/api/notifications/<id>/read \
-H "Authorization: Bearer <TOKEN>"
```

**Mark All as Read**
```bash
curl -X PUT http://localhost:5000/api/notifications/read-all \
-H "Authorization: Bearer <TOKEN>"
```

### 7. Checkout & Orders (`/api/order` & `/api/payments`)

**Checkout (Creates placed order & clears cart)**
*(Note: The response will include a `deliveryOtp` and `qrCodeString`. The user must present one of these to the delivery partner upon arrival to complete the delivery.)*
```bash
curl -X POST http://localhost:5000/api/order/checkout \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{
  "deliveryAddress": {
    "label": "Home",
    "street": "123 Main St",
    "city": "Mumbai",
    "zip": "400001",
    "location": {
      "type": "Point",
      "coordinates": [72.8777, 19.0760]
    }
  },
  "paymentMethod": "card",
  "deliveryInstructions": "Leave at the door",
  "isScheduled": false
}'
```

**Mock Payment Charge**
```bash
curl -X POST http://localhost:5000/api/payments/mock-charge \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"orderId":"<orderId>","method":"card","forceStatus":"success"}'
```

**Get Order History**
```bash
curl -X GET http://localhost:5000/api/order \
-H "Authorization: Bearer <TOKEN>"
```

**Get Order Detail**
*(The response object will contain the `deliveryOtp` and `qrCodeString` needed for driver verification)*
```bash
curl -X GET http://localhost:5000/api/order/<orderId> \
-H "Authorization: Bearer <TOKEN>"
```

**Cancel Order (Only if status is "placed")**
```bash
curl -X PUT http://localhost:5000/api/order/<orderId>/cancel \
-H "Authorization: Bearer <TOKEN>"
```

**Track Active Order (GPS tracking)**
```bash
curl -X GET http://localhost:5000/api/order/<orderId>/track \
-H "Authorization: Bearer <TOKEN>"
```

**Submit Review**
```bash
curl -X POST http://localhost:5000/api/order/<orderId>/review \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"rating":5,"comment":"Delicious!"}'
```

**Get Help / Support Info**
```bash
curl -X GET http://localhost:5000/api/order/<orderId>/help \
-H "Authorization: Bearer <TOKEN>"
```

### 8. Static Content (`/api/static`)

**Get Banners**
```bash
curl -X GET http://localhost:5000/api/static/banners
```

**Get App Config**
```bash
curl -X GET http://localhost:5000/api/static/app-config
```

**About Us**
```bash
curl -X GET http://localhost:5000/api/static/about
```

**FAQ**
```bash
curl -X GET http://localhost:5000/api/static/faq
```

**Terms & Conditions**
```bash
curl -X GET http://localhost:5000/api/static/terms
```

### 10. Wallet (`/api/wallet`)

**Get Wallet Balance**
```bash
curl -X GET http://localhost:5000/api/wallet \
-H "Authorization: Bearer <TOKEN>"
```

**Get Wallet Transactions**
```bash
curl -X GET http://localhost:5000/api/wallet/transactions \
-H "Authorization: Bearer <TOKEN>"
```

**Add Money to Wallet**
```bash
curl -X POST http://localhost:5000/api/wallet/add \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"amount": 500}'
```

*(You can now pass `"paymentMethod": "wallet"` in the `/api/order/checkout` endpoint to pay using your wallet balance!)*

### 11. Coupons & Offers (`/api/coupons`)

**Get Available Coupons**
```bash
curl -X GET http://localhost:5000/api/coupons \
-H "Authorization: Bearer <TOKEN>"
```

**Apply Coupon to Cart**
```bash
curl -X POST http://localhost:5000/api/coupons/apply \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"code": "WELCOME50"}'
```

### 12. Membership Plans (Loyalty) (`/api/membership`)

**Get All Active Plans**
```bash
curl -X GET http://localhost:5000/api/membership
```

**Subscribe to a Plan**
```bash
curl -X POST http://localhost:5000/api/membership/subscribe \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"planId": "<planId>"}'
```

### 13. Customer Support Tickets (`/api/tickets`)

**Create a Support Ticket**
```bash
curl -X POST http://localhost:5000/api/tickets \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"subject": "Order Missing Items", "description": "My burger was missing from order #1234", "orderId": "<orderId>"}'
```

**Get My Tickets**
```bash
curl -X GET http://localhost:5000/api/tickets \
-H "Authorization: Bearer <TOKEN>"
```

**Reply to a Ticket**
```bash
curl -X POST http://localhost:5000/api/tickets/<ticketId>/reply \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"message": "I also forgot to mention I did not receive the fries."}'
```

### 14. Membership Plans (`/api/memberships`)

**Get Available Memberships**
```bash
curl -X GET http://localhost:5000/api/memberships
```

**Purchase Membership**
```bash
curl -X POST http://localhost:5000/api/memberships/purchase \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"planId": "<planId>"}'
```

### 15. Zones (`/api/zones`)

**Get All Active Service Zones**
```bash
curl -X GET http://localhost:5000/api/zones
```
