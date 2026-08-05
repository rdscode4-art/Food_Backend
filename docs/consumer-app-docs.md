# Consumer App Documentation

This document outlines all the APIs and frontend implementation notes required to build the Fast Food Consumer App.

## Frontend Implementation Notes

1. **Authentication State:**
   - Store the `accessToken` in memory or secure storage. Attach it as a `Bearer` token to the `Authorization` header for all protected requests.
   - The `refreshToken` is handled automatically via HTTP-only cookies.
   - **OTP Flow:** The signup process has two steps. Step 1: `POST /signup`. Step 2: Navigate to an OTP verification screen and call `POST /verify-otp`.

2. **Real-time Order Updates (Socket.io):**
   - Connect to the socket server at `ws://localhost:6030`.
   - On successful login, emit a `join` event with the user's `_id` so the server knows where to send direct notifications.
   - Listen for the `order_update` event to show toast notifications and automatically refetch order details/status.

3. **Live Order Tracking (WebSockets):**
   - For an active order, the app should emit `socket.emit('join', 'track_order_<orderId>')`. The backend will emit `driver_location_update` events directly to this room with the driver's live GPS coordinates.
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
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/signup \
-H "Content-Type: application/json" \
-d '{"name":"John Doe","email":"john@example.com","password":"password123","phone":"9999999999"}'
```

**Verify OTP**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/verify-otp \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","code":"1234","purpose":"signup"}'
```

**Resend OTP**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/resend-otp \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","purpose":"signup"}'
```

**Login**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","password":"password123"}'
```

**Forgot Password**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/forgot-password \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com"}'
```

**Reset Password**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/reset-password \
-H "Content-Type: application/json" \
-d '{"email":"john@example.com","code":"1234","newPassword":"newpassword123"}'
```

**Refresh Token (uses HTTP-only cookie)**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/refresh-token
```

**Logout Current Device**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/logout \
-H "Authorization: Bearer <TOKEN>"
```

**Logout All Devices**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/auth/logout-all \
-H "Authorization: Bearer <TOKEN>"
```

### 2. User Profile & Addresses (`/api/user`)

**Get Profile**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/user/profile \
-H "Authorization: Bearer <TOKEN>"
```

**Update Profile**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/user/profile \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"name":"John Updated"}'
```

**Get All Addresses**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/user/addresses \
-H "Authorization: Bearer <TOKEN>"
```

**Create Address**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/user/addresses \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"label":"Home","street":"123 Main St","city":"Metro","zip":"10001","fullAddress":"123 Main St, Metro 10001","location":{"type":"Point","coordinates":[77.1,28.6]}}'
```

**Update Address**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/user/addresses/<addressId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"isDefault":true}'
```

**Delete Address**
```bash
curl -X DELETE https://foodbackend.ridealdigitalseva.com/api/user/addresses/<addressId> \
-H "Authorization: Bearer <TOKEN>"
```

**Get Payment Methods**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/user/payment-methods \
-H "Authorization: Bearer <TOKEN>"
```

**Add Payment Method**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/user/payment-methods \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"type":"card","details":"4242"}'
```

**Delete Payment Method**
```bash
curl -X DELETE https://foodbackend.ridealdigitalseva.com/api/user/payment-methods/<paymentMethodId> \
-H "Authorization: Bearer <TOKEN>"
```

### 3. Discovery & Menu (`/api/restaurants` & `/api/menu`)

**Get Categories**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/restaurants/categories
```

**Get Featured Restaurants**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/restaurants/featured
```

**Get Fastest Restaurants**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/restaurants/fastest
```

**Get Popular Restaurants**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/restaurants/popular
```

**Search Restaurants (Advanced)**
```bash
curl -X GET "http://localhost:6030/api/restaurants/search?q=burger&isVeg=true&minRating=4&freeDelivery=true&sort=delivery_time" \
-H "Authorization: Bearer <TOKEN>"
```

**Get Restaurant Detail**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/restaurants/<restaurantId>
```

**Get Menu for Restaurant**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/menu/<restaurantId>
```

**Get Specific Menu Item Detail**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/menu/item/<itemId>
```

### 4. Cart (`/api/cart`)

**Get Current Cart**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/cart \
-H "Authorization: Bearer <TOKEN>"
```

**Add Item to Cart**
*(Note: Automatically calculates taxes, platformFee, smallOrderFee, and surgeFee)*
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/cart \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"menuItemId":"<menuId>","quantity":1}'
```

**Update Cart Item Quantity**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/cart/<menuItemId> \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"quantity":2}'
```

**Delete Item from Cart**
```bash
curl -X DELETE https://foodbackend.ridealdigitalseva.com/api/cart/<menuItemId> \
-H "Authorization: Bearer <TOKEN>"
```

**Clear Entire Cart**
```bash
curl -X DELETE https://foodbackend.ridealdigitalseva.com/api/cart \
-H "Authorization: Bearer <TOKEN>"
```

### 5. Wishlist (`/api/wishlist`)

**Get Wishlist**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/wishlist \
-H "Authorization: Bearer <TOKEN>"
```

**Toggle Item in Wishlist**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/wishlist/toggle \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"itemType":"restaurant","itemId":"<restaurantId>"}'
```

### 6. Notifications (`/api/notifications`)

**Get All Notifications**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/notifications \
-H "Authorization: Bearer <TOKEN>"
```

**Mark Notification as Read**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/notifications/<id>/read \
-H "Authorization: Bearer <TOKEN>"
```

**Mark All as Read**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/notifications/read-all \
-H "Authorization: Bearer <TOKEN>"
```

### 7. Checkout & Orders (`/api/order` & `/api/payments`)

**Checkout (Creates placed order & clears cart)**
*(Note: The response will include a `deliveryOtp` and `qrCodeString`. The user must present one of these to the delivery partner upon arrival to complete the delivery.)*
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/order/checkout \
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
  "isScheduled": false,
  "orderType": "delivery",
  "tableId": null,
  "couponCode": "FESTIVAL50"
}'
```

**Get Order History**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/order \
-H "Authorization: Bearer <TOKEN>"
```

**Get Order Detail**
*(The response object will contain the `deliveryOtp` and `qrCodeString` needed for driver verification)*
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/order/<orderId> \
-H "Authorization: Bearer <TOKEN>"
```

**Cancel Order (Only if status is "placed")**
```bash
curl -X PUT https://foodbackend.ridealdigitalseva.com/api/order/<orderId>/cancel \
-H "Authorization: Bearer <TOKEN>"
```

**Track Active Order (GPS tracking)**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/order/<orderId>/track \
-H "Authorization: Bearer <TOKEN>"
```

**Submit Review**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/order/<orderId>/review \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"rating":5,"comment":"Delicious!"}'
```

**Get Help / Support Info**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/order/<orderId>/help \
-H "Authorization: Bearer <TOKEN>"
```

### 8. Static Content (`/api/static`)

**Get Banners**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/static/banners
```

**Get App Config**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/static/app-config
```

**About Us**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/static/about
```

**FAQ**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/static/faq
```

**Terms & Conditions**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/static/terms
```

### 9. Wallet (`/api/wallet`)

**Get Wallet Balance**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/wallet \
-H "Authorization: Bearer <TOKEN>"
```

**Get Wallet Transactions**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/wallet/transactions \
-H "Authorization: Bearer <TOKEN>"
```

**Add Money to Wallet**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/wallet/add \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"amount": 500}'
```

*(You can now pass `"paymentMethod": "wallet"` in the `/api/order/checkout` endpoint to pay using your wallet balance!)*

### 10. Coupons & Offers (`/api/coupons`)

**Get Available Coupons**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/coupons \
-H "Authorization: Bearer <TOKEN>"
```

**Apply Coupon to Cart**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/coupons/apply \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"code": "WELCOME50"}'
```

### 11. Membership Plans (Loyalty) (`/api/membership`)

**Get All Active Plans**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/membership
```

**Subscribe to a Plan**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/membership/subscribe \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"planId": "<planId>"}'
```

### 12. Customer Support Tickets (`/api/tickets`)

**Create a Support Ticket**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/tickets \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"subject": "Order Missing Items", "description": "My burger was missing from order #1234", "orderId": "<orderId>"}'
```

**Get My Tickets**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/tickets \
-H "Authorization: Bearer <TOKEN>"
```

**Reply to a Ticket**
```bash
curl -X POST https://foodbackend.ridealdigitalseva.com/api/tickets/<ticketId>/reply \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"message": "I also forgot to mention I did not receive the fries."}'
```

### 13. Zones (`/api/zones`)

**Get All Active Service Zones**
```bash
curl -X GET https://foodbackend.ridealdigitalseva.com/api/zones
```
