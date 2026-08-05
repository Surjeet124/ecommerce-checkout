# E-commerce Checkout — Razorpay Test Mode (End-to-End)

Full flow: product catalog → cart (React Context) → Razorpay Order (server-side)
→ Razorpay Checkout modal (embedded, no redirect) → signature verification
→ success/cancel page.

## Folder structure

```
ecommerce-checkout/
├── server/          Express API (creates Razorpay orders, verifies payment)
│   ├── index.js
│   ├── package.json
│   └── .env.example
└── client/          React (Vite) storefront
    ├── src/
    │   ├── components/ (ProductList, Cart, Success, Cancel)
    │   ├── context/CartContext.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── .env.example
```

## 1. Get Razorpay test keys

1. Sign up at https://dashboard.razorpay.com (free, no business docs
   needed to access Test Mode).
2. Make sure the **Test Mode** toggle (top-right of dashboard) is ON.
3. Go to **Settings → API Keys** (or **Developers → API Keys** depending
   on the dashboard version) and generate a Test key.
4. Copy the **Key Id** (`rzp_test_...`) and **Key Secret**.

## 2. Backend setup

```bash
cd server
npm install
copy .env.example .env      # Windows PowerShell
# or: cp .env.example .env   (Mac/Linux)
```

Open `.env` and paste your keys:
```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret_here
```

Start the server:
```bash
npm start
```
Runs on `http://localhost:4242`.

## 3. Frontend setup

Open a **new terminal** (keep the server one running):
```bash
cd client
npm install
copy .env.example .env
npm run dev
```
Opens on `http://localhost:5173`.

## 4. Test the flow

1. Add products to cart, click **Pay with Razorpay** — a checkout modal
   opens (no page redirect).
2. In the modal, choose **Card** and use Razorpay's test card:
   - Card number: `4111 1111 1111 1111`
   - Expiry: any future date
   - CVV: any 3 digits
   - Name: any
   - OTP (if asked): `1234` (or click through the test OTP screen)
3. On success, you land on `/success`, which confirms via the backend.
4. To simulate a failure, use test card `4000 0000 0000 0002`, or just
   close the modal (routes to `/cancel`).

More test card numbers: https://razorpay.com/docs/payments/payments/test-card-details/

## How to explain this in an interview

- **Why Razorpay Orders API + Checkout modal instead of a hosted redirect
  page?** Razorpay's flow keeps the user on your site (embedded modal),
  which is common for Indian payment UX. The backend creates an `order`
  first — this locks in the amount server-side so it can't be tampered
  with from the browser.
- **Why verify the signature server-side?** After payment, Razorpay's
  frontend script returns a `payment_id`, `order_id`, and `signature` to
  the browser. Anyone could fake a "success" callback in devtools, so the
  backend recomputes an HMAC SHA-256 signature using the secret key
  (never exposed to the client) and compares it — only a match proves the
  payment is genuine.
- **Why re-price on the server?** The client only sends product `id` and
  `qty`; the server looks up the real price from its own catalog before
  creating the Razorpay order.
- **Where this plugs into the existing cart project**: `CartContext`
  mirrors the same state-management approach used for the wishlist/filters
  in the product-page project — swap the in-memory `PRODUCTS` array and
  `orders` Map for a real database (Mongo/Postgres) for production.

## Production notes (mention if asked "is this production ready?")

- Replace the in-memory `orders` Map with a real database.
- Add authentication so orders are tied to a user account.
- Set up Razorpay **webhooks** (Settings → Webhooks in dashboard) as a
  second, more reliable source of truth for payment confirmation — same
  reasoning as Stripe webhooks: the browser callback can be missed if the
  tab closes, but the webhook still fires.
- Move keys to proper secrets management, not `.env` in git.
