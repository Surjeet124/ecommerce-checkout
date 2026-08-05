import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductList from './components/ProductList.jsx';
import Cart from './components/Cart.jsx';
import Success from './components/Success.jsx';
import Cancel from './components/Cancel.jsx';
import { useCart } from './context/CartContext.jsx';

function Shop() {
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <div className="shop">
      <header>
        <h1>Demo Store</h1>
        <button onClick={() => setCartOpen((o) => !o)}>
          Cart ({totalItems})
        </button>
      </header>

      {cartOpen && (
        <aside className="cart-drawer">
          <Cart />
        </aside>
      )}

      <ProductList />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Shop />} />
      <Route path="/success" element={<Success />} />
      <Route path="/cancel" element={<Cancel />} />
    </Routes>
  );
}
