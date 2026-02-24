import { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
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
      setError(err.response?.data?.detail || 'Erro ao fazer login/registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#19161B] p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src="/logo_full.png"
            alt="A Estrategista"
            className="w-64 mb-4 drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          />
          <p className="text-[#CBC8C9]/70 text-sm tracking-widest px-4">O MESMO CÉREBRO QUE CONSTRUIU MILHÕES, AGORA CONSTRUINDO COM VOCÊ.</p>
        </div>

        <div className="bg-black/30 border border-[#3A0A16] rounded-lg p-8">
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="name">Nome</label>
                <input
                  id="name"
                  type="text"
                  required={isRegister}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B] focus:border-transparent"
                  placeholder="Seu nome"
                  data-testid="register-name-input"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B] focus:border-transparent"
                placeholder="seu@email.com"
                data-testid="login-email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-[#19161B] border border-[#3A0A16] rounded-lg p-3 text-[#CBC8C9] focus:ring-2 focus:ring-[#53050B] focus:border-transparent"
                placeholder="••••••••"
                data-testid="login-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#53050B] hover:bg-red-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
              data-testid="login-submit-button"
            >
              {loading ? 'Carregando...' : isRegister ? 'Criar Conta' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-[#D4AF37] hover:underline text-sm"
              data-testid="toggle-register-button"
            >
              {isRegister ? 'Já tem uma conta? Faça login' : 'Não tem conta? Registre-se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}