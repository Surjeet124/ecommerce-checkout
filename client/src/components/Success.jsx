import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4242';

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      setError('Missing order id');
      return;
    }

    fetch(`${API_URL}/api/order/${orderId}`)
      .then((res) => res.json())
      .then((data) => setOrder(data))
      .catch(() => setError('Could not verify order'));
  }, [orderId]);

  if (error) return <p className="error">{error}</p>;
  if (!order) return <p>Confirming your payment…</p>;

  return (
    <div className="success">
      <h2>🎉 Payment Successful</h2>
      <p>Amount: ₹{(order.amount / 100).toFixed(2)}</p>
      <p>Payment ID: {order.payment_id}</p>
      <p>Status: {order.status}</p>
      <Link to="/">Continue shopping</Link>
    </div>
  );
}
