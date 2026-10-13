import React from 'react';
import { Link } from 'react-router-dom';

export default function Cancel() {
  return (
    <section className="result">
      <h2>Payment cancelled</h2>
      <p>No money was taken. Your cart is still saved.</p>
      <Link to="/">Back to store</Link>
    </section>
  );
}
