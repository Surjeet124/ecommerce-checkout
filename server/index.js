require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();
const PORT = process.env.PORT || 4242;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// --- Mock product catalog (swap for your real DB) ---------------------
const PRODUCTS = [
  { id: 'p1', name: 'Wireless Headphones', price: 2499, image: 'https://placehold.co/300x300?text=Headphones' },
  { id: 'p2', name: 'Mechanical Keyboard', price: 3999, image: 'https://placehold.co/300x300?text=Keyboard' },
  { id: 'p3', name: 'Smart Watch', price: 5499, image: 'https://placehold.co/300x300?text=Watch' },
  { id: 'p4', name: 'Backpack', price: 1899, image: 'https://placehold.co/300x300?text=Backpack' },
];
// price is in paise (smallest INR unit) -> 2499 = ₹24.99

// --- In-memory "orders" store (swap for a real DB in production) ------
const orders = new Map(); // keyed by Razorpay order id

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// --- Routes -------------------------------------------------------------

app.get('/api/products', (req, res) => {
  res.json(PRODUCTS);
});

/**
 * Creates a Razorpay Order. The frontend uses the returned order id to
 * open the Razorpay Checkout modal.
 * Body: { items: [{ id, qty }] }
 */
app.post('/api/create-order', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Re-price server-side from the trusted catalog — never trust prices
    // sent from the client.
    let amount = 0;
    for (const cartItem of items) {
      const product = PRODUCTS.find((p) => p.id === cartItem.id);
      if (!product) throw new Error(`Unknown product: ${cartItem.id}`);
      amount += product.price * (cartItem.qty || 1);
    }

    const order = await razorpay.orders.create({
      amount, // in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    orders.set(order.id, { status: 'created', amount, items });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public key, safe to expose
    });
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Verifies the payment signature Razorpay Checkout returns after a
 * successful payment. This is the step that actually confirms the
 * payment is genuine — never trust a "success" callback on the frontend
 * alone, since that can be spoofed.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const isValid = expectedSignature === razorpay_signature;

  if (isValid) {
    const order = orders.get(razorpay_order_id) || {};
    orders.set(razorpay_order_id, {
      ...order,
      status: 'paid',
      payment_id: razorpay_payment_id,
    });
    return res.json({ verified: true });
  }

  res.status(400).json({ verified: false, error: 'Signature mismatch' });
});

/**
 * Lets the success page confirm order status.
 */
app.get('/api/order/:orderId', (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.get('/', (req, res) => res.send('E-commerce checkout API running.'));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
