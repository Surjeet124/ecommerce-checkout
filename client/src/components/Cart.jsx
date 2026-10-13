import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatPrice } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

// The Razorpay script is loaded only when someone actually checks out
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Cart({ onClose }) {
  const { cart, totalPrice, updateQty, removeFromCart, reloadCart, error: cartError, clearError } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout() {
    setError('');
    clearError();

    if (!user) {
      onClose();
      navigate('/login', { state: { from: '/' } });
      return;
    }

    setLoading(true);
    try {
      if (!(await loadRazorpay())) throw new Error('Could not load the payment window. Check your internet connection.');

      // The server builds the order from the saved cart and prices it itself
      const order = await api('/api/orders/create', { method: 'POST' });

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Demo Store',
        description: 'Order payment (test mode)',
        prefill: { name: user.name, email: user.email },
        handler: async (response) => {
          try {
            await api('/api/orders/verify', { method: 'POST', body: response });
            await reloadCart();
            onClose();
            navigate(`/success?order_id=${order.dbOrderId}`);
          } catch {
            navigate('/cancel');
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });

      razorpay.on('payment.failed', () => navigate('/cancel'));
      razorpay.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <aside className="cart-drawer">
      <div className="cart-header">
        <h2>Your Cart</h2>
        <button className="link-btn" onClick={onClose}>
          Close
        </button>
      </div>

      {cart.length === 0 ? (
        <p className="notice">Your cart is empty.</p>
      ) : (
        <>
          <ul className="cart-list">
            {cart.map((item) => (
              <li key={item.id} className="cart-row">
                <img src={item.image} alt="" />
                <div className="cart-info">
                  <strong>{item.name}</strong>
                  <span>{formatPrice(item.price)}</span>
                  <div className="qty">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease quantity">
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase quantity">
                      +
                    </button>
                    <button className="link-btn" onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="cart-total">
            <span>Total</span>
            <strong>{formatPrice(totalPrice)}</strong>
          </div>

          {(error || cartError) && <p className="error">{error || cartError}</p>}

          <button className="primary" onClick={handleCheckout} disabled={loading}>
            {loading ? 'Please wait…' : user ? 'Pay with Razorpay' : 'Log in to checkout'}
          </button>
        </>
      )}
    </aside>
  );
}
