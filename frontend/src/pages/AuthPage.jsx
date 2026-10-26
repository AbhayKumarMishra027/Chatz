import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { getApiError } from '../services/api.js';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', email: '', displayName: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <div className="auth-loading">Opening your space…</div>;
  if (user) return <Navigate to="/" replace />;

  function update(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login({ identifier: form.username, password: form.password });
      navigate(location.state?.from || '/', { replace: true });
    } catch (requestError) { setError(getApiError(requestError)); }
    finally { setBusy(false); }
  }

  return <main className="auth-page"><section className="auth-card"><Link to="/" className="brand auth-brand"><span className="brand-mark"><MessageCircle size={18} fill="currentColor" /></span><span>chatz<span className="brand-period">.</span></span></Link><div className="auth-eyebrow">A LITTLE SPACE TO CONNECT</div><h1>{isRegister ? 'Find your people.' : 'Welcome back.'}</h1><p className="auth-intro">{isRegister ? 'Create your account and make yourself at home.' : 'Pick up where a good conversation left off.'}</p>
    <form className="auth-form" onSubmit={submit}>
      {isRegister && <><label>Display name<input name="displayName" value={form.displayName} onChange={update} autoComplete="name" maxLength="60" required placeholder="How people will know you" /></label><label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" minLength="3" maxLength="24" pattern="[A-Za-z0-9_]+" required placeholder="Choose a username" /></label><label>Email address<input name="email" type="email" value={form.email} onChange={update} autoComplete="email" maxLength="254" required placeholder="you@example.com" /></label></>}
      {!isRegister && <label>Username or email<input name="username" value={form.username} onChange={update} autoComplete="username" required placeholder="Your username or email" /></label>}
      <label>Password<input name="password" type="password" value={form.password} onChange={update} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={isRegister ? 10 : 1} maxLength="128" required placeholder={isRegister ? 'At least 10 characters' : 'Your password'} /></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="auth-submit" disabled={busy}>{busy ? 'One moment…' : isRegister ? 'Create your account' : 'Sign in'}<span>→</span></button>
    </form><div className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Chatz?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></div><div className="auth-footnote">A calmer corner for the conversations that matter.</div></section><div className="auth-art"><div className="auth-art-orbit orbit-big" /><div className="auth-art-orbit orbit-small" /><span className="auth-art-spark">✳</span><div className="auth-quote"><span>CHATS THAT FEEL LIKE HOME</span><h2>Make room<br />for good things.</h2><p>Share a thought. Find your people.<br />Keep the conversation going.</p></div></div></main>;
}
