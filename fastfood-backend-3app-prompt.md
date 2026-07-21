# Fast Food — 3-App Marketplace Backend Prompt (paste into Antigravity)

frontend apps off one backend: Consumer App, Delivery Partner App, Restaurant
Partner App. Order tracking is now REAL (delivery partner pushes GPS, no more
simulation). Payments are MOCKED for now. Peak-time incentives and accident
insurance are OUT of scope for this pass — schema should not block adding them
later, but do not build those endpoints now.

```
Build a complete Node.js + Express + MongoDB backend powering three apps for a food
delivery marketplace called "Fast Food": a Consumer App, a Delivery Partner App, and a
Restaurant Partner App. Use Mongoose, JWT auth, bcrypt password hashing, Nodemailer for
OTP emails. All prices in Indian Rupees (₹) as plain Numbers. NO Google/Facebook login
anywhere — email + password + OTP only, for every role.

Four roles: customer, restaurant_owner, delivery_partner, admin.

========================================
FOLDER STRUCTURE
========================================
src/
  config/ (db.js, env.js)
  models/ (User.js, Otp.js, Restaurant.js, Category.js, MenuItem.js, Cart.js, Order.js,
            Address.js, Review.js, Wishlist.js, Notification.js, PaymentMethod.js,
            Payment.js, Payout.js)
  controllers/ (auth.controller.js, restaurant.controller.js, menu.controller.js,
                 cart.controller.js, order.controller.js, payment.controller.js,
                 profile.controller.js, wishlist.controller.js, notification.controller.js,
                 static.controller.js, owner.controller.js, delivery.controller.js,
                 admin.controller.js)
  routes/ (one per controller above)
  middlewares/ (auth.middleware.js, role.middleware.js, error.middleware.js,
                 validate.middleware.js)
  utils/ (generateOtp.js, sendEmail.js, jwt.js, apiResponse.js, geoDistance.js)
  app.js
server.js
.env.example
package.json
seed.js

========================================
1. USER MODEL & AUTH — shared across all 3 apps
========================================
User model:
  name, email (unique, required), password (hashed), phone, avatar
  role: enum [customer, restaurant_owner, delivery_partner, admin], default "customer"
  isVerified: Boolean default false        // email OTP verified
  isApproved: Boolean default true         // customer defaults true; restaurant_owner
                                            // and delivery_partner default false —
                                            // both need admin approval before going live
  isSuspended: Boolean default false
  // restaurant_owner-only:
  businessName: String
  businessDocuments: [String]
  // delivery_partner-only:
  vehicleType: enum [bike, scooter, bicycle, car]
  vehicleNumber: String
  licenseNumber: String
  partnerDocuments: [String]               // license/RC/ID proof URLs
  isOnline: Boolean default false          // partner toggles this to receive job offers
  currentLocation: GeoJSON Point, 2dsphere index  // updated by location-ping endpoint
  rating: Number default 5
  timestamps: true

Otp model: email, code (4-digit), purpose: enum [signup, reset_password], expiresAt (TTL)

Endpoints under /api/auth:
- POST /signup                    → role=customer, standard OTP flow
- POST /signup/restaurant-owner   → body adds businessName. role=restaurant_owner,
    isApproved=false
- POST /signup/delivery-partner   → body adds vehicleType, vehicleNumber, licenseNumber,
    partnerDocuments. role=delivery_partner, isApproved=false
- POST /verify-otp   → body: email, code, purpose. → isVerified=true, return tokens
- POST /resend-otp   → rate-limited 1/60s per email+purpose
- POST /login        → reject if !isVerified or isSuspended. If role is
    restaurant_owner or delivery_partner and isApproved=false, still allow login but
    user object returned includes isApproved:false so their app can show a "pending
    approval" screen instead of the main dashboard.
- POST /forgot-password → email → OTP purpose=reset_password
- POST /reset-password  → email, code, newPassword
- POST /refresh-token   → refreshToken → new accessToken
- POST /logout

JWT: accessToken 30m, refreshToken 7d (httpOnly cookie).
There is NO public admin signup route — admin only via seed.js.

========================================
2. CATEGORY, RESTAURANT & MENU — Consumer App discovery
========================================
(unchanged from prior spec — keep as-is)

Category: name, icon, restaurantCount
Restaurant: owner (ref User), name, coverImage, logo, cuisine [String], categories
  [ref Category], rating, reviewCount, deliveryTime, deliveryFee (₹), minOrder (₹),
  address, location (GeoJSON, 2dsphere), aboutUs, isApproved default false, isActive
  default true
MenuItem: restaurant (ref), name, description, price (₹), discountPrice (₹), image,
  category, addons [{name, price}], isAvailable default true

Public endpoints under /api/restaurants and /api/menu — identical to the previous
spec (categories, featured, fastest, list, detail, search, popular, item detail,
combined search) — ALWAYS filtered to Restaurant.isApproved=true AND isActive=true.

========================================
3. WISHLIST & 4. NOTIFICATIONS — unchanged from prior spec
========================================
Wishlist: user, items:[{itemType: enum[restaurant,menuItem], itemId}]
  GET /api/wishlist · POST /api/wishlist/toggle
Notification: user, title, message, type: enum[order_update, promo, general],
  isRead, createdAt
  GET /api/notifications · PUT /:id/read · PUT /read-all
System auto-notifies the CUSTOMER on every order status change, and now ALSO
auto-notifies the RESTAURANT OWNER when a new order is placed, and the DELIVERY
PARTNER when a new job offer appears.

========================================
5. CART — unchanged from prior spec
========================================
Single-restaurant-scoped cart, 409 conflict on cross-restaurant add (do not
auto-clear), full CRUD under /api/cart, all JWT customer-only.

========================================
6. ADDRESS, PAYMENT METHODS & MOCK PAYMENT GATEWAY
========================================
Address: user, label, fullAddress, location (GeoJSON), isDefault
PaymentMethod: user, type: enum[card, upi, cod], last4 / upiId, isDefault

Payment model (mock ledger, replace with real gateway later without changing Order
schema):
  order (ref), user (ref), amount (₹), method: enum[card, upi, cod],
  status: enum[pending, success, failed], mockTransactionId (String, generate a fake
  ID like "MOCKTXN_" + random), createdAt

Endpoints under /api/payments (JWT, customer):
- POST /mock-charge
  body: orderId, method
  → if method="cod", auto status="pending" (paid on delivery, no charge now)
  → else randomly simulate success (90%) or failed (10%) for demo purposes, or accept
    an optional `forceStatus` field in the body for testing specific outcomes
  → update Order.paymentStatus accordingly; if failed, keep Order.status="placed" but
    flag it so restaurant owner does NOT see/accept a failed-payment order
  → this endpoint is called by checkout flow, see below

========================================
7. ORDER MODEL & FULL LIFECYCLE — this is the core cross-app flow, get this exactly
   right, all 3 apps touch this model
========================================
Order model:
  user (ref), restaurant (ref)
  items: [{ menuItem, name, quantity, price, selectedAddons }]   // snapshot
  deliveryAddress: { label, fullAddress, coordinates }
  subtotal, deliveryFee, total (₹)
  status: enum [
    placed,             // customer checked out, payment initiated
    accepted,           // restaurant owner accepted the order
    rejected,           // restaurant owner rejected (e.g. item unavailable) — terminal
    preparing,          // restaurant owner marked preparing
    ready_for_pickup,   // restaurant owner marked food ready — order now visible to
                         // nearby available delivery partners as a job offer
    assigned,           // a delivery partner accepted the job
    picked_up,          // delivery partner confirmed pickup from restaurant
    out_for_delivery,   // alias-ish state after pickup, used for map/ETA display —
                         // (you may merge picked_up and out_for_delivery into one
                         // status if simpler; pick ONE and be consistent)
    delivered,          // delivery partner marked delivered — terminal
    cancelled            // customer cancelled while status=placed only — terminal
  ], default "placed"
  paymentMethod: enum[card, upi, cod]
  paymentStatus: enum[pending, success, failed], default "pending"
  rejectedReason: String
  deliveryPartner: {
    user: ObjectId ref User,        // populated once status=assigned
    name, phone,
    currentLocation: GeoJSON Point  // updated via REAL pings from the delivery app,
                                     // not simulated
  }
  deliveryFeeEarned: Number (₹)     // what THIS delivery partner earns for THIS order,
                                     // copy Restaurant.deliveryFee at assignment time
                                     // (or a platform-set base rate — keep it simple:
                                     // just use deliveryFee)
  estimatedDeliveryTime: Date
  placedAt, acceptedAt, readyAt, assignedAt, pickedUpAt, deliveredAt: Date

STRICT STATE MACHINE — enforce valid transitions only, reject any invalid jump with 400:
  placed → accepted | rejected                 (restaurant owner only)
  accepted → preparing                          (restaurant owner only)
  preparing → ready_for_pickup                  (restaurant owner only)
  ready_for_pickup → assigned                   (delivery partner accepting a job)
  assigned → picked_up                          (delivery partner only)
  picked_up → out_for_delivery                  (delivery partner only, or auto-set
                                                  same time as picked_up if you merge them)
  out_for_delivery → delivered                  (delivery partner only)
  placed → cancelled                            (customer only, while still "placed")
Every transition writes the corresponding notification(s) to the relevant party.

Customer-facing endpoints under /api/orders (JWT, customer):
- POST /checkout
  body: addressId, paymentMethod
  → validate cart non-empty, restaurant still isApproved+isActive
  → create Order status="placed", snapshot cart, clear cart
  → call the mock payment flow internally (or client calls POST /api/payments/mock-charge
    right after with the returned orderId — either is fine, pick one and be consistent;
    recommend: checkout creates the order, then client immediately calls mock-charge)
  → notify restaurant owner "New order received"
  → return order + 2-3 recommended items (same logic as before: same-restaurant
    dessert/drinks first, fallback to platform popular items)
- GET /              → order history
- GET /:id           → detail
- PUT /:id/cancel    → only if status="placed"
- POST /:id/review   → only if status="delivered", one review per order
- GET /:id/track     → returns { status, deliveryPartner: {name, phone,
    currentLocation}, estimatedDeliveryTime, minutesRemaining } computed from the
    REAL currentLocation on the order (no simulation now — if no delivery partner
    assigned yet, return status + "preparing your order" message, no location)
- GET /:id/help      → support contact info

========================================
8. DELIVERY PARTNER APP — /api/delivery (JWT + role=delivery_partner required, and
   isApproved=true required — block all of these with 403 "pending approval" if not)
========================================
- PUT /online-status        → body: isOnline (Boolean). Partner toggles availability.
- PUT /location              → body: lat, lng. REAL location ping — call this every
    ~5-10 sec from the delivery app while online or while on an active delivery. This
    updates User.currentLocation, AND if the partner has an active order (status in
    [assigned, picked_up, out_for_delivery]), also updates that Order.deliveryPartner
    .currentLocation — this is what powers the consumer app's live map, replacing the
    old simulation entirely.
- GET /jobs                  → list orders with status="ready_for_pickup", sorted by
    distance from partner's currentLocation to the restaurant's location (nearest
    first), only shown if partner isOnline=true. Do not show jobs to offline partners.
- POST /jobs/:orderId/accept  → sets Order.status="assigned", deliveryPartner=self,
    assignedAt=now. Reject with 409 if another partner already accepted it
    (first-accept-wins — use a findOneAndUpdate with a status="ready_for_pickup"
    filter to avoid race conditions).
- POST /jobs/:orderId/reject  → optional explicit decline, just removes it from this
    partner's visible list (no DB change needed beyond maybe a "declinedBy" array on
    Order so the same partner doesn't see it again)
- PUT /orders/:orderId/picked-up      → status assigned → picked_up (must be the
    assigned partner)
- PUT /orders/:orderId/out-for-delivery → status picked_up → out_for_delivery
- PUT /orders/:orderId/delivered      → status → delivered, deliveredAt=now. Also
    creates a Payout entry (see below) for this order.
- GET /orders/active          → this partner's current in-progress order (if any)
- GET /orders/history         → past completed orders for this partner

Payout model:
  deliveryPartner (ref User), order (ref Order), amount (₹, = order.deliveryFeeEarned),
  date, status: enum[pending, paid], createdAt

- GET /payouts/summary?range=daily|weekly
  → sums Payout.amount for this partner within range, grouped by day, returns
    { totalEarned, orderCount, breakdown: [{date, amount, orderCount}] }
- GET /payouts/history → paginated raw Payout list

(Peak-time incentives and accident insurance are explicitly OUT of scope for this
build — do not add endpoints for them, but do not name fields in a way that would
conflict with adding a `bonusAmount` field to Payout later.)

========================================
9. RESTAURANT PARTNER APP — /api/owner (JWT + role=restaurant_owner + isApproved=true,
   403 "pending approval" otherwise)
========================================
Restaurant management:
- POST /restaurant → create (one per owner, reject if already exists), isApproved=false
- GET /restaurant  → own restaurant + approval status
- PUT /restaurant  → update fields
- PUT /restaurant/toggle-active → pause/resume

Menu management (ownership-checked):
- POST /restaurant/menu
- GET /restaurant/menu
- PUT /restaurant/menu/:itemId
- DELETE /restaurant/menu/:itemId → soft-delete (isAvailable=false) if it appears in
    any past order, hard-delete otherwise
- PUT /restaurant/menu/:itemId/toggle-availability

Order accept/reject (THE core Restaurant Partner App feature per your spec):
- GET /orders                → incoming orders for this restaurant, filter ?status=
- GET /orders/:id            → detail
- PUT /orders/:id/accept     → status placed→accepted (reject with 400 if
    paymentStatus="failed")
- PUT /orders/:id/reject     → body: reason. status placed→rejected (terminal, notify
    customer, trigger a mock refund by setting Payment.status="failed" if it had been
    "success")
- PUT /orders/:id/preparing  → status accepted→preparing
- PUT /orders/:id/ready      → status preparing→ready_for_pickup (this is what makes
    it visible in the delivery partner job pool)

Basic analytics:
- GET /dashboard/stats → todayOrders, weekOrders, todayRevenue (₹), weekRevenue (₹),
    averageRating, pendingOrdersCount (status=placed awaiting accept/reject),
    topSellingItems (top 5 by quantity across delivered orders)

(Advertising/promotion control is explicitly OUT of scope for this build.)

========================================
10. PROFILE (Consumer App) & STATIC — unchanged from prior spec
========================================
/api/profile: GET/PUT profile, GET orders alias, addresses CRUD, payment-methods
CRUD, settings, logout.
/api/static: GET /contact-us, GET /help-faq (no auth)

========================================
11. ADMIN — /api/admin (JWT + role=admin)
========================================
- GET /restaurant-owners/pending · PUT /:id/approve · PUT /:id/reject
- GET /delivery-partners/pending · PUT /:id/approve · PUT /:id/reject
    (mirror the restaurant-owner approval flow for delivery partners — check
    partnerDocuments exist before allowing approve)
- GET /restaurants/pending · PUT /:id/approve (also bump Category.restaurantCount) ·
    PUT /:id/reject
- GET /restaurants/:id/orders
- PUT /users/:id/suspend · PUT /users/:id/unsuspend
- GET /stats → totalOrders, totalGMV (₹, sum of delivered order totals),
    activeRestaurants, activeCustomers, activeDeliveryPartners, pendingApprovalsCount
    (owners + partners + restaurants combined)

========================================
GENERAL REQUIREMENTS
========================================
- Consistent envelope: { success, message, data }
- Centralized error handling, proper status codes (400/401/403/404/409/500)
- Input validation everywhere (express-validator or Joi)
- .env.example: MONGO_URI, JWT_SECRET, JWT_REFRESH_SECRET, EMAIL_USER, EMAIL_PASS, PORT
- CORS enabled
- Use findOneAndUpdate with status-filter conditions (not read-then-write) for every
  state transition that could race across two apps at once — especially job
  acceptance in section 8 and order accept/reject in section 9 — to prevent double
  bookings.
- seed.js, in order:
  1. One admin user (role=admin, isVerified=true, isApproved=true) — bypass OTP,
     this is the only way an admin account ever exists
  2. Categories
  3. 2-3 restaurant_owner users + their Restaurant docs, created isApproved=true
     directly (bypass real approval for demo data)
  4. MenuItems per restaurant, realistic ₹ pricing
  5. 2-3 delivery_partner users, isApproved=true, isOnline=true, with a
     currentLocation near the seeded restaurants
- README.md: setup steps, full API list per section, the Order state machine as a
  text diagram, and seeded admin/owner/partner login credentials for testing

========================================
BUILD ORDER — verify each step with real requests before moving to the next
========================================
1. User model + Auth for all 4 roles (test each signup path + OTP + login)
2. Category + Restaurant + MenuItem + seed.js, confirm public discovery endpoints
   only show approved+active restaurants
3. Admin approval endpoints for restaurant_owner and delivery_partner + Restaurant
   approval — test the full pending → approved → visible chain for both a
   restaurant and a delivery partner
4. Restaurant Partner App: restaurant/menu CRUD (section 9, minus order actions)
5. Wishlist + Notifications
6. Cart
7. Address + PaymentMethod + mock Payment gateway
8. Order model + checkout + the full state machine wiring (section 7) — build
   restaurant accept/reject (section 9 order actions) and delivery job
   accept/pickup/deliver (section 8) TOGETHER since they operate on the same Order,
   test the entire placed→delivered path end to end with two different test
   accounts (one owner, one partner) before moving on
9. Delivery Partner App: location ping, online toggle, payout summary
10. Restaurant Partner App: dashboard stats
11. Profile + Static endpoints
12. Admin platform stats

Do not generate all steps in a single pass — confirm step 8 in particular works
correctly (it's the most failure-prone part, three different actors mutating one
document) before continuing.
```
