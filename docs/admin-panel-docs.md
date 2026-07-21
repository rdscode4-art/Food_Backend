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
