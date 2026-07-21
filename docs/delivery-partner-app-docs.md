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

3. **Job Pool (Polling / Websockets):**
   - The partner dashboard should poll `GET /api/partner/orders/available` to discover orders that are `ready_for_pickup` nearby.
   - Because multiple partners might see the same job, handle HTTP 400/409 errors gracefully if a partner tries to accept a job that someone else just claimed.

4. **Order State Machine Buttons:**
   - Enforce linear flow in the UI:
     - `Accept` -> `Picked Up` -> `Out for Delivery` -> `Delivered`
   - Disable/hide the next step until the current step is completed via the API.

---

## API Reference

### 1. Authentication

**Signup (Delivery Partner)**
```bash
curl -X POST http://localhost:6030/api/auth/signup/delivery-partner \
-H "Content-Type: application/json" \
-d '{"name":"John Rider","email":"rider@example.com","password":"password123","phone":"8888888888","vehicleType":"bike","vehicleNumber":"AB-12-CD-3456","licenseNumber":"DL123456789","partnerDocuments":["http://link-to-license.jpg"]}'
```

**Verify OTP**
```bash
curl -X POST http://localhost:6030/api/auth/verify-otp \
-H "Content-Type: application/json" \
-d '{"email":"rider@example.com","code":"1234","purpose":"signup"}'
```

**Login**
```bash
curl -X POST http://localhost:6030/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"rider@example.com","password":"password123"}'
```

### 2. Status & Location Sync

**Toggle Online Status**
```bash
curl -X PUT http://localhost:6030/api/partner/online-status \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"isOnline":true}'
```

**Sync GPS Location (Ping every 5-10s)**
```bash
curl -X PUT http://localhost:6030/api/partner/location \
-H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
-d '{"coordinates":[77.615,12.935]}'
```
*(Note: Coordinates are strictly [longitude, latitude])*

### 3. Job Management & Order Flow

**Get Available Jobs Nearby**
```bash
curl -X GET http://localhost:6030/api/partner/orders/available \
-H "Authorization: Bearer <TOKEN>"
```

**Accept a Job**
```bash
curl -X PUT http://localhost:6030/api/partner/orders/<orderId>/accept \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Picked Up**
```bash
curl -X PUT http://localhost:6030/api/partner/orders/<orderId>/picked-up \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Out for Delivery**
```bash
curl -X PUT http://localhost:6030/api/partner/orders/<orderId>/out-for-delivery \
-H "Authorization: Bearer <TOKEN>"
```

**Mark as Delivered (Completes Order & Generates Payout)**
```bash
curl -X PUT http://localhost:6030/api/partner/orders/<orderId>/deliver \
-H "Authorization: Bearer <TOKEN>"
```

### 4. Earnings / Payouts

**Get Earnings Summary**
```bash
curl -X GET http://localhost:6030/api/partner/payouts/summary \
-H "Authorization: Bearer <TOKEN>"
```

**Get Payout History**
```bash
curl -X GET http://localhost:6030/api/partner/payouts/history \
-H "Authorization: Bearer <TOKEN>"
```
