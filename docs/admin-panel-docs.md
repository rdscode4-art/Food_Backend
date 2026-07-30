# Admin Panel Documentation

This document outlines all the APIs and frontend implementation notes required to build the Fast Food Admin Web Panel.

## Frontend Implementation Notes

1. **Authentication & Authorization:**
   - Admins cannot "sign up" via a public endpoint. Admin accounts must be created directly in the database (e.g., via the `seed.js` script).
   - The admin panel simply uses the standard `/api/auth/login` endpoint.
   - All `/api/admin/*` routes strictly require a valid JWT with the `admin` role.

2. **The Tri-Approval Process:**
   - The primary responsibility of the Admin Panel is acting as a gatekeeper.
   - There are three distinct queues for approvals:
     - **Restaurant Owners** (the user accounts)
     - **Delivery Partners** (the driver accounts)
     - **Restaurants** (the actual business listings)
   - When approving a Restaurant Owner, it enables their account access. When approving their Restaurant profile, it makes their store visible to consumers on the main app.
   - When approving a Delivery Partner, the Admin UI should display their `partnerDocuments` (links to driver's license, RC book, etc.) for manual verification before calling the approve endpoint.

3. **Platform Statistics:**
   - The `/api/admin/stats` endpoint runs heavy aggregations to sum Gross Merchandise Value (GMV), count active users, and tally pending approvals. Use this data to power a high-level overview dashboard on the landing page of the admin portal.

---

## API Reference

### 1. Authentication

**Admin Login**
```bash
curl -X POST http://localhost:6030/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"admin@fastfood.com","password":"password123"}'
```

### 2. Approval Queues

**Get Pending Restaurant Owners**
```bash
curl -X GET http://localhost:6030/api/admin/restaurant-owners/pending \
-H "Authorization: Bearer <TOKEN>"
```

**Approve or Reject Restaurant Owner**
```bash
curl -X PUT http://localhost:6030/api/admin/restaurant-owners/<userId>/approve \
-H "Authorization: Bearer <TOKEN>"

curl -X PUT http://localhost:6030/api/admin/restaurant-owners/<userId>/reject \
-H "Authorization: Bearer <TOKEN>"
```

**Get Pending Delivery Partners**
```bash
curl -X GET http://localhost:6030/api/admin/delivery-partners/pending \
-H "Authorization: Bearer <TOKEN>"
```

**Approve or Reject Delivery Partner**
```bash
curl -X PUT http://localhost:6030/api/admin/delivery-partners/<userId>/approve \
-H "Authorization: Bearer <TOKEN>"

curl -X PUT http://localhost:6030/api/admin/delivery-partners/<userId>/reject \
-H "Authorization: Bearer <TOKEN>"
```

**Get Pending Restaurant Profiles**
```bash
curl -X GET http://localhost:6030/api/admin/restaurants/pending \
-H "Authorization: Bearer <TOKEN>"
```

**Approve or Reject Restaurant Profile**
*(Note: Approving a restaurant automatically bumps the `restaurantCount` on its associated Category)*
```bash
curl -X PUT http://localhost:6030/api/admin/restaurants/<restaurantId>/approve \
-H "Authorization: Bearer <TOKEN>"

curl -X PUT http://localhost:6030/api/admin/restaurants/<restaurantId>/reject \
-H "Authorization: Bearer <TOKEN>"
```

### 3. User Moderation

**Suspend User Account (Bans login)**
```bash
curl -X PUT http://localhost:6030/api/admin/users/<userId>/suspend \
-H "Authorization: Bearer <TOKEN>"
```

**Unsuspend User Account**
```bash
curl -X PUT http://localhost:6030/api/admin/users/<userId>/unsuspend \
-H "Authorization: Bearer <TOKEN>"
```

### 4. Platform Analytics

**Get Global Platform Stats (GMV, Active Users, etc.)**
```bash
curl -X GET http://localhost:6030/api/admin/stats \
-H "Authorization: Bearer <TOKEN>"
```

### 5. Customer & Vendor Management (PRD 31-33)

**View All Customers / Search**
```bash
curl -X GET "http://localhost:6030/api/admin/users?role=customer&search=john" \
-H "Authorization: Bearer <TOKEN>"
```

**Manage Customer Loyalty Points**
```bash
curl -X PUT http://localhost:6030/api/admin/users/<userId>/loyalty \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"action": "add", "points": 500}'
```

**Manage Vendor Commission Rate**
```bash
curl -X PUT http://localhost:6030/api/admin/restaurants/<restaurantId>/commission \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"commissionRate": 15.5}'
```

### 6. Order & Coupon Management (PRD 34-35)

**Manual Order Cancellation & Refund**
```bash
curl -X PUT http://localhost:6030/api/admin/orders/<orderId>/cancel \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"reason": "Customer requested", "refundType": "wallet"}'
```

**Create Platform Coupon**
```bash
curl -X POST http://localhost:6030/api/admin/coupons \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"code": "FESTIVAL50", "discountType": "percentage", "discountValue": 50, "isFirstOrderOnly": false}'
```

### 7. Advanced Configuration & Operations

**Export Orders as CSV**
```bash
curl -X GET "http://localhost:6030/api/admin/orders/export?startDate=2026-01-01&endDate=2026-12-31" \
-H "Authorization: Bearer <TOKEN>" -o orders.csv
```

**Manage Roles (RBAC)**
```bash
curl -X POST http://localhost:6030/api/admin/roles \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"name": "Support Manager", "permissions": ["view_orders", "manage_tickets"]}'
```

**Create Multi-City Zone**
```bash
curl -X POST http://localhost:6030/api/admin/zones \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"name": "Delhi NCR", "baseDeliveryFee": 40}'
```

### 8. Deep Cut System Config & Modules

**Create CMS Page (Privacy Policy, Terms)**
```bash
curl -X POST http://localhost:6030/api/admin/cms \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"slug": "privacy-policy", "title": "Privacy Policy", "content": "<h1>Privacy</h1><p>Content here...</p>"}'
```

**Configure Refund Rules**
```bash
curl -X POST http://localhost:6030/api/admin/refund-rules \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"name": "Driver Cancellation Rule", "triggerStatus": "accepted", "initiatorRole": "delivery_partner", "refundPercentage": 100}'
```

**View Admin Activity Logs**
```bash
curl -X GET http://localhost:6030/api/admin/activity-logs?limit=50 \
-H "Authorization: Bearer <TOKEN>"
```

**Create Notification Template**
```bash
curl -X POST http://localhost:6030/api/admin/notifications/templates \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"name": "ORDER_ACCEPTED", "channel": "push", "titleTemplate": "Order {{orderId}} Accepted", "bodyTemplate": "Hi {{userName}}, your order is accepted!"}'
```

**Manage Advertisement Campaigns**
```bash
curl -X POST http://localhost:6030/api/admin/advertisements \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"restaurant": "<restaurantId>", "adType": "banner", "budget": 5000, "startDate": "2026-08-01", "endDate": "2026-08-15"}'
```

**Create Dine-in Table**
```bash
curl -X POST http://localhost:6030/api/admin/tables \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"restaurant": "<restaurantId>", "tableNumber": "T-12", "capacity": 4}'
```

### 9. New Endpoints

**Get Dashboard Stats**
```bash
curl -X GET http://localhost:6030/api/admin/dashboard \
-H "Authorization: Bearer <TOKEN>"
```

**Get Restaurant Orders**
```bash
curl -X GET http://localhost:6030/api/admin/restaurants/<restaurantId>/orders \
-H "Authorization: Bearer <TOKEN>"
```

**Manual Assign Order to Delivery Partner**
```bash
curl -X PUT http://localhost:6030/api/admin/orders/<orderId>/assign \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"driverId": "<deliveryPartnerId>"}'
```

**Get / Update Delivery Config**
```bash
curl -X GET http://localhost:6030/api/admin/config/delivery \
-H "Authorization: Bearer <TOKEN>"

curl -X PUT http://localhost:6030/api/admin/config/delivery \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"baseFee": 40, "perKmFee": 10, "driverCommissionRate": 10}'
```

**Get / Update Incentive Config**
```bash
curl -X GET http://localhost:6030/api/admin/config/incentive \
-H "Authorization: Bearer <TOKEN>"

curl -X PUT http://localhost:6030/api/admin/config/incentive \
-H "Authorization: Bearer <TOKEN>" \
-H "Content-Type: application/json" \
-d '{"dailyTarget": 10, "dailyBonus": 100}'
```
