# Delivery Partner App Documentation

This document outlines all the APIs and frontend implementation notes required to build the Fast Food Delivery Partner App.

## Frontend Implementation Notes

1. **Pending Approval State:**
   - Delivery partners must be approved by an Admin before they can accept jobs.
   - When calling `POST /api/auth/login`, if the user has `isApproved: false`, they are allowed to log in, but the frontend MUST intercept this flag in the user payload and show a "Pending Approval" holding screen instead of the main job board. Any requests to `/api/partner/*` will return a 403 Forbidden until approved.

2. **Background Location Sync (Crucial):**
   - The app must request "Always On" or "While Using App" high-accuracy GPS permissions from the device.
   - When the partner toggles themselves to "Online", start a background task/interval that calls `PUT /api/partner/location` every 5-10 seconds.
   - This GPS ping powers both the consumer tracking map and the distance calculations to offer the partner nearby jobs.

3. **Job Pool (Polling / Websockets) & Auto-Assignment:**
   - The platform dynamically assigns orders to the nearest available driver based on distance, `vehicleType`, and `driverRating`.
   - The driver app should listen for Socket.io events (`order_update`) to instantly notify the driver of a new assignment, OR poll `GET /api/partner/orders/available`.
   - If a driver cannot take the order, they must call `/reject`, which triggers the backend to automatically assign the next best driver.

4. **Order State Machine Buttons:**
   - Enforce linear flow in the UI:
     - `Accept` -> `Picked Up` -> `Out for Delivery` -> `Delivered`
   - Disable/hide the next step until the current step is completed via the API.
   - **Verification**: At the "Delivered" step, the app must capture either the User's OTP, a QR Code Scan, or a Digital Signature, and pass it in the payload.

5. **Earnings & Incentives:**
   - The backend tracks distance bonuses, peak hour bonuses, festival bonuses, and order targets.
   - These are automatically calculated at the moment the `/deliver` API is called and credited to the driver's wallet.

---

## API Reference

### 1. Authentication

**Signup (Delivery Partner)**
```bash
curl -X POST http://localhost:5000/api/auth/signup/delivery-partner \
-H "Content-Type: application/json" \
-d '{"name":"John Rider","email":"rider@example.com","password":"password123","phone":"8888888888","vehicleType":"bike","vehicleNumber":"AB-12-CD-3456","licenseNumber":"DL123456789","aadhaarNumber":"123456789012","panNumber":"ABCDE1234F","bankDetails":{"accountNumber":"123456789","ifsc":"HDFC000123","bankName":"HDFC"},"partnerDocuments":["http://link-to-license.jpg"]}'
```

**Verify OTP**
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
-H "Content-Type: application/json" \
-d '{"email":"rider@example.com","code":"1234","purpose":"signup"}'
```

**Login**
```bash
curl -X POST http://localhost:5000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"rider@example.com","password":"password123"}'
```

### 2. Status & Location Sync

**Toggle Online Status**
```bash
curl -X PUT http://localhost:5000/api/partner/online-status \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"isOnline":true}'
```

**Sync GPS Location (Ping every 5-10s)**
```bash
curl -X PUT http://localhost:5000/api/partner/location \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"coordinates":[77.615,12.935]}'
```
*(Note: Coordinates are strictly [longitude, latitude])*

### 3. Job Management & Order Flow

**Get Available Jobs Nearby**
```bash
curl -X GET http://localhost:5000/api/partner/orders/available \
-H "Authorization: Bearer <TOKEN>"
```

**Accept a Job**
```bash
curl -X PUT http://localhost:5000/api/partner/orders/<orderId>/accept \
-H "Authorization: Bearer <TOKEN>"
```

**Reject a Job (Triggers Auto-Reassign)**
```bash
curl -X PUT http://localhost:5000/api/partner/orders/<orderId>/reject \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"reason": "Vehicle Breakdown"}'
```

**Mark as Picked Up**
```bash
curl -X PUT http://localhost:5000/api/partner/orders/<orderId>/picked-up \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Out for Delivery**
```bash
curl -X PUT http://localhost:5000/api/partner/orders/<orderId>/out-for-delivery \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Delivered (Requires Verification)**
```bash
# You must provide AT LEAST ONE of these three verification methods
curl -X PUT http://localhost:5000/api/partner/orders/<orderId>/deliver \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{
  "deliveryOtp": "1234",
  "qrCodeString": "rideal-delivery-123456789-abcde",
  "digitalSignature": "https://bucket.s3.aws.com/signatures/123.jpg"
}'
```

### 4. Earnings & Wallet

**Get Earnings Summary (Dashboard)**
```bash
# Returns walletBalance, dailyEarnings, weeklyEarnings, monthlyEarnings, totalEarnings
curl -X GET http://localhost:5000/api/partner/payouts/summary \
-H "Authorization: Bearer <TOKEN>"
```

**Get Payout History**
```bash
curl -X GET http://localhost:5000/api/partner/payouts/history \
-H "Authorization: Bearer <TOKEN>"
```

**Request Wallet Withdrawal**
```bash
curl -X POST http://localhost:5000/api/partner/withdraw \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"amount": 500}'
```

---


### 5. Trips & Ratings

**Get Completed Trip History**
```bash
curl -X GET http://localhost:5000/api/partner/orders/history \
-H "Authorization: Bearer <TOKEN>"
```

**Get Driver Performance (Ratings & Reviews)**
```bash
curl -X GET http://localhost:5000/api/partner/ratings \
-H "Authorization: Bearer <TOKEN>"
```

### 6. Driver Support (Complaints)

**Raise a Support Ticket**
```bash
curl -X POST http://localhost:5000/api/tickets \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"subject": "Payment Delay", "description": "My last withdrawal is stuck.", "type": "driver"}'
```

---


### 7. Profile & Notifications

**Get Driver Profile**
```bash
curl -X GET http://localhost:5000/api/partner/profile \
-H "Authorization: Bearer <TOKEN>"
```

**Update Profile (Vehicle Info)**
```bash
curl -X PUT http://localhost:5000/api/partner/profile \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"vehicleNumber": "MH-12-PQ-9999"}'
```

**Get Notifications**
```bash
curl -X GET http://localhost:5000/api/notifications \
-H "Authorization: Bearer <TOKEN>"
```

---

## Admin Configuration APIs (For Admins Only)

### 1. Delivery Charge Config
```bash
# Get Config
curl -X GET http://localhost:5000/api/admin/config/delivery \
-H "Authorization: Bearer <ADMIN_TOKEN>"

# Update Config (Example toggling Peak Hour and setting Rain Fee)
curl -X PUT http://localhost:5000/api/admin/config/delivery \
-H "Authorization: Bearer <ADMIN_TOKEN>" \
-H "Content-Type: application/json" \
-d '{"isPeakHour": true, "rainFee": 20}'
```

### 2. Driver Incentive Config
```bash
# Get Config
curl -X GET http://localhost:5000/api/admin/config/incentive \
-H "Authorization: Bearer <ADMIN_TOKEN>"

# Update Config (Example setting a Weekly Target and Festival Bonus)
curl -X PUT http://localhost:5000/api/admin/config/incentive \
-H "Authorization: Bearer <ADMIN_TOKEN>" \
-H "Content-Type: application/json" \
-d '{"weeklyTargetOrders": 50, "weeklyTargetBonus": 1000, "festivalBonus": 50}'
```

### 3. Manual Order Assignment
```bash
# Force assign a driver to an order
curl -X PUT http://localhost:5000/api/admin/orders/<orderId>/assign \
-H "Authorization: Bearer <ADMIN_TOKEN>" \
-H "Content-Type: application/json" \
-d '{"driverId": "<DRIVER_USER_ID>"}'
```


