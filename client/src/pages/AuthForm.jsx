import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// One form used by both the Login and Register pages
export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      navigate((location.state && location.state.from) || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{isRegister ? 'Create account' : 'Log in'}</h2>

      {isRegister && (
        <label>
          Name
          <input value={form.name} onChange={update('name')} required minLength={2} autoComplete="name" />
        </label>
      )}
      <label>
        Email
        <input type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
      </label>
      <label>
        Password
        <input
          type="password"
          value={form.password}
          onChange={update('password')}
          required
          minLength={6}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <button className="primary" disabled={loading}>
        {loading ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
      </button>

      <p className="muted">
        {isRegister ? 'Already have an account? ' : 'New here? '}
        <Link to={isRegister ? '/login' : '/register'} state={location.state}>
          {isRegister ? 'Log in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}
