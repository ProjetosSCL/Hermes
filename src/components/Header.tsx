import React from 'react';
import { UserAgent } from '../types';
import { ShieldCheck, User, Code2, Bell, LayoutDashboard, Smartphone, Building2, Crown, LogOut, BarChart3, Palette } from 'lucide-react';
import { DeliveryLogo } from './DeliveryLogo';

interface HeaderProps {
  currentUser: UserAgent;
  viewMode: 'AGENTE' | 'LIDER' | 'ADMIN' | 'PERFORMANCE';
  onToggleViewMode: (mode: 'AGENTE' | 'LIDER' | 'ADMIN' | 'PERFORMANCE') => void;
  onOpenJsonInspector: () => void;
  onOpenMachineList: () => void;
  onLogout?: () => void;
}

const TEMAS = ['classico', 'stone', 'glass'] as const;
type Tema = (typeof TEMAS)[number];
const NOMES_TEMA: Record<Tema, string> = { classico: 'Clássico', stone: 'Stone', glass: 'Stone Glass' };

const temaAtual = (): Tema => {
  const el = document.documentElement;
  if (el.getAttribute('data-theme') !== 'stone') return 'classico';
  return el.getAttribute('data-glass') === 'on' ? 'glass' : 'stone';
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  viewMode,
  onToggleViewMode,
  onOpenJsonInspector,
  onOpenMachineList,
  onLogout,
}) => {
  const proximoTema = TEMAS[(TEMAS.indexOf(temaAtual()) + 1) % TEMAS.length];

  // Passa para o próximo tema (Clássico > Stone > Stone Glass). A escolha fica salva no navegador;
  // a página recarrega para que fontes, cores e gráficos troquem juntos.
  const alternarTema = () => {
    try {
      localStorage.setItem('hermes-tema', proximoTema);
    } catch {
      /* sem acesso ao armazenamento: não faz nada */
    }
    window.location.reload();
  };

  return (
    <header data-st="header" className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 py-3 shadow-sm">
      <div data-st="header-inner" className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Franchise */}
        <div className="flex items-center gap-3">
          <DeliveryLogo size="md" />

          <div>
            <div className="flex items-center gap-2">
              <span className="text-slate-900 font-black text-base sm:text-lg tracking-tight flex items-center gap-1.5">
                HERMES
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  SISTEMA LOGÍSTICO
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-600" />
              {currentUser.franchiseName}
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mode Switcher Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => onToggleViewMode('AGENTE')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'AGENTE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo Agente em Campo"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Agente</span>
            </button>
            <button
              onClick={() => onToggleViewMode('LIDER')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'LIDER'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Modo Líder de Franquia"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Líder</span>
            </button>
            <button
              onClick={() => onToggleViewMode('ADMIN')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'ADMIN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Acesso de Administrador"
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Admin</span>
            </button>
            <button
              onClick={() => onToggleViewMode('PERFORMANCE')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                viewMode === 'PERFORMANCE'
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'text-slate-700 hover:text-slate-950 bg-emerald-50/80 border border-emerald-200'
              }`}
              title="📊 HERMES Performance Operacional"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Performance Operacional</span>
            </button>
          </div>

          {/* Machine Inventory quick access */}
          <button
            onClick={onOpenMachineList}
            className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-3 py-1.5 rounded-xl font-medium transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Maquininhas</span>
          </button>

          {/* JSON Inspector trigger */}
          <button
            onClick={onOpenJsonInspector}
            className="p-2 text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
            title="Inspecionar Estrutura de Dados JSON"
          >
            <Code2 className="w-4 h-4" />
          </button>

          {/* Alternar tema visual (Clássico / Stone / Stone Glass) */}
          <button
            onClick={alternarTema}
            className="p-2 text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all"
            title={`Tema atual: ${NOMES_TEMA[temaAtual()]}. Clique para mudar para ${NOMES_TEMA[proximoTema]}.`}
            aria-label={`Alternar tema visual (agora: ${NOMES_TEMA[temaAtual()]})`}
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* User Profile Avatar, Name, Job Title & Logout */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="relative flex-shrink-0">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-emerald-500/40 shadow-xs"
              />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  currentUser.status === 'EM_JORNADA'
                    ? 'bg-emerald-500'
                    : currentUser.status === 'PAUSADO'
                    ? 'bg-amber-400'
                    : 'bg-red-500'
                }`}
                title={`Status: ${currentUser.status}`}
              />
            </div>
            <div className="text-left flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight truncate max-w-[110px] sm:max-w-[180px]">
                {currentUser.name}
              </p>
              <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider leading-none mt-0.5 truncate max-w-[110px] sm:max-w-[180px]">
                {currentUser.jobTitle ||
                  (currentUser.role === 'ADMIN'
                    ? 'Administrador Geral'
                    : currentUser.role === 'AGENTE_CAMPO'
                    ? 'Agente de Campo'
                    : currentUser.role === 'TECNICO'
                    ? 'Técnico de Campo'
                    : 'Líder Regional')}
              </p>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 ml-1 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all flex-shrink-0"
                title="Sair da Conta / Trocar Agente"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
