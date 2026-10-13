import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

const LOCAL_KEY = 'guest_cart';

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: guest cart just won't survive a refresh */
  }
}

const stockMessage = (name, stock) =>
  stock === 0 ? `${name} is out of stock` : `Only ${stock} of ${name} left in stock`;

// Cart items look like { id, name, price, image, stock, qty }.
// Logged out: the cart lives in this browser (localStorage).
// Logged in: the cart lives in MongoDB and every change goes through the API.
export function CartProvider({ children }) {
  const { user, loading: authLoading, logout } = useAuth();
  const [cart, setCart] = useState(readLocal);
  const [error, setError] = useState('');
  const userId = user ? user.id : null;

  // On login: fold the guest cart into the saved cart, then use the saved one.
  // On logout: go back to the (now empty) guest cart.
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setCart(readLocal());
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const guest = readLocal();
        const data = guest.length
          ? await api('/api/cart/merge', {
              method: 'POST',
              body: { items: guest.map(({ id, qty }) => ({ id, qty })) },
            })
          : await api('/api/cart');
        writeLocal([]);
        if (!cancelled) setCart(data.items);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  // Runs a server cart call and shows its result (or error)
  const runServer = useCallback(
    async (call) => {
      setError('');
      try {
        const data = await call();
        setCart(data.items);
      } catch (err) {
        if (err.status === 401) logout();
        setError(err.message);
      }
    },
    [logout]
  );

  const addToCart = useCallback(
    async (product) => {
      if (userId) {
        return runServer(() =>
          api('/api/cart/items', { method: 'POST', body: { productId: product.id, qty: 1 } })
        );
      }

      setError('');
      const existing = cart.find((item) => item.id === product.id);
      const nextQty = (existing ? existing.qty : 0) + 1;
      if (nextQty > product.stock) {
        setError(stockMessage(product.name, product.stock));
        return;
      }
      const next = existing
        ? cart.map((item) => (item.id === product.id ? { ...item, qty: nextQty, stock: product.stock } : item))
        : [
            ...cart,
            {
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
              stock: product.stock,
              qty: 1,
            },
          ];
      setCart(next);
      writeLocal(next);
    },
    [userId, cart, runServer]
  );

  const removeFromCart = useCallback(
    async (id) => {
      if (userId) return runServer(() => api(`/api/cart/items/${id}`, { method: 'DELETE' }));
      setError('');
      const next = cart.filter((item) => item.id !== id);
      setCart(next);
      writeLocal(next);
    },
    [userId, cart, runServer]
  );

  const updateQty = useCallback(
    async (id, qty) => {
      if (qty < 1) return removeFromCart(id);
      if (userId) {
        return runServer(() => api(`/api/cart/items/${id}`, { method: 'PATCH', body: { qty } }));
      }

      setError('');
      const item = cart.find((line) => line.id === id);
      if (!item) return;
      if (qty > item.stock) {
        setError(stockMessage(item.name, item.stock));
        return;
      }
      const next = cart.map((line) => (line.id === id ? { ...line, qty } : line));
      setCart(next);
      writeLocal(next);
    },
    [userId, cart, runServer, removeFromCart]
  );

  const clearCart = useCallback(async () => {
    if (userId) return runServer(() => api('/api/cart', { method: 'DELETE' }));
    setCart([]);
    writeLocal([]);
  }, [userId, runServer]);

  // Re-reads the saved cart (used after a payment, when the server has emptied it)
  const reloadCart = useCallback(async () => {
    if (userId) return runServer(() => api('/api/cart'));
  }, [userId, runServer]);

  const clearError = useCallback(() => setError(''), []);

  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const value = useMemo(
    () => ({
      cart,
      error,
      clearError,
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
      reloadCart,
      totalItems,
      totalPrice,
    }),
    [cart, error, clearError, addToCart, removeFromCart, updateQty, clearCart, reloadCart, totalItems, totalPrice]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
