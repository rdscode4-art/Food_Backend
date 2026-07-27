# Deployment Documentation

This guide provides instructions for deploying the Rideal Multi-Vendor Food Delivery Backend to a production environment.

## 1. Prerequisites
- **Node.js**: v18.x or higher
- **MongoDB**: v5.x or higher (MongoDB Atlas recommended)
- **Redis**: For caching and rate limiting (Optional but recommended)
- **PM2**: For process management (`npm install -g pm2`)
- **Nginx**: As a reverse proxy

## 2. Environment Setup

Create a `.env` file in the root directory and configure the following variables:
```env
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rideal_prod
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d
SOCKET_PORT=5001

# Cloudinary / AWS S3 for Image Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Gateway (Razorpay/Stripe)
PAYMENT_GATEWAY_KEY=your_key
PAYMENT_GATEWAY_SECRET=your_secret
```

## 3. Server Preparation

Clone the repository to your production server (e.g., AWS EC2, DigitalOcean Droplet).
```bash
git clone <repository_url> rideal-backend
cd rideal-backend
npm install --production
```

## 4. Starting the Application

Use PM2 to start and manage the Node.js process to ensure it runs continuously and restarts on failure.
```bash
pm2 start src/server.js --name "rideal-backend"
pm2 save
pm2 startup
```

## 5. Nginx Reverse Proxy Configuration

Configure Nginx to route external HTTP/HTTPS traffic to the Node.js application running on port 5000.

Create a new file `/etc/nginx/sites-available/rideal`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/rideal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 6. SSL Configuration (Certbot)
Secure the API with HTTPS using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

## 7. Database Backups
It is highly recommended to use MongoDB Atlas automated backups. If self-hosting, set up a cron job using `mongodump` to back up the database daily and upload to AWS S3.
