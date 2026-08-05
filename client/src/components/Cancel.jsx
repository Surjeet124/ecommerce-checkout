import React from 'react';
import { Link } from 'react-router-dom';

export default function Cancel() {
  return (
    <div className="cancel">
      <h2>Payment Cancelled</h2>
      <p>Your cart is still saved — you can try checking out again anytime.</p>
      <Link to="/">Back to shop</Link>
    </div>
  );
}
