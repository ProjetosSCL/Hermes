import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Sparkles, AlertCircle } from 'lucide-react';
import { DeliveryLogo } from './DeliveryLogo';
import { signIn } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

/**
 * Tela de login real: autentica contra o Supabase Auth (e-mail + senha).
 * Não existe mais "entrar como qualquer agente" ou senha ignorada — quem
 * não tiver uma conta cadastrada pelo Admin no Supabase não entra.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Informe e-mail e senha.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage('E-mail ou senha inválidos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

      <header className="relative z-10 px-6 py-4 border-b border-slate-800 bg-slate-950/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DeliveryLogo size="md" />
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              Quero Stone Delivery
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Logística & Campo
              </span>
            </h1>
            <p className="text-xs text-slate-400">Portal de Conexão dos Agentes de Campo</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
        <div className="text-center max-w-2xl mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sistema Autenticado para Agentes e Administradores</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Conecte-se à Sua Conta de Trabalho
          </h2>
          <p className="text-sm text-slate-400">
            Entre com o e-mail e senha cadastrados pelo administrador.
          </p>
        </div>

        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  autoComplete="username"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-900/50 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isLoading ? 'Entrando...' : 'Entrar no Sistema'}</span>
            </button>
          </form>
        </div>
      </main>

      <footer className="relative z-10 px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-center text-slate-500 text-[11px]">
        © 2026 Quero Stone Delivery • Logística & Atendimento de Campo
      </footer>
    </div>
  );
};
