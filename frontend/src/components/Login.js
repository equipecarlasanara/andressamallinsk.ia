import { useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const isReg = mode === 'register';
      const { data } = await axios.post(`${API}/auth/${isReg ? 'register' : 'login'}`,
        isReg ? form : { email: form.email, password: form.password }
      );
      onLogin(data.access_token, data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao entrar. Verifique seus dados.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(ellipse at 50% 0%, #1a0303 0%, #080808 65%)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img src="/logo-fire-branco.png" alt="Estrategista Fire"
            style={{ width: '200px', filter: 'drop-shadow(0 0 25px rgba(192,57,43,0.5))', marginBottom: '16px' }} />
          <p style={{ color: '#555', fontSize: '11px', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            Metodologia Andressa Mallinsk
          </p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(15,5,5,0.9)', border: '1px solid #1E0505', borderRadius: '16px', padding: '32px', backdropFilter: 'blur(20px)' }}>
          {error && (
            <div style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', color: '#E08080', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Nome</label>
                <input className="fire-input" type="text" required value={form.name}
                  onChange={e => set('name', e.target.value)} placeholder="Seu nome completo" />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Email</label>
              <input className="fire-input" type="email" required value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Senha</label>
              <input className="fire-input" type="password" required value={form.password}
                onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
            <button className="fire-btn" type="submit" disabled={loading} style={{ marginTop: '8px', width: '100%', padding: '14px' }}>
              {loading ? 'Entrando...' : mode === 'register' ? 'CRIAR CONTA' : 'ENTRAR'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#C0606A', fontSize: '13px', cursor: 'pointer' }}>
              {mode === 'login' ? 'Não tem acesso? Registre-se' : 'Já tem acesso? Faça login'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#222', fontSize: '11px', marginTop: '24px' }}>by Andressa Mallinsk</p>
      </div>
    </div>
  );
}
