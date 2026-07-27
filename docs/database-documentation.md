# Database Documentation

This document outlines the core MongoDB schema structure for the Rideal Multi-Vendor Food Delivery Platform.

## Core Collections

### 1. Users (`users`)
Stores all platform identities (Customers, Owners, Drivers, Admins).
- **role**: Enum `['customer', 'restaurant_owner', 'delivery_partner', 'admin']`
- **zone**: Reference to `Zone` for location-based scoping.
- **adminRole**: Reference to `Role` for granular admin permissions.
- **walletBalance**: Financial ledger tracking.
- **kycStatus / Documents**: Aadhaar, PAN, License for drivers and owners.

### 2. Restaurants (`restaurants`)
Stores vendor profiles and operating parameters.
- **owner**: Reference to `User`.
- **zone**: Reference to `Zone`.
- **status**: Operational state (`Open`, `Closed`, `Busy`).
- **deliveryRadius**, **minOrder**, **preparationTime**, **deliveryTime**.

### 3. Menu Items (`menuitems`)
Stores the catalog of food items linked to restaurants.
- **restaurant**: Reference to `Restaurant`.
- **category**: Reference to `Category`.
- **price**, **discountPrice**.
- **stockCount**, **lowStockAlert**, **lowStockThreshold**.
- **variants**, **addons**, **isVeg**, **isSpicy**.

### 4. Orders (`orders`)
The central transaction ledger.
- **user**, **restaurant**, **deliveryPartner**.
- **status**: State machine (`Placed`, `Prepared`, `Picked Up`, `Delivered`).
- **Financials**: `totalAmount`, `deliveryFee`, `taxes`, `platformFee`, `smallOrderFee`, `surgeFee`, `rainFee`, `nightFee`.
- **paymentMethod**, **paymentStatus**.

### 5. Zones (`zones`)
Defines operational geographic boundaries.
- **name**: e.g., "Delhi NCR".
- **isActive**: Boolean.
- **centerLocation**: GeoJSON point.
- **radius**: Area of operation.
- **baseDeliveryFee**: Dynamic pricing base.

### 6. Roles (`roles`)
Admin RBAC (Role-Based Access Control).
- **name**: String (e.g., "Operations Manager").
- **permissions**: Array of strings (`['manage_users', 'view_orders']`).

### 7. Coupons & VendorCoupons (`coupons`, `vendorcoupons`)
Promotional engines.
- **discountType**, **discountValue**, **expiryDate**.
- **isFirstOrderOnly**, **isFreeDelivery**, **applicableZone**.

### 8. Tickets (`tickets`)
Customer support issue tracking.
- **ticketNumber**, **assignedStaff**, **priority**, **status**, **resolution**.

### 9. Settlements (`vendorsettlements`, `payouts`)
Financial reconciliation for Vendors and Drivers.
- **amount**, **commission**, **status**, **periodStart**, **periodEnd**.
