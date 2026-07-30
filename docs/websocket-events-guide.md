# Real-Time WebSocket Events Guide (Socket.IO)

This document serves as the mini-spec for all real-time events used in the Rideal Delivery platform. It outlines how the Customer, Restaurant, and Delivery Partner apps should connect to the WebSocket server and listen for critical lifecycle events.

---

## 1. Connection & Authentication

**Connection URL:** 
```
ws://localhost:6030
```

**Setup:**
Upon successful login (and receiving the JWT), the client should immediately connect to the Socket.IO server and emit a `join` event to subscribe to their specific real-time room.

### Emit: `join`
The client sends this event to the server to join a room.
- **Payload:** `userId` (String). The MongoDB `_id` of the user, restaurant, or driver.
- **Example:** 
  ```javascript
  const socket = io("http://localhost:6030");
  socket.emit('join', "65f2c418b345a9b12...");
  ```
- **Note for Restaurants:** Restaurants should join using a prefixed ID: `socket.emit('join', 'restaurant_' + restaurantId)` so they receive order notifications specific to their store.

---

## 2. Events Received by CUSTOMER APP

The Customer App listens for order updates to show toast notifications and update the live tracking map.

### Event: `order_update`
Fired whenever the status of the customer's active order changes.
- **Payload:**
  ```json
  {
    "orderId": "65f3a...",
    "status": "accepted | preparing | ready | driver_assigned | picked_up | out_for_delivery | delivered | cancelled",
    "message": "Human-readable status message"
  }
  ```
- **Triggers:**
  - **`accepted`**: When the restaurant accepts the order. *(Message: "Your order was accepted by the restaurant")*
  - **`rejected`**: When the restaurant rejects the order. *(Message: "Your order was rejected: <Reason>")*
  - **`preparing`**: When the restaurant starts preparing the food. *(Message: "Your order is being prepared")*
  - **`ready`**: When the food is ready for pickup. *(Message: "Your order is ready for pickup")*
  - **`driver_assigned`**: When the auto-assignment engine finds a driver. *(Message: "A delivery partner has been assigned to your order.")*
  - **`picked_up`**: When the driver picks up the food from the restaurant. *(Message: "Order picked up")*
  - **`out_for_delivery`**: When the driver is en-route to the customer. *(Message: "Order is out for delivery")*
  - **`delivered`**: When the OTP is verified and food is handed over. *(Message: "Order delivered successfully!")*

---

## 3. Events Received by RESTAURANT APP

The Restaurant Vendor App listens for new incoming orders and cancellations.

### Event: `new_order`
Fired instantly when a customer successfully checks out and completes payment.
- **Payload:**
  ```json
  {
    "orderId": "65f3a...",
    "amount": 450,
    "message": "New order received!"
  }
  ```
- **Action:** The restaurant tablet/app should play a ringing sound and refresh the "Pending Orders" tab.

### Event: `order_cancelled`
Fired if the admin or customer cancels the order before preparation begins.
- **Payload:**
  ```json
  {
    "orderId": "65f3a...",
    "message": "Order was cancelled by the user."
  }
  ```

### Event: `order_update`
Fired to notify the restaurant about driver-related changes (e.g., driver assigned, driver picked up).
- **Payload:**
  ```json
  {
    "orderId": "65f3a...",
    "status": "driver_assigned | picked_up",
    "message": "Status update message"
  }
  ```

---

## 4. Events Received by DELIVERY PARTNER APP

The Driver App listens for new delivery assignments and status updates.

### Event: `order_update` (New Delivery Assignment)
Fired when the Auto-Assign engine allocates an order to the driver.
- **Payload:**
  ```json
  {
    "orderId": "65f3a...",
    "status": "driver_assigned",
    "message": "New Delivery Assigned!"
  }
  ```
- **Action:** The driver app should trigger a push notification / ringing screen showing the restaurant location and customer distance, prompting them to Accept or Reject.

---

## 5. (Future) Live Location Tracking

*While not explicitly emitting continuous GPS pings via sockets currently (as we rely on standard polling or driver status updates), the infrastructure is ready.*
To implement live tracking on the map:
- The driver app will emit `location_update` with `{ lat, lng, heading }`.
- The server will broadcast this to the Customer's room.
- Currently, location updates are handled via HTTP `PUT /api/partner/location` and the customer polls `/api/order/:id/track`.
