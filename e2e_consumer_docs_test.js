const fs = require('fs');
require('dotenv').config();

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
    
    if (response.status >= 400 && response.status !== 401 && response.status !== 404) {
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

async function runConsumerDocsTests() {
  console.log("=========================================");
  console.log("   RUNNING CONSUMER APP DOCS API TESTS   ");
  console.log("=========================================\n");

  const email = `consumer_${Math.floor(Math.random() * 10000)}@test.com`;
  const password = "password123";

  console.log("--- 1. Authentication ---");
  await apiCall('POST', '/api/auth/signup', {
    name: "John Consumer", email, password, phone: "9876543210"
  });

  // Since we don't have OTP, we can check the terminal output for the OTP, 
  // but wait! Mongoose automatically creates a user in our DB, and the login might fail if OTP not verified?
  // Let's directly login. If OTP is mandatory, we might need a bypass in E2E.
  // Actually, our previous E2E test found OTP in the response or logs.
  // We can just login directly? No, /api/auth/signup returns the user with isVerified: false, wait, does login work if isVerified: false?
  // Let's see. In my previous `e2e_test.js`, I didn't supply OTP for the Consumer login! 
  // Actually, in `e2e_test.js` I supplied `purpose: 'signup', code: '1234'` (or read it from DB).
  // Wait, I can connect to MongoDB and read the OTP!
  
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI);
  
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

  console.log("\n--- 2. User Profile & Addresses ---");
  await apiCall('GET', '/api/user/profile', null, userToken);
  await apiCall('PUT', '/api/user/profile', { name: "John Updated" }, userToken);
  await apiCall('GET', '/api/user/addresses', null, userToken);
  const addrRes = await apiCall('POST', '/api/user/addresses', {
    label: "Home", street: "123 Main St", city: "Metro", zip: "10001", fullAddress: "123 Main St", location: { type: "Point", coordinates: [77.1, 28.6] }
  }, userToken);
  
  if (addrRes.data && addrRes.data.data) {
    // Determine if it returns the address directly or wrapped in an array
    const addressId = addrRes.data.data._id || (addrRes.data.data.addresses && addrRes.data.data.addresses[0]?._id);
    if (addressId) {
      await apiCall('PUT', `/api/user/addresses/${addressId}`, { isDefault: true }, userToken);
    }
  }
  
  await apiCall('GET', '/api/user/payment-methods', null, userToken);
  await apiCall('POST', '/api/user/payment-methods', { type: "card", details: "4242" }, userToken);

  console.log("\n--- 3. Discovery & Menu ---");
  await apiCall('GET', '/api/restaurants/categories');
  await apiCall('GET', '/api/restaurants/featured');
  await apiCall('GET', '/api/restaurants/fastest');
  await apiCall('GET', '/api/restaurants/popular');
  await apiCall('GET', '/api/restaurants/search?q=burger');
  
  // Need a restaurant ID to fetch menu
  const Vendor = mongoose.connection.collection('vendors');
  const restaurantRes = await mongoose.connection.collection('restaurants').findOne({});
  let restaurantId = '';
  let menuItemId = '';
  if (restaurantRes) {
    restaurantId = restaurantRes._id.toString();
    await apiCall('GET', `/api/restaurants/${restaurantId}`);
    const menuRes = await apiCall('GET', `/api/menu/${restaurantId}`);
    if (menuRes.data && menuRes.data.data && menuRes.data.data.length > 0) {
       menuItemId = menuRes.data.data[0]._id;
       await apiCall('GET', `/api/menu/item/${menuItemId}`);
    }
  }

  console.log("\n--- 4. Cart ---");
  await apiCall('DELETE', '/api/cart', null, userToken); // Clear cart
  if (menuItemId) {
    await apiCall('POST', '/api/cart', { menuItemId, quantity: 1 }, userToken);
    const cartRes = await apiCall('GET', '/api/cart', null, userToken);
    if (cartRes.data && cartRes.data.data && cartRes.data.data.items && cartRes.data.data.items.length > 0) {
      const cartItemId = cartRes.data.data.items[0]._id;
      await apiCall('PUT', `/api/cart/${cartItemId}`, { quantity: 2 }, userToken);
    }
  }
  await apiCall('GET', '/api/cart', null, userToken);

  console.log("\n--- 5. Wishlist ---");
  await apiCall('GET', '/api/wishlist', null, userToken);
  if (restaurantId) {
    await apiCall('POST', '/api/wishlist/toggle', { itemType: "restaurant", itemId: restaurantId }, userToken);
  }

  console.log("\n--- 6. Notifications ---");
  const notifRes = await apiCall('GET', '/api/notifications', null, userToken);
  if (notifRes.data && notifRes.data.data && notifRes.data.data.length > 0) {
    await apiCall('PUT', `/api/notifications/${notifRes.data.data[0]._id}/read`, null, userToken);
  }
  await apiCall('PUT', '/api/notifications/read-all', null, userToken);

  console.log("\n--- 7. Wallet ---");
  await apiCall('GET', '/api/wallet', null, userToken);
  await apiCall('POST', '/api/wallet/add', { amount: 500 }, userToken);
  await apiCall('GET', '/api/wallet/transactions', null, userToken);

  console.log("\n--- 8. Coupons & Offers ---");
  await apiCall('GET', '/api/coupons', null, userToken);
  // Fake apply coupon
  await apiCall('POST', '/api/coupons/apply', { code: "WELCOME50" }, userToken);

  console.log("\n--- 9. Checkout & Orders ---");
  let orderId = '';
  const checkoutRes = await apiCall('POST', '/api/order/checkout', {
    deliveryAddress: { label: "Home", street: "123", city: "Mumbai", zip: "400", location: { type: "Point", coordinates: [72, 19] } },
    paymentMethod: "card", deliveryInstructions: "Leave at door", isScheduled: false, orderType: "delivery"
  }, userToken);
  
  if (checkoutRes.status === 201 && checkoutRes.data && checkoutRes.data.data) {
    orderId = checkoutRes.data.data._id || checkoutRes.data.data.order?._id;
  }
  
  await apiCall('GET', '/api/order', null, userToken);
  if (orderId) {
    await apiCall('GET', `/api/order/${orderId}`, null, userToken);
    await apiCall('GET', `/api/order/${orderId}/track`, null, userToken);
    await apiCall('GET', `/api/order/${orderId}/help`, null, userToken);
    // await apiCall('PUT', `/api/order/${orderId}/cancel`, null, userToken);
  }

  console.log("\n--- 10. Memberships ---");
  await apiCall('GET', '/api/membership');

  console.log("\n--- 11. Customer Support Tickets ---");
  const ticketRes = await apiCall('POST', '/api/tickets', {
    subject: "Missing Item", description: "Fries are missing", orderId: orderId || null
  }, userToken);
  await apiCall('GET', '/api/tickets', null, userToken);
  if (ticketRes.data && ticketRes.data.data) {
    await apiCall('POST', `/api/tickets/${ticketRes.data.data._id}/reply`, { message: "Hello" }, userToken);
  }

  console.log("\n--- 12. Static & Zones ---");
  await apiCall('GET', '/api/static/banners');
  await apiCall('GET', '/api/static/app-config');
  await apiCall('GET', '/api/static/faq');
  await apiCall('GET', '/api/zones');

  console.log("\n=========================================");
  console.log("   CONSUMER DOCS API TESTS COMPLETE      ");
  console.log("=========================================");
  process.exit(0);
}

runConsumerDocsTests();
