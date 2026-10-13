import React, { useCallback, useEffect, useState } from 'react';
import { api, formatDate, formatPrice } from '../api.js';

const EMPTY = { name: '', price: '', stock: '', category: '', image: '', description: '' };

// price is typed in rupees but stored in paise
const toPaise = (rupees) => Math.round(parseFloat(rupees) * 100);

export default function Admin() {
  const [tab, setTab] = useState('products');
  return (
    <section>
      <h2>Admin</h2>
      <div className="tabs">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>
          Products
        </button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
          All orders
        </button>
      </div>
      {tab === 'products' ? <ProductsAdmin /> : <OrdersAdmin />}
    </section>
  );
}

function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api('/api/products', { auth: false })
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: String(product.price / 100),
      stock: String(product.stock),
      category: product.category,
      image: product.image,
      description: product.description,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        name: form.name,
        price: toPaise(form.price),
        stock: parseInt(form.stock, 10),
        category: form.category || 'general',
        image: form.image,
        description: form.description,
      };
      if (editingId) await api(`/api/products/${editingId}`, { method: 'PUT', body });
      else await api('/api/products', { method: 'POST', body });
      reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    setError('');
    try {
      await api(`/api/products/${product.id}`, { method: 'DELETE' });
      if (editingId === product.id) reset();
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Edit product' : 'Add product'}</h3>
        <input placeholder="Name" value={form.name} onChange={update('name')} required />
        <input
          placeholder="Price (₹)"
          type="number"
          min="1"
          step="0.01"
          value={form.price}
          onChange={update('price')}
          required
        />
        <input
          placeholder="Stock"
          type="number"
          min="0"
          step="1"
          value={form.stock}
          onChange={update('stock')}
          required
        />
        <input placeholder="Category (e.g. audio)" value={form.category} onChange={update('category')} />
        <input placeholder="Image URL" value={form.image} onChange={update('image')} />
        <textarea placeholder="Description" value={form.description} onChange={update('description')} rows={3} />
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button className="primary" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add product'}
          </button>
          {editingId && (
            <button type="button" className="link-btn" onClick={reset}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Category</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{formatPrice(product.price)}</td>
              <td>{product.stock}</td>
              <td>{product.category}</td>
              <td className="actions">
                <button className="link-btn" onClick={() => startEdit(product)}>
                  Edit
                </button>
                <button className="link-btn danger" onClick={() => handleDelete(product)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function OrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/orders/all')
      .then(setOrders)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (orders.length === 0) return <p className="notice">No orders yet.</p>;

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Customer</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{formatDate(order.createdAt)}</td>
            <td>{order.user ? `${order.user.name} (${order.user.email})` : 'Deleted user'}</td>
            <td>{formatPrice(order.amount)}</td>
            <td>{order.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
