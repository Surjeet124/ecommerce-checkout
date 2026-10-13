# E-commerce App (MERN) — Razorpay Test Mode

A full-stack e-commerce app: **MongoDB, Express, React, Node.js**. Users can register, browse and search products, keep a cart that is saved to their account, pay with Razorpay (test mode) and see their order history. Admins can manage products and view all orders.

## Features

- **Auth:** register / login with bcrypt-hashed passwords and JWT (7-day tokens); protected routes on the client and middleware on the server; role-based access (`user` / `admin`)
- **Products:** search and category filter; admin add / edit / delete; stock tracking
- **Cart:** saved in MongoDB per user; guests use a local cart that is merged into the saved one on login
- **Checkout:** Razorpay Orders API + embedded Checkout modal; the server prices the order from the database and verifies the payment signature (HMAC SHA-256, constant-time compare)
- **Orders:** each order stores a snapshot of items and prices; stock is reduced once, only after a verified payment
- **Security basics:** passwords never returned (`select: false`), request-body field whitelisting, search input escaped before use in a regex, generic login error message, JSON body size limit

## Architecture

```
React (Vite)  ──HTTP/JSON + JWT──▶  Express API  ──Mongoose──▶  MongoDB Atlas
   │                                    │
   └── Razorpay Checkout modal          └── Razorpay Orders API (create order, verify signature)
```

```
server/
├── index.js            app setup, routes, error handling
├── config/db.js        MongoDB connection
├── models/             User, Product, Cart, Order
├── middleware/         auth (protect, adminOnly), errorHandler
├── routes/             auth, products, cart, orders
└── seed.js             creates the first admin + sample products
client/src/
├── api.js              fetch wrapper (adds JWT, parses errors)
├── context/            AuthContext, CartContext
├── components/         ProductList, Cart, ProtectedRoute
└── pages/              Login, Register, Orders, Admin, Success, Cancel
```

## Data model

| Model     | Main fields                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| `User`    | name, email (unique), password (hash), role                                    |
| `Product` | name, price (paise), stock, category, image, description                       |
| `Cart`    | user (unique), items: [{ product → Product, qty }]                             |
| `Order`   | user → User, items snapshot [{ name, price, qty }], amount, status, Razorpay IDs |

Prices are stored in **paise** (integer) to avoid floating-point errors.

## API

| Method | Endpoint                       | Access | Purpose                                  |
| ------ | ------------------------------ | ------ | ---------------------------------------- |
| POST   | `/api/auth/register`           | public | create account                           |
| POST   | `/api/auth/login`              | public | log in, returns JWT                      |
| GET    | `/api/auth/me`                 | user   | current user                             |
| GET    | `/api/products`                | public | list (`?search=&category=`)              |
| GET    | `/api/products/categories`     | public | distinct categories                      |
| GET    | `/api/products/:id`            | public | one product                              |
| POST   | `/api/products`                | admin  | add product                              |
| PUT    | `/api/products/:id`            | admin  | edit product                             |
| DELETE | `/api/products/:id`            | admin  | delete product                           |
| GET    | `/api/cart`                    | user   | saved cart                               |
| POST   | `/api/cart/items`              | user   | add item `{ productId, qty }`            |
| PATCH  | `/api/cart/items/:productId`   | user   | set quantity `{ qty }`                   |
| DELETE | `/api/cart/items/:productId`   | user   | remove item                              |
| DELETE | `/api/cart`                    | user   | empty cart                               |
| POST   | `/api/cart/merge`              | user   | merge guest cart after login             |
| POST   | `/api/orders/create`           | user   | create Razorpay order from saved cart    |
| POST   | `/api/orders/verify`           | user   | verify payment signature, mark paid      |
| GET    | `/api/orders`                  | user   | my orders                                |
| GET    | `/api/orders/:id`              | user   | one order (owner or admin)               |
| GET    | `/api/orders/all`              | admin  | all orders                               |

## Run locally

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas), add a database user, and allow your IP (Network Access).
2. Get Razorpay **test** keys from the Razorpay dashboard (Test Mode → API Keys).

**Backend**

```bash
cd server
npm install
cp .env.example .env     # then fill in MONGO_URI, JWT_SECRET, Razorpay keys, ADMIN_*
npm run seed             # creates the admin account + sample products
npm run dev              # http://localhost:4242
```

**Frontend**

```bash
cd client
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:4242
npm run dev              # http://localhost:5173
```

**Test payment:** card `4111 1111 1111 1111`, any future expiry, any CVV. Failure card: `4000 0000 0000 0002`.

## Deploy

- **Database:** MongoDB Atlas (allow `0.0.0.0/0` or Render's outbound IPs under Network Access)
- **Backend:** Render web service — root `server`, build `npm install`, start `npm start`; set `MONGO_URI`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `CLIENT_URL` (your Vercel URL), `NODE_ENV=production`
- **Frontend:** Vercel — root `client`, set `VITE_API_URL` to the Render URL. Add a `vercel.json` rewrite so React Router paths such as `/orders` work on refresh:

  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
  ```

## Possible next steps

Razorpay webhooks as a second source of payment truth, image uploads, product reviews, pagination, rate limiting on auth routes.
