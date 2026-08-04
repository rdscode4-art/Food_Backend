const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const { errorHandler } = require('./middlewares/error.middleware');

// Routes
const authRoutes = require('./routes/auth.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const menuRoutes = require('./routes/menu.routes');
const adminRoutes = require('./routes/admin.routes');
const ownerRoutes = require('./routes/owner.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const walletRoutes = require('./routes/wallet.routes');
const couponRoutes = require('./routes/coupon.routes');
const ticketRoutes = require('./routes/ticket.routes');
const membershipRoutes = require('./routes/membership.routes');
const wishlistRoutes = require('./routes/wishlist.routes');
const cartRoutes = require('./routes/cart.routes');
const userRoutes = require('./routes/user.routes');
const orderRoutes = require('./routes/order.routes');
const partnerRoutes = require('./routes/partner.routes');
const staticRoutes = require('./routes/static.routes');
const vendorCouponRoutes = require('./routes/vendorCoupon.routes');
const vendorSettlementRoutes = require('./routes/vendorSettlement.routes');
const zoneRoutes = require('./routes/zone.routes');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Permissive CORS: Allows access from ANY port/domain.
// In the future, you can replace `true` with an array of specific domains for strict security.
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(helmet());
app.use(morgan('dev'));

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/membership', membershipRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/user', userRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/static', staticRoutes);
// Vendor specific advanced routes mounted on /api/owner
app.use('/api/owner', vendorCouponRoutes);
app.use('/api/owner', vendorSettlementRoutes);
app.use('/api/zones', zoneRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Fast Food API is running' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;
