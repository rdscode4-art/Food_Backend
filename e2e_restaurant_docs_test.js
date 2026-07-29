const fs = require('fs');
require('dotenv').config();
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:6030';
let userToken = '';
let userId = '';

async function apiCall(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const text = await response.text();
    let data = null;
    try { data = JSON.parse(text); } catch(e) {}
    
    if (response.status >= 400 && response.status !== 401 && response.status !== 404 && response.status !== 403) {
      console.log(`[${method}] ${path} -> ${response.status} | ERROR: ${text.substring(0, 200)}`);
    } else {
      console.log(`[${method}] ${path} -> ${response.status}`);
    }
    return { status: response.status, data };
  } catch (error) {
    console.error(`[${method}] ${path} -> FAILED:`, error.message);
    return { status: 500, data: null };
  }
}

async function runTests() {
  console.log("=========================================");
  console.log("   RUNNING RESTAURANT API DOCS TESTS     ");
  console.log("=========================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  
  const email = `vendor_${Math.floor(Math.random() * 10000)}@test.com`;
  const password = "password123";

  console.log("--- 1. Authentication ---");
  await apiCall('POST', '/api/auth/signup/restaurant-owner', {
    name: "Jane Owner", email, password, phone: "7777777777", businessName: "Jane Burger Shop"
  });

  const Otp = mongoose.connection.collection('otps');
  const otpDoc = await Otp.findOne({ email, purpose: 'signup' }, { sort: { createdAt: -1 } });
  
  if (otpDoc && otpDoc.code) {
     await apiCall('POST', '/api/auth/verify-otp', { email, code: otpDoc.code.toString(), purpose: 'signup' });
  } else {
     await apiCall('POST', '/api/auth/verify-otp', { email, code: '1234', purpose: 'signup' });
  }

  const loginRes = await apiCall('POST', '/api/auth/login', { email, password });
  if (loginRes.data && loginRes.data.data) {
    userToken = loginRes.data.data.accessToken;
    userId = loginRes.data.data.user._id;
  }
  
  // Mark vendor as approved
  if (userId) {
     const Vendor = mongoose.connection.collection('vendors');
     await Vendor.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { isApproved: true } });
     console.log("[DB] Vendor marked as approved.");
  }

  // Forgot/Reset password
  await apiCall('POST', '/api/auth/forgot-password', { email });
  const resetOtp = await Otp.findOne({ email, purpose: 'reset_password' }, { sort: { createdAt: -1 } });
  if (resetOtp && resetOtp.code) {
      await apiCall('POST', '/api/auth/reset-password', { email, code: resetOtp.code, newPassword: "newpassword123" });
      // login again to get valid token?
      const loginRes2 = await apiCall('POST', '/api/auth/login', { email, password: "newpassword123" });
      userToken = loginRes2.data.data.accessToken;
  }

  console.log("\n--- 2. Restaurant Profile ---");
  const restRes = await apiCall('POST', '/api/owner/restaurant', {
    name: "Jane Burger Shop", brandName: "Jane Burgers", address: "456 Food Ave", 
    location: { type: "Point", coordinates: [77.2, 28.7] }, deliveryFee: 30, minOrder: 100, deliveryRadius: 10
  }, userToken);
  
  await apiCall('GET', '/api/owner/restaurants', null, userToken);
  
  let restaurantId = '';
  if (restRes.data && restRes.data.data) {
      restaurantId = restRes.data.data._id;
  } else {
      // Fallback: get first restaurant
      const Restaurant = mongoose.connection.collection('restaurants');
      const firstRest = await Restaurant.findOne({ owner: new mongoose.Types.ObjectId(userId) });
      if (firstRest) restaurantId = firstRest._id.toString();
  }
  
  if (restaurantId) {
      await apiCall('PUT', `/api/owner/restaurant/${restaurantId}`, { deliveryTime: 35 }, userToken);
      await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/toggle-active`, { status: "Open" }, userToken);
      await apiCall('PUT', `/api/owner/restaurant/${restaurantId}`, { preparationTime: 15 }, userToken); // Phase 3
  }

  console.log("\n--- 3. Menu Management ---");
  let menuItemId = '';
  if (restaurantId) {
      const menuRes = await apiCall('POST', `/api/owner/restaurant/${restaurantId}/menu`, {
        name: "Cheese Burger", price: 150, category: "Burgers", stockCount: 50, autoDisableOnEmpty: true, isCombo: false
      }, userToken);
      if (menuRes.data && menuRes.data.data) menuItemId = menuRes.data.data._id;
      
      await apiCall('GET', `/api/owner/restaurant/${restaurantId}/menu`, null, userToken);
      
      if (menuItemId) {
          await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/menu/${menuItemId}`, { price: 160 }, userToken);
          await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/menu/${menuItemId}/toggle-availability`, null, userToken);
          await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/menu/${menuItemId}`, { lowStockAlert: true, lowStockThreshold: 5 }, userToken); // Phase 3
          // don't delete yet so we can test orders maybe? Or we just test delete endpoint
          // await apiCall('DELETE', `/api/owner/restaurant/${restaurantId}/menu/${menuItemId}`, null, userToken);
      }
  }

  console.log("\n--- 4. Order Management ---");
  let orderId = 'dummy-order-id';
  if (restaurantId) {
      const ordersRes = await apiCall('GET', `/api/owner/restaurant/${restaurantId}/orders`, null, userToken);
      if (ordersRes.data && ordersRes.data.data && ordersRes.data.data.length > 0) {
          orderId = ordersRes.data.data[0]._id;
      }
      
      await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/orders/${orderId}/accept`, { preparationTime: 20 }, userToken);
      await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/orders/${orderId}/reject`, { reason: "Out of stock" }, userToken);
      await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/orders/${orderId}/preparing`, null, userToken);
      await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/orders/${orderId}/ready`, null, userToken);
  }

  console.log("\n--- 5. Analytics ---");
  if (restaurantId) {
      await apiCall('GET', `/api/owner/restaurant/${restaurantId}/dashboard`, null, userToken);
  }

  console.log("\n--- 6. Vendor Coupons ---");
  let couponId = '';
  if (restaurantId) {
      const couponRes = await apiCall('POST', `/api/owner/restaurant/${restaurantId}/coupons`, {
          code: "JANE20", discountType: "percentage", discountValue: 20, startDate: "2023-12-01T00:00:00Z", expiryDate: "2024-12-31T23:59:59Z"
      }, userToken);
      if (couponRes.data && couponRes.data.data) couponId = couponRes.data.data._id;
      
      await apiCall('GET', `/api/owner/restaurant/${restaurantId}/coupons`, null, userToken);
      if (couponId) {
          await apiCall('PUT', `/api/owner/restaurant/${restaurantId}/coupons/${couponId}`, { isActive: false }, userToken);
          await apiCall('DELETE', `/api/owner/restaurant/${restaurantId}/coupons/${couponId}`, null, userToken);
      }
  }

  console.log("\n--- 7. Settlements ---");
  if (restaurantId) {
      await apiCall('GET', `/api/owner/restaurant/${restaurantId}/settlements`, null, userToken);
      await apiCall('POST', `/api/owner/restaurant/${restaurantId}/settlements/generate`, null, userToken);
  }

  console.log("\n--- 9. Dine-In & Tables ---");
  let tableId = '';
  if (restaurantId) {
      await apiCall('GET', `/api/owner/restaurant/${restaurantId}/tables`, null, userToken);
      const tableRes = await apiCall('POST', `/api/owner/restaurant/${restaurantId}/tables`, { tableNumber: "T-01", capacity: 4 }, userToken);
      if (tableRes.data && tableRes.data.data) tableId = tableRes.data.data._id;
      if (tableId) {
          await apiCall('GET', `/api/owner/restaurant/${restaurantId}/tables/${tableId}/qr`, null, userToken);
      }
  }

  console.log("\n--- 10. Reviews & Ratings ---");
  if (restaurantId) {
      await apiCall('GET', `/api/owner/restaurant/${restaurantId}/reviews`, null, userToken);
  }

  console.log("\n--- 11. Sponsored Ads ---");
  if (restaurantId) {
      await apiCall('GET', `/api/owner/restaurant/${restaurantId}/advertisements`, null, userToken);
  }

  console.log("\n=========================================");
  console.log("   RESTAURANT DOCS API TESTS COMPLETE    ");
  console.log("=========================================");
  process.exit(0);
}

runTests();
