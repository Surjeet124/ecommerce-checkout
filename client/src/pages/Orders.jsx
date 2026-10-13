import React, { useEffect, useState } from 'react';
import { api, formatDate, formatPrice } from '../api.js';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/orders')
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="notice">Loading your orders…</p>;
  if (error) return <p className="error">{error}</p>;

  // Orders that were started but never paid are not shown as purchases
  const placed = orders.filter((order) => order.status === 'paid');

  return (
    <section>
      <h2>My Orders</h2>
      {placed.length === 0 && <p className="notice">You have not placed any orders yet.</p>}

      {placed.map((order) => (
        <article className="order-card" key={order.id}>
          <header>
            <span>{formatDate(order.createdAt)}</span>
            <span className="badge">{order.status}</span>
          </header>
          <ul>
            {order.items.map((item) => (
              <li key={`${order.id}-${item.name}`}>
                {item.name} × {item.qty} <span>{formatPrice(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
          <footer>
            <span className="muted">Payment: {order.razorpayPaymentId}</span>
            <strong>{formatPrice(order.amount)}</strong>
          </footer>
        </article>
      ))}
    </section>
  );
}
