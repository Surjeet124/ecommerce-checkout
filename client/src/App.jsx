import React, { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import ProductList from './components/ProductList.jsx';
import Cart from './components/Cart.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Orders from './pages/Orders.jsx';
import Admin from './pages/Admin.jsx';
import Success from './pages/Success.jsx';
import Cancel from './pages/Cancel.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useCart } from './context/CartContext.jsx';

function Shop() {
  return <ProductList />;
}

export default function App() {
  const [showCart, setShowCart] = useState(false);
  const { user, logout } = useAuth();
  const { totalItems } = useCart();

  return (
    <div className="app">
      <header className="site-header">
        <Link to="/" className="brand">
          Demo Store
        </Link>
        <nav>
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              {user.role === 'admin' && <Link to="/admin">Admin</Link>}
              <span className="muted">Hi, {user.name.split(' ')[0]}</span>
              <button className="link-btn" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register">Sign up</Link>
            </>
          )}
          <button className="cart-btn" onClick={() => setShowCart((open) => !open)}>
            Cart ({totalItems})
          </button>
        </nav>
      </header>

      {showCart && <Cart onClose={() => setShowCart(false)} />}

      <main>
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/success"
            element={
              <ProtectedRoute>
                <Success />
              </ProtectedRoute>
            }
          />
          <Route path="/cancel" element={<Cancel />} />
          <Route path="*" element={<p className="notice">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
