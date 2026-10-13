import React, { useEffect, useState } from 'react';
import { api, formatPrice } from '../api.js';
import { useCart } from '../context/CartContext.jsx';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    api('/api/products/categories', { auth: false })
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Re-fetch when the filters change; the short delay avoids a request per keystroke
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (category !== 'all') params.set('category', category);

      setLoading(true);
      api(`/api/products?${params}`, { auth: false })
        .then((data) => {
          if (cancelled) return;
          setProducts(data);
          setError('');
        })
        .catch((err) => {
          if (!cancelled) setError(err.message);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, category]);

  return (
    <section>
      <div className="filters">
        <input
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="notice">Loading products…</p>}
      {!loading && !error && products.length === 0 && <p className="notice">No products found.</p>}

      <div className="product-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <img src={product.image} alt={product.name} />
            <h3>{product.name}</h3>
            <p className="price">{formatPrice(product.price)}</p>
            {product.stock === 0 ? (
              <p className="muted">Out of stock</p>
            ) : (
              <>
                {product.stock <= 5 && <p className="muted">Only {product.stock} left</p>}
                <button onClick={() => addToCart(product)}>Add to Cart</button>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
