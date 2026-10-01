import React, { useState } from 'react';
import { Machine, UserAgent, SLATicket, FuelLog, Vehicle } from '../types';
import { LayoutDashboard, Award, ShieldCheck, MapPin, TrendingUp, Users, Clock, Fuel, Sparkles, AlertCircle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface LeaderDashboardProps {
  currentUser?: UserAgent;
  machines: Machine[];
  agents: UserAgent[];
  slaTickets: SLATicket[];
  fuelLogs: FuelLog[];
  vehicles: Vehicle[];
  onOpenMachineList: () => void;
}

export const LeaderDashboard: React.FC<LeaderDashboardProps> = ({
  currentUser,
  machines,
  agents,
  slaTickets,
  fuelLogs,
  vehicles,
  onOpenMachineList,
}) => {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // Machine breakdown counts
  const countEstoque = machines.filter((m) => m.status === 'ESTOQUE').length;
  const countAgente = machines.filter((m) => m.status === 'COM_AGENTE').length;
  const countProducao = machines.filter((m) => m.status === 'PRODUCAO').length;
  const countManutencao = machines.filter((m) => m.status === 'MANUTENCAO').length;
  const totalMachines = machines.length;

  // SLA calculations
  const totalTickets = slaTickets.length;
  const completedTickets = slaTickets.filter((t) => t.status === 'CONCLUIDO').length;
  const slaCompliancePercent = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 98;

  // Map Pins simulation
  const pins = [
    { id: 'PIN-1', name: 'Padaria Central', type: 'PRODUCAO', x: 25, y: 35, details: 'POS Stone Smart S920 • Transacionando R$ 12.400/dia' },
    { id: 'PIN-2', name: 'Agente Carlos Silva', type: 'AGENTE', x: 45, y: 50, details: 'Carlos Silva • Rota Av. Paulista (3 terminais em custódia)' },
    { id: 'PIN-3', name: 'Supermercado Vila Nova', type: 'PRODUCAO', x: 70, y: 25, details: 'POS Stone Mini POS • Instalado hoje' },
    { id: 'PIN-4', name: 'Drogaria SP Expresso', type: 'SLA_PENDENTE', x: 60, y: 75, details: 'Chamado SLA Ativo • Troca de leitor de chip' },
    { id: 'PIN-5', name: 'Almoxarifado Central SP', type: 'ESTOQUE', x: 15, y: 80, details: '2 Maquininhas no Estoque da Franquia' },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Top Banner Leader Welcome */}
      <div className="p-5 bg-gradient-to-r from-emerald-50 via-white to-slate-50 border border-emerald-200 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Sistema Hermes • Logística de Franquia Stone</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Visão Geral de Operações Logísticas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rastreabilidade de terminais, frota e produtividade da equipe em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-3 bg-white p-2.5 px-3.5 rounded-xl border border-slate-200 shadow-xs">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30 flex-shrink-0"
              />
              <div className="text-left">
                <div className="text-xs font-black text-slate-900">{currentUser.name}</div>
                <div className="text-[10px] text-emerald-700 font-extrabold uppercase">
                  {currentUser.jobTitle || (currentUser.role === 'ADMIN' ? 'Administrador' : currentUser.role === 'LIDER_FRANQUIA' ? 'Líder Regional' : 'Agente de Campo')}
                </div>
                <div className="text-[10px] text-slate-500 font-medium">{currentUser.franchiseName}</div>
              </div>
            </div>
          )}

          <button
            onClick={onOpenMachineList}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all flex-shrink-0"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Ver Inventário Completo ({totalMachines})</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Terminais */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Acervo de Maquininhas</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{totalMachines}</div>
          <div className="grid grid-cols-2 gap-1 text-[11px] pt-2 border-t border-slate-100 text-slate-600">
            <span className="text-blue-600 font-semibold">Estoque: {countEstoque}</span>
            <span className="text-emerald-700 font-semibold">Com Agente: {countAgente}</span>
            <span className="text-emerald-800 font-semibold">Produção: {countProducao}</span>
            <span className="text-red-600 font-semibold">Manutenção: {countManutencao}</span>
          </div>
        </div>

        {/* KPI 2: SLA Score */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Conformidade SLA</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">{slaCompliancePercent}%</div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            {completedTickets} de {totalTickets} chamados atendidos dentro do tempo estipulado.
          </p>
        </div>

        {/* KPI 3: Frota & Consumo */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Consumo da Frota</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">12.4 <span className="text-sm font-normal text-slate-500">km/L</span></div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            Média ponderada da frota (Fiat Fiorino & Honda Cargo).
          </p>
        </div>

        {/* KPI 4: Equipe em Campo */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Agentes Ativos</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">4 <span className="text-sm font-semibold text-emerald-600">● Online</span></div>
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            100% da equipe em jornada com rotas ativas.
          </p>
        </div>
      </div>

      {/* Interactive Map & Heatmap Simulation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Mapa de Calor & Presença Territorial (Franquia SP Centro)
            </h3>
            <p className="text-xs text-slate-500">Densidade de POS instaladas e rotas de agentes em tempo real</p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-emerald-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Agente em Campo
            </span>
            <span className="flex items-center gap-1 text-teal-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> POS em Produção
            </span>
            <span className="flex items-center gap-1 text-amber-800 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Chamado Pendente
            </span>
          </div>
        </div>

        {/* Map Stage Container */}
        <div className="relative w-full h-80 bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          {/* Heatmap Layer Simulates density circles */}
          <div className="absolute top-1/4 left-1/3 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
          <div className="absolute top-1/2 left-2/3 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-10 left-1/2 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* SVG Map Grid & City Vector Routes */}
          <svg className="absolute inset-0 w-full h-full opacity-25" width="100%" height="100%">
            <pattern id="mapGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#10b981" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#mapGrid)" />
            {/* Simulated main avenues */}
            <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
          </svg>

          {/* Map Pins */}
          {pins.map((pin) => (
            <div
              key={pin.id}
              style={{ top: `${pin.y}%`, left: `${pin.x}%` }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <button
                onClick={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
                className={`relative p-2 rounded-full font-bold shadow-lg transition-transform hover:scale-125 ${
                  pin.type === 'AGENTE'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/30'
                    : pin.type === 'SLA_PENDENTE'
                    ? 'bg-amber-400 text-slate-900 ring-4 ring-amber-400/30'
                    : 'bg-teal-500 text-white ring-4 ring-teal-500/30'
                }`}
              >
                <MapPin className="w-4 h-4" />
              </button>

              {/* Pin Tooltip */}
              {selectedPin === pin.id && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-52 bg-white border border-slate-200 p-3 rounded-xl shadow-2xl z-30 text-xs text-slate-900 space-y-1">
                  <p className="font-extrabold text-emerald-700">{pin.name}</p>
                  <p className="text-[10px] text-slate-500">{pin.details}</p>
                </div>
              )}
            </div>
          ))}

          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] text-slate-800 shadow-sm">
            📍 Região: <span className="font-bold text-emerald-700">São Paulo - SP Centro</span>
          </div>
        </div>
      </div>

      {/* Field Agent Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-600" />
          Ranking de Produtividade dos Agentes
        </h3>

        <div className="space-y-2">
          {agents.map((agent, idx) => (
            <div
              key={agent.id}
              className="p-4 bg-slate-50 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between gap-4 text-xs transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="font-black text-base text-emerald-700 w-6">#{idx + 1}</span>
                <img
                  src={agent.avatarUrl}
                  alt={agent.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{agent.name}</h4>
                  <p className="text-[10px] text-slate-500">{agent.franchiseName}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <span className="text-[10px] text-slate-500 block">META DIÁRIA</span>
                  <span className="font-bold text-slate-900">
                    {agent.dailyGoal.completed}/{agent.dailyGoal.target} ({Math.round((agent.dailyGoal.completed / agent.dailyGoal.target) * 100)}%)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">STATUS</span>
                  <span className="font-bold text-emerald-700 uppercase">{agent.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
