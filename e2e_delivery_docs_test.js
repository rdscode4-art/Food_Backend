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
  console.log("   RUNNING DELIVERY API DOCS TESTS       ");
  console.log("=========================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  
  const email = `driver_${Math.floor(Math.random() * 10000)}@test.com`;
  const password = "password123";

  console.log("--- 1. Authentication ---");
  await apiCall('POST', '/api/auth/signup/delivery-partner', {
    name: "John Rider", email, password, phone: "8888888888",
    vehicleType: "bike", vehicleNumber: "AB-12-CD-3456", licenseNumber: "DL123456789",
    aadhaarNumber: "123456789012", panNumber: "ABCDE1234F",
    bankDetails: { accountNumber: "123456789", ifsc: "HDFC000123", bankName: "HDFC" },
    partnerDocuments: ["http://link-to-license.jpg"]
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
  
  // Mark driver as approved
  if (userId) {
     const Driver = mongoose.connection.collection('deliverypartners');
     await Driver.updateOne({ _id: new mongoose.Types.ObjectId(userId) }, { $set: { isApproved: true } });
     console.log("[DB] Driver marked as approved.");
  }

  console.log("\n--- 2. Status & Location Sync ---");
  await apiCall('PUT', '/api/partner/online-status', { isOnline: true }, userToken);
  await apiCall('PUT', '/api/partner/location', { coordinates: [77.615, 12.935] }, userToken);

  console.log("\n--- 3. Job Management & Order Flow ---");
  let orderId = 'dummy-order-id'; // Fallback
  await apiCall('GET', '/api/partner/orders/available', null, userToken);
  await apiCall('PUT', `/api/partner/orders/${orderId}/accept`, null, userToken);
  await apiCall('PUT', `/api/partner/orders/${orderId}/reject`, { reason: "Vehicle Breakdown" }, userToken);
  await apiCall('PUT', `/api/partner/orders/${orderId}/picked-up`, null, userToken);
  await apiCall('PUT', `/api/partner/orders/${orderId}/out-for-delivery`, null, userToken);
  await apiCall('PUT', `/api/partner/orders/${orderId}/deliver`, { deliveryOtp: "1234" }, userToken);

  console.log("\n--- 4. Earnings & Wallet ---");
  await apiCall('GET', '/api/partner/payouts/summary', null, userToken);
  await apiCall('GET', '/api/partner/payouts/history', null, userToken);
  await apiCall('POST', '/api/partner/withdraw', { amount: 500 }, userToken);

  console.log("\n--- 5. Trips & Ratings ---");
  await apiCall('GET', '/api/partner/orders/history', null, userToken);
  await apiCall('GET', '/api/partner/ratings', null, userToken);

  console.log("\n--- 6. Driver Support (Complaints) ---");
  await apiCall('POST', '/api/tickets', { subject: "Payment Delay", description: "My last withdrawal is stuck.", type: "driver" }, userToken);

  console.log("\n--- 7. Profile & Notifications ---");
  await apiCall('GET', '/api/partner/profile', null, userToken);
  await apiCall('PUT', '/api/partner/profile', { vehicleNumber: "MH-12-PQ-9999" }, userToken);
  await apiCall('GET', '/api/notifications', null, userToken);

  console.log("\n=========================================");
  console.log("   DELIVERY DOCS API TESTS COMPLETE      ");
  console.log("=========================================");
  process.exit(0);
}

runTests();
