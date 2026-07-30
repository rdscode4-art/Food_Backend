# Authentication Integration Guide (End-to-End)

This document provides a comprehensive guide for frontend developers (Web & Mobile) on how to integrate the authentication flow with the Rideal Delivery backend.

## 1. Overview of Tokens

The system uses a **Dual-Token Architecture**:
- **Access Token:** Short-lived JWT (e.g., expires in 15 minutes). Sent in the response body. Used to authenticate API requests.
- **Refresh Token:** Long-lived JWT (e.g., expires in 7 days). Set automatically by the server as an **HTTP-only cookie**. Used to obtain a new Access Token without requiring the user to log in again.

---

## 2. Signup & OTP Flow

### Step 1: Initial Registration
The user submits their basic details.
- **Endpoint:** `POST /api/auth/signup`
- **Body:** `{ "name": "John Doe", "email": "john@example.com", "password": "pass", "phone": "1234567890" }`
- **Response:** Returns `201 Created` with a success message. 
  - *Note for Devs:* In the current development environment, the `code` (OTP) is temporarily returned in the JSON response body to bypass actual email verification. In production, this will be removed and sent via email/SMS.

### Step 2: OTP Verification
The user enters the OTP they received.
- **Endpoint:** `POST /api/auth/verify-otp`
- **Body:** `{ "email": "john@example.com", "code": "1234", "purpose": "signup" }`
- **Response:** Returns `200 OK`. 
  - The response body will contain the **Access Token** and user data.
  - The server will automatically attach a `Set-Cookie` header containing the **Refresh Token**.

---

## 3. Login Flow

When an existing user logs in:
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ "email": "john@example.com", "password": "pass" }`
- **Response:** Returns `200 OK`.
  - The response body contains `{ success: true, data: { accessToken: "eyJhb...", user: {...} }, message: "...", error: null }`.
  - The **Refresh Token** is set via an HTTP-only cookie (`refreshToken=eyJhb...`).

**Frontend Responsibility:**
- Save the `accessToken` in memory (e.g., Redux, Context API) or secure local storage.
- Do **NOT** attempt to read the `refreshToken` manually (it's HTTP-only and inaccessible to JS, protecting against XSS).

---

## 4. Attaching the Access Token

For all protected routes, the frontend must attach the Access Token in the HTTP headers.

**Header Format:**
```
Authorization: Bearer <YOUR_ACCESS_TOKEN>
```

**Example (Axios):**
```javascript
axios.get('/api/consumer/dashboard', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

---

## 5. Token Expiration & 401 Handling (The Refresh Flow)

When the Access Token expires, the backend will return a `401 Unauthorized` or `403 Forbidden` status. 

**Frontend Interceptor Logic (How to handle 401s):**
1. The frontend makes an API call.
2. The server responds with `401 Unauthorized` (or `403` with a specific expired token message).
3. The frontend catches this error and **pauses** all outgoing requests.
4. The frontend makes a call to the refresh endpoint:
   - **Endpoint:** `GET /api/auth/refresh-token`
   - **Important:** Ensure `withCredentials: true` is set in Axios/Fetch so the HTTP-only cookie is sent to the server.
5. If the refresh request is **successful (200 OK)**:
   - The server returns a **new** `accessToken`.
   - Update the saved `accessToken` in memory.
   - Retry the original paused API requests with the new token.
6. If the refresh request **fails (e.g., Refresh token expired or invalid)**:
   - Clear local user state.
   - Redirect the user to the Login screen.

**Axios Interceptor Example:**
```javascript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Send request to refresh token (browser will auto-attach the HTTP-only cookie)
        const res = await axios.get('http://localhost:6030/api/auth/refresh-token', {
          withCredentials: true 
        });
        
        const newAccessToken = res.data.data.accessToken;
        
        // Update default headers and retry original request
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        
        return api(originalRequest);
      } catch (err) {
        // Refresh token failed, force logout
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 6. Logout Flow

To securely log the user out and invalidate sessions:
- **Endpoint:** `POST /api/auth/logout`
- **Behavior:** The server removes the current refresh token from the database and sends a header to clear the HTTP-only cookie on the client side.
- **Frontend Action:** Clear the `accessToken` from memory and redirect to the Login screen.

*(Optional)* **Logout from all devices:**
- **Endpoint:** `POST /api/auth/logout-all`
- Clears all active sessions for the user across all devices.
