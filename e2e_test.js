const mongoose = require('mongoose');
// Node 22 has built in fetch

require('dotenv').config();
const MONGODB_URI = process.env.MONGO_URI;
const BASE_URL = 'http://localhost:6030';

let consumerToken = '';
let vendorToken = '';
let driverToken = '';
let adminToken = '';

let consumerId = '';
let vendorId = '';
let driverId = '';
let adminId = '';

let restaurantId = '';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiCall(method, endpoint, payload = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (payload) options.body = JSON.stringify(payload);

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    
    console.log(`[${method}] ${endpoint} -> ${res.status}`);
    if (res.status >= 400) {
      console.log(`Error Response:`, data);
    }
    return { status: res.status, data };
  } catch (error) {
    console.error(`[${method}] ${endpoint} -> FAILED:`, error.message);
    return { status: 500, data: null };
  }
}

async function runTests() {
  console.log("Connecting to Database for E2E Tests...");
  await mongoose.connect(MONGODB_URI);
  console.log("Database connected.");

  // Import models after mongoose connection
  const Otp = require('./src/models/Otp');
  const Consumer = require('./src/models/Consumer');
  const Vendor = require('./src/models/Vendor');
  const DeliveryPartner = require('./src/models/DeliveryPartner');
  const Admin = require('./src/models/Admin');
  
  const testId = Math.floor(Math.random() * 10000);
  const consumerEmail = `consumer_${testId}@test.com`;
  const vendorEmail = `vendor_${testId}@test.com`;
  const driverEmail = `driver_${testId}@test.com`;
  const adminEmail = `admin_${testId}@test.com`;
  const password = "password123";

  console.log("\n=============================");
  console.log("1. TESTING CONSUMER APIs");
  console.log("=============================");
  
  // 1a. Consumer Signup
  await apiCall('POST', '/api/auth/signup', {
    name: "Test Consumer", email: consumerEmail, password, phone: "1111111111"
  });

  // Get OTP from DB
  let otpRecord = await Otp.findOne({ email: consumerEmail, purpose: 'signup' }).sort({ createdAt: -1 });
  
  // 1b. Verify OTP
  await apiCall('POST', '/api/auth/verify-otp', {
    email: consumerEmail, code: otpRecord.code, purpose: 'signup'
  });

  // 1c. Consumer Login
  let res = await apiCall('POST', '/api/auth/login', { email: consumerEmail, password });
  if (res.status === 200) {
    consumerToken = res.data.data.accessToken;
    consumerId = res.data.data.user._id;
  }

  // 1d. Get Profile
  await apiCall('GET', '/api/user/profile', null, consumerToken);

  console.log("\n=============================");
  console.log("2. TESTING VENDOR APIs");
  console.log("=============================");
  
  // 2a. Vendor Signup
  await apiCall('POST', '/api/auth/signup/restaurant-owner', {
    name: "Test Vendor", email: vendorEmail, password, phone: "2222222222", businessName: "Test Restro"
  });

  // Get OTP from DB
  otpRecord = await Otp.findOne({ email: vendorEmail, purpose: 'signup' }).sort({ createdAt: -1 });
  
  // 2b. Verify OTP
  await apiCall('POST', '/api/auth/verify-otp', {
    email: vendorEmail, code: otpRecord.code, purpose: 'signup'
  });

  // Admin Approval Bypass using DB
  await Vendor.findOneAndUpdate({ email: vendorEmail }, { isApproved: true });

  // 2c. Vendor Login
  res = await apiCall('POST', '/api/auth/login', { email: vendorEmail, password });
  if (res.status === 200) {
    vendorToken = res.data.data.accessToken;
    vendorId = res.data.data.user._id;
  }

  // 2d. Create Restaurant
  res = await apiCall('POST', '/api/owner/restaurant', {
    name: "Test Restro Branch 1", brandName: "Test Restro", address: "123 Street", location: { type: "Point", coordinates: [77,28] }
  }, vendorToken);
  
  if (res.status === 201) {
    restaurantId = res.data.data._id;
    // 2e. Add Menu Item
    await apiCall('POST', `/api/owner/restaurant/${restaurantId}/menu`, {
      name: "Burger", price: 150, category: "Fast Food", stockCount: 50
    }, vendorToken);
  }

  console.log("\n=============================");
  console.log("3. TESTING DRIVER APIs");
  console.log("=============================");

  // 3a. Driver Signup
  await apiCall('POST', '/api/auth/signup/delivery-partner', {
    name: "Test Driver", email: driverEmail, password, phone: "3333333333", vehicleType: "bike", vehicleNumber: "DL-1234", licenseNumber: "LIC1234", partnerDocuments: ["doc.jpg"], aadhaarNumber: "1234", panNumber: "PAN123"
  });

  otpRecord = await Otp.findOne({ email: driverEmail, purpose: 'signup' }).sort({ createdAt: -1 });
  await apiCall('POST', '/api/auth/verify-otp', { email: driverEmail, code: otpRecord.code, purpose: 'signup' });

  // Admin Approval Bypass using DB
  await DeliveryPartner.findOneAndUpdate({ email: driverEmail }, { isApproved: true });

  // 3b. Driver Login
  res = await apiCall('POST', '/api/auth/login', { email: driverEmail, password });
  if (res.status === 200) driverToken = res.data.data.accessToken;

  // 3c. Driver Toggle Online
  await apiCall('PUT', '/api/partner/online-status', { isOnline: true }, driverToken);


  console.log("\n=============================");
  console.log("4. TESTING ADMIN APIs");
  console.log("=============================");

  // Creating an admin directly via DB to test Admin APIs
  const bcrypt = require('bcrypt');
  const hashed = await bcrypt.hash(password, 10);
  await Admin.create({
    name: "Super Admin", email: adminEmail, password: hashed, role: "admin", isVerified: true, isApproved: true
  });

  // Admin Login
  res = await apiCall('POST', '/api/auth/login', { email: adminEmail, password });
  if (res.status === 200) adminToken = res.data.data.accessToken;

  // 4a. Admin Dashboard Stats
  await apiCall('GET', '/api/admin/dashboard', null, adminToken);

  // 4b. Admin Get Pending Vendors
  await apiCall('GET', '/api/admin/restaurant-owners/pending', null, adminToken);


  console.log("\n=============================");
  console.log("TESTING COMPLETE");
  console.log("=============================");

  mongoose.disconnect();
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  mongoose.disconnect();
});
