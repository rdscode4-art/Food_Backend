const fs = require('fs');
require('dotenv').config();
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:6030';
let adminToken = '';

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
  console.log("   RUNNING ADMIN API DOCS TESTS          ");
  console.log("=========================================\n");

  await mongoose.connect(process.env.MONGO_URI);
  
  // Seed admin user
  const Admin = mongoose.connection.collection('admins');
  const adminEmail = "admin_test@test.com";
  const existingAdmin = await Admin.findOne({ email: adminEmail });
  
  if (!existingAdmin) {
     const bcrypt = require('bcrypt');
     const passwordHash = await bcrypt.hash('password123', 10);
     await Admin.insertOne({
       name: "Super Admin",
       email: adminEmail,
       password: passwordHash,
       role: 'admin',
       isVerified: true,
       createdAt: new Date(),
       updatedAt: new Date()
     });
     console.log("[DB] Seeded admin account.");
  }

  console.log("--- 1. Authentication ---");
  const loginRes = await apiCall('POST', '/api/auth/login', { email: adminEmail, password: 'password123' });
  if (loginRes.data && loginRes.data.data) {
    adminToken = loginRes.data.data.accessToken;
  }

  const mockId = new mongoose.Types.ObjectId().toString();

  console.log("\n--- 2. Approval Queues ---");
  await apiCall('GET', '/api/admin/restaurant-owners/pending', null, adminToken);
  await apiCall('PUT', `/api/admin/restaurant-owners/${mockId}/approve`, null, adminToken);
  await apiCall('PUT', `/api/admin/restaurant-owners/${mockId}/reject`, null, adminToken);
  await apiCall('GET', '/api/admin/delivery-partners/pending', null, adminToken);
  await apiCall('PUT', `/api/admin/delivery-partners/${mockId}/approve`, null, adminToken);
  await apiCall('PUT', `/api/admin/delivery-partners/${mockId}/reject`, null, adminToken);
  await apiCall('GET', '/api/admin/restaurants/pending', null, adminToken);
  await apiCall('PUT', `/api/admin/restaurants/${mockId}/approve`, null, adminToken);
  await apiCall('PUT', `/api/admin/restaurants/${mockId}/reject`, null, adminToken);

  console.log("\n--- 3. User Moderation ---");
  await apiCall('PUT', `/api/admin/users/${mockId}/suspend`, null, adminToken);
  await apiCall('PUT', `/api/admin/users/${mockId}/unsuspend`, null, adminToken);

  console.log("\n--- 4. Platform Analytics ---");
  await apiCall('GET', '/api/admin/stats', null, adminToken);

  console.log("\n--- 5. Customer & Vendor Management ---");
  await apiCall('GET', '/api/admin/users?role=customer&search=john', null, adminToken);
  await apiCall('PUT', `/api/admin/users/${mockId}/loyalty`, { action: "add", points: 500 }, adminToken);
  await apiCall('PUT', `/api/admin/restaurants/${mockId}/commission`, { commissionRate: 15.5 }, adminToken);

  console.log("\n--- 6. Order & Coupon Management ---");
  await apiCall('PUT', `/api/admin/orders/${mockId}/cancel`, { reason: "Customer requested", refundType: "wallet" }, adminToken);
  await apiCall('POST', '/api/admin/coupons', { code: "FESTIVAL50", discountType: "percentage", discountValue: 50, isFirstOrderOnly: false }, adminToken);

  console.log("\n--- 7. Advanced Configuration & Operations ---");
  await apiCall('GET', '/api/admin/orders/export?startDate=2026-01-01&endDate=2026-12-31', null, adminToken);
  await apiCall('POST', '/api/admin/roles', { name: "Support Manager", permissions: ["view_orders", "manage_tickets"] }, adminToken);
  await apiCall('POST', '/api/admin/zones', { name: "Delhi NCR", baseDeliveryFee: 40 }, adminToken);

  console.log("\n--- 8. Deep Cut System Config & Modules ---");
  await apiCall('POST', '/api/admin/cms', { slug: "privacy-policy", title: "Privacy Policy", content: "<h1>Privacy</h1>" }, adminToken);
  await apiCall('POST', '/api/admin/refund-rules', { name: "Driver Cancellation Rule", triggerStatus: "accepted", initiatorRole: "delivery_partner", refundPercentage: 100 }, adminToken);
  await apiCall('GET', '/api/admin/activity-logs?limit=50', null, adminToken);
  await apiCall('POST', '/api/admin/notifications/templates', { name: "ORDER_ACCEPTED", channel: "push", titleTemplate: "Order {{orderId}} Accepted", bodyTemplate: "Hi {{userName}}, your order is accepted!" }, adminToken);
  await apiCall('POST', '/api/admin/advertisements', { restaurant: mockId, adType: "banner", budget: 5000, startDate: "2026-08-01", endDate: "2026-08-15" }, adminToken);
  await apiCall('POST', '/api/admin/tables', { restaurant: mockId, tableNumber: "T-12", capacity: 4 }, adminToken);

  console.log("\n=========================================");
  console.log("   ADMIN DOCS API TESTS COMPLETE         ");
  console.log("=========================================");
  process.exit(0);
}

runTests();
