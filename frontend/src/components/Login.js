import { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister
        ? { email: formData.email, password: formData.password, name: formData.name }
        : { email: formData.email, password: formData.password };
      const response = await axios.post(`${API}${endpoint}`, payload);
      onLogin(response.data.access_token, response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at top, #1a0505 0%, #0A0A0A 60%)' }} data-testid="login-page">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <img
            src="/logo-fire-branco.png"
            alt="Estrategista Fire"
            className="w-56 mb-6 drop-shadow-[0_0_30px_rgba(192,57,43,0.4)]"
          />
          <p className="text-[#A0A0A0] text-xs tracking-[0.3em] uppercase">
            O mesmo cérebro que construiu milhões,<br />agora construindo com você.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border border-[#2A0A0A]" style={{ background: 'rgba(20,5,5,0.8)', backdropFilter: 'blur(20px)' }}>

          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-5 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium mb-2 text-[#A0A0A0] tracking-wider uppercase">Nome</label>
                <input
                  type="text"
                  required={isRegister}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg p-3.5 text-sm text-[#E8E8E8] placeholder-[#555] border border-[#2A0A0A] focus:border-[#C0392B] transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  placeholder="Seu nome completo"
                  data-testid="register-name-input"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-2 text-[#A0A0A0] tracking-wider uppercase">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg p-3.5 text-sm text-[#E8E8E8] placeholder-[#555] border border-[#2A0A0A] focus:border-[#C0392B] transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                placeholder="seu@email.com"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2 text-[#A0A0A0] tracking-wider uppercase">Senha</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg p-3.5 text-sm text-[#E8E8E8] placeholder-[#555] border border-[#2A0A0A] focus:border-[#C0392B] transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                placeholder="••••••••"
                data-testid="login-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3.5 px-4 rounded-lg transition-all mt-2 text-sm tracking-wider"
              style={{ background: loading ? '#555' : 'linear-gradient(135deg, #8B1A1A 0%, #C0392B 100%)', boxShadow: loading ? 'none' : '0 4px 20px rgba(192,57,43,0.4)' }}
              data-testid="login-submit-button"
            >
              {loading ? 'Entrando...' : isRegister ? 'CRIAR CONTA' : 'ENTRAR'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-[#C0606A] hover:text-[#E08090] text-sm transition-colors"
              data-testid="toggle-register-button"
            >
              {isRegister ? 'Já tem acesso? Faça login' : 'Não tem acesso? Registre-se'}
            </button>
          </div>
        </div>

        <p className="text-center text-[#333] text-xs mt-8">by Andressa Mallinsk</p>
      </div>
    </div>
  );
}
