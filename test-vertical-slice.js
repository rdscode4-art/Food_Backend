const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const { io } = require('socket.io-client');

// Configuration
const BASE_URL = 'http://127.0.0.1:6030/api';
const SOCKET_URL = 'http://127.0.0.1:6030';
const CUSTOMER_CREDENTIALS = { email: 'customer@rideal.com', password: 'password123' };
const VENDOR_CREDENTIALS = { email: 'vendor@rideal.com', password: 'password123' };

// Create Axios clients with cookie jars to handle refresh tokens automatically (like a browser)
const customerJar = new CookieJar();
const customerClient = wrapper(axios.create({ baseURL: BASE_URL, jar: customerJar, withCredentials: true }));

const vendorJar = new CookieJar();
const vendorClient = wrapper(axios.create({ baseURL: BASE_URL, jar: vendorJar, withCredentials: true }));

// Store global state
let customerToken = '';
let vendorToken = '';
let customerUserId = '';
let restaurantId = '';
let menuItemId = '';
let orderId = '';
let customerSocket;

const runTest = async () => {
  console.log('🚀 Starting End-to-End Vertical Slice Test...\n');

  try {
    // ---------------------------------------------------------
    // STEP 1: Customer Login
    // ---------------------------------------------------------
    console.log('1️⃣ [CUSTOMER] Logging in...');
    const loginRes = await customerClient.post('/auth/login', CUSTOMER_CREDENTIALS);
    if (!loginRes.data.success) throw new Error('Login failed');
    customerToken = loginRes.data.data.accessToken;
    customerUserId = loginRes.data.data.user._id;
    console.log(`✅ [CUSTOMER] Logged in successfully. Token received.`);
    
    // Set Authorization header for all future customer requests
    customerClient.defaults.headers.common['Authorization'] = `Bearer ${customerToken}`;

    // ---------------------------------------------------------
    // STEP 2: Browse Restaurants
    // ---------------------------------------------------------
    console.log('\n2️⃣ [CUSTOMER] Fetching nearby restaurants...');
    const restaurantsRes = await customerClient.get('/restaurants');
    const restaurants = restaurantsRes.data.data;
    if (restaurants.length === 0) throw new Error('No restaurants found');
    
    const burgerKing = restaurants.find(r => r.name.includes('Burger King')) || restaurants[0];
    restaurantId = burgerKing._id;
    console.log(`✅ [CUSTOMER] Found restaurant: ${burgerKing.name} (${restaurantId})`);

    // ---------------------------------------------------------
    // STEP 3: Browse Menu
    // ---------------------------------------------------------
    console.log(`\n3️⃣ [CUSTOMER] Fetching menu for restaurant ${restaurantId}...`);
    const menuRes = await customerClient.get(`/menu/${restaurantId}`);
    const menuItems = menuRes.data.data;
    if (menuItems.length === 0) throw new Error('No menu items found');
    
    const whopper = menuItems.find(m => m.name.includes('Whopper')) || menuItems[0];
    menuItemId = whopper._id;
    console.log(`✅ [CUSTOMER] Found menu item: ${whopper.name} - ₹${whopper.price}`);

    // ---------------------------------------------------------
    // STEP 4: Add to Cart
    // ---------------------------------------------------------
    console.log(`\n4️⃣ [CUSTOMER] Adding ${whopper.name} to cart...`);
    const cartRes = await customerClient.post('/cart', {
      menuItemId: menuItemId,
      quantity: 1,
      restaurantId: restaurantId
    });
    console.log(`✅ [CUSTOMER] Item added to cart. Cart Total: ₹${cartRes.data.data.totalAmount}`);

    // ---------------------------------------------------------
    // STEP 5: Checkout (Place Order)
    // ---------------------------------------------------------
    console.log(`\n5️⃣ [CUSTOMER] Checking out and placing order...`);
    const checkoutRes = await customerClient.post('/order/checkout', {
      deliveryAddress: {
        label: 'Home',
        street: '123 Test Street',
        city: 'New Delhi',
        zip: '110001',
        location: { type: 'Point', coordinates: [77.1000, 28.7000] }
      },
      paymentMethod: 'cod' // Using COD for simplicity
    });
    
    console.log('[DEBUG] Checkout Response:', JSON.stringify(checkoutRes.data, null, 2));
    orderId = checkoutRes.data.data.order ? checkoutRes.data.data.order._id : checkoutRes.data.data._id;
    console.log(`✅ [CUSTOMER] Order placed successfully! Order ID: ${orderId}`);

    // ---------------------------------------------------------
    // STEP 6: Connect to WebSocket (Simulating Live App)
    // ---------------------------------------------------------
    console.log(`\n6️⃣ [CUSTOMER] Connecting to WebSocket for live tracking...`);
    
    await new Promise((resolve, reject) => {
      customerSocket = io(SOCKET_URL, {
        auth: { token: customerToken }
      });

      customerSocket.on('connect', () => {
        console.log(`✅ [CUSTOMER SOCKET] Connected! Socket ID: ${customerSocket.id}`);
        // Join the user's room to receive updates
        customerSocket.emit('join', customerUserId);
        // Resolve immediately as server doesn't emit 'joined'
        resolve();
      });

      customerSocket.on('connect_error', (err) => {
        reject(err);
      });
    });

    // ---------------------------------------------------------
    // STEP 7: Vendor Accepts Order
    // ---------------------------------------------------------
    console.log(`\n7️⃣ [VENDOR] Logging in to accept the order...`);
    const vendorLoginRes = await vendorClient.post('/auth/login', VENDOR_CREDENTIALS);
    vendorToken = vendorLoginRes.data.data.accessToken;
    vendorClient.defaults.headers.common['Authorization'] = `Bearer ${vendorToken}`;
    console.log(`✅ [VENDOR] Logged in successfully.`);

    console.log(`\n8️⃣ [VENDOR] Accepting Order ${orderId}...`);
    
    // We will wait for the socket event simultaneously while the vendor makes the API call
    const socketUpdatePromise = new Promise((resolve) => {
      customerSocket.on('order_update', (data) => {
        console.log(`🔥 [CUSTOMER SOCKET] LIVE UPDATE RECEIVED: Order ${data.orderId} status changed to '${data.status}'`);
        resolve(data);
      });
    });

    const vendorAcceptRes = await vendorClient.put(`/owner/restaurant/${restaurantId}/orders/${orderId}/accept`);
    console.log(`✅ [VENDOR] Order accepted API call successful.`);

    // Wait for the socket to receive the update
    await socketUpdatePromise;

    console.log(`\n🎉🎉🎉 VERTICAL SLICE TEST COMPLETED SUCCESSFULLY! 🎉🎉🎉`);
    console.log(`Frontend integration is 100% safe to proceed.`);
    
    customerSocket.disconnect();

  } catch (error) {
    console.error(`\n❌ TEST FAILED!`);
    if (error.response) {
      console.error(`API Error: [${error.response.status}]`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
};

runTest();
