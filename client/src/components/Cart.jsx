import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4242';

export default function Cart() {
  const { cart, removeFromCart, updateQty, totalPrice, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    try {
      // 1. Ask our backend to create a Razorpay order (server re-prices
      //    everything from its own catalog — never trust client prices).
      const items = cart.map((item) => ({ id: item.id, qty: item.qty }));
      const res = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || 'Could not start checkout');

      // 2. Open the Razorpay Checkout modal with that order.
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Demo Store',
        description: 'Order payment',
        order_id: order.orderId,
        handler: async function (response) {
          // 3. Payment succeeded on Razorpay's side — verify the
          //    signature server-side before treating it as paid.
          try {
            const verifyRes = await fetch(`${API_URL}/api/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              clearCart();
              navigate(`/success?order_id=${order.orderId}`);
            } else {
              navigate('/cancel');
            }
          } catch {
            navigate('/cancel');
          }
        },
        modal: {
          ondismiss: function () {
            // User closed the modal without paying
            setLoading(false);
          },
        },
        theme: { color: '#111111' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function () {
        navigate('/cancel');
      });
      rzp.open();
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (cart.length === 0) return <p>Your cart is empty.</p>;

  return (
    <div className="cart">
      {cart.map((item) => (
        <div className="cart-row" key={item.id}>
          <span>{item.name}</span>
          <input
            type="number"
            min="1"
            value={item.qty}
            onChange={(e) => updateQty(item.id, Number(e.target.value))}
          />
          <span>₹{((item.price * item.qty) / 100).toFixed(2)}</span>
          <button onClick={() => removeFromCart(item.id)}>Remove</button>
        </div>
      ))}

      <h3>Total: ₹{(totalPrice / 100).toFixed(2)}</h3>

      {error && <p className="error">{error}</p>}

      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Opening checkout…' : 'Pay with Razorpay'}
      </button>
    </div>
  );
}
