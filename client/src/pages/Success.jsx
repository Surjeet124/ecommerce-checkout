import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatPrice } from '../api.js';

export default function Success() {
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(orderId ? '' : 'Missing order id');

  useEffect(() => {
    if (!orderId) return;
    api(`/api/orders/${orderId}`)
      .then(setOrder)
      .catch(() => setError('Could not verify order.'));
  }, [orderId]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p className="notice">Confirming your payment…</p>;

  return (
    <section className="result">
      <h2>{order.status === 'paid' ? 'Payment successful 🎉' : 'Payment pending'}</h2>
      <p>Amount: {formatPrice(order.amount)}</p>
      <p>Payment ID: {order.razorpayPaymentId || '—'}</p>
      <p>Status: {order.status}</p>
      <Link to="/orders">View my orders</Link> · <Link to="/">Back to store</Link>
    </section>
  );
}
