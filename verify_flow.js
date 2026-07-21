const fetch = globalThis.fetch;

async function runTest() {
  const baseUrl = 'http://127.0.0.1:6030/api';
  console.log('Starting End-to-End Flow Verification...');

  try {
    // 1. Admin login (to approve everything)
    const adminRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fastfood.com', password: 'password123' })
    });
    const adminData = await adminRes.json();
    if (!adminData.success) throw new Error('Admin login failed: ' + adminData.message);
    const adminToken = adminData.data.accessToken;
    console.log('✅ Admin logged in');

    // 2. Owner login
    const ownerRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'john@burgerking.com', password: 'password123' })
    });
    const ownerData = await ownerRes.json();
    if (!ownerData.success) throw new Error('Owner login failed');
    const ownerToken = ownerData.data.accessToken;
    console.log('✅ Owner logged in');

    // Get owner's restaurant ID
    const myRestRes = await fetch(`${baseUrl}/owner/restaurant`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const myRestData = await myRestRes.json();
    if (!myRestData.success) throw new Error('Failed to get owner restaurant');
    const restaurantId = myRestData.data._id;
    console.log('✅ Got restaurant:', restaurantId);

    // Get restaurant menu
    const menuRes = await fetch(`${baseUrl}/owner/restaurant/menu`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const menuData = await menuRes.json();
    if (!menuData.success || menuData.data.length === 0) throw new Error('No menu items found');
    const menuItemId = menuData.data[0]._id;
    console.log('✅ Got menu item:', menuItemId);

    // 3. Customer signup & login (or use existing customer if seed creates one)
    // Actually, seed.js didn't explicitly mention creating a customer, let me signup one
    let customerToken;
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Cust', email: 'cust@fastfood.com', password: 'password123', phone: '9999999999' })
    });
    const signupData = await signupRes.json();
    if (signupData.success || signupData.message.includes('already registered')) {
        // Since OTP is required, I should bypass OTP for testing or use a direct db edit.
        // Let's modify DB directly for the customer
        const mongoose = require('mongoose');
        const bcrypt = require('bcrypt');
        const env = require('dotenv').config();
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fastfood';
        await mongoose.connect(mongoUri);
        const User = require('./src/models/User');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        const cust = await User.findOneAndUpdate({ email: 'cust@fastfood.com' }, { isVerified: true, password: hashedPassword, role: 'customer' }, { new: true, upsert: true });
        
        // now login
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'cust@fastfood.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        console.log("LOGIN DATA:", loginData);
        customerToken = loginData.data.accessToken;
        console.log('✅ Customer logged in');
    } else {
        throw new Error('Customer signup failed: ' + signupData.message);
    }

    // Customer: create address
    const addAddress = await fetch(`${baseUrl}/user/addresses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Home', street: '123 Test St', city: 'Test', zip: '12345', fullAddress: '123 Test St', location: { type: 'Point', coordinates: [77.2090, 28.6139] } })
    });
    const addAddressData = await addAddress.json();
    console.log('Address creation response:', addAddressData);
    if (!addAddressData.success) throw new Error('Address failed: ' + addAddressData.message);
    const addressId = addAddressData.data._id;
    console.log('✅ Customer created address');

    // Customer: add to cart
    const addToCart = await fetch(`${baseUrl}/cart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItemId, quantity: 2, restaurantId })
    });
    const cartData = await addToCart.json();
    if (!cartData.success) throw new Error('Add to cart failed: ' + cartData.message);
    console.log('✅ Added to cart');

    // Customer: checkout
    const checkoutRes = await fetch(`${baseUrl}/order/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId, paymentMethod: 'cod' })
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutData.success) throw new Error('Checkout failed: ' + checkoutData.message);
    const orderId = checkoutData.data._id;
    console.log('✅ Order placed:', orderId);

    // 4. Owner handles order
    await fetch(`${baseUrl}/owner/orders/${orderId}/accept`, { method: 'PUT', headers: { Authorization: `Bearer ${ownerToken}` }});
    console.log('✅ Owner accepted');
    await fetch(`${baseUrl}/owner/orders/${orderId}/preparing`, { method: 'PUT', headers: { Authorization: `Bearer ${ownerToken}` }});
    console.log('✅ Owner preparing');
    await fetch(`${baseUrl}/owner/orders/${orderId}/ready`, { method: 'PUT', headers: { Authorization: `Bearer ${ownerToken}` }});
    console.log('✅ Owner ready');

    // 5. Partner handles order
    const partnerRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'raju@delivery.com', password: 'password123' })
    });
    const partnerData = await partnerRes.json();
    const partnerToken = partnerData.data.accessToken;

    await fetch(`${baseUrl}/partner/online-status`, { method: 'PUT', headers: { Authorization: `Bearer ${partnerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ isOnline: true }) });
    await fetch(`${baseUrl}/partner/location`, { method: 'PUT', headers: { Authorization: `Bearer ${partnerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ coordinates: [77.2090, 28.6139] }) });
    console.log('✅ Partner online and location set');

    const jobsRes = await fetch(`${baseUrl}/partner/orders/available`, { headers: { Authorization: `Bearer ${partnerToken}` }});
    const jobsData = await jobsRes.json();
    console.log('Jobs fetch response:', jobsData);
    if (!jobsData.success) throw new Error('Jobs fetch failed: ' + jobsData.message);
    console.log('Jobs available:', jobsData.data.length);

    const acceptRes = await fetch(`${baseUrl}/partner/orders/${orderId}/accept`, { method: 'PUT', headers: { Authorization: `Bearer ${partnerToken}` }});
    const acceptData = await acceptRes.json();
    if (!acceptData.success) throw new Error('Partner accept failed: ' + acceptData.message);
    console.log('✅ Partner accepted');

    await fetch(`${baseUrl}/partner/orders/${orderId}/picked-up`, { method: 'PUT', headers: { Authorization: `Bearer ${partnerToken}` }});
    await fetch(`${baseUrl}/partner/orders/${orderId}/out-for-delivery`, { method: 'PUT', headers: { Authorization: `Bearer ${partnerToken}` }});
    await fetch(`${baseUrl}/partner/orders/${orderId}/deliver`, { method: 'PUT', headers: { Authorization: `Bearer ${partnerToken}` }});
    console.log('✅ Partner delivered');

    // 6. Customer Review
    const reviewRes = await fetch(`${baseUrl}/order/${orderId}/review`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, comment: 'Great!' })
    });
    const reviewData = await reviewRes.json();
    if (!reviewData.success) throw new Error('Review failed: ' + reviewData.message);
    console.log('✅ Customer reviewed');

    console.log('🎉 ALL FLOWS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  }
}

runTest();
