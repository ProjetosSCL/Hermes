import React, { useState, useEffect } from 'react';
import { UserAgent, SLATicket } from '../types';
import { Play, Pause, Square, Clock, Target, AlertTriangle, CheckCircle2, Navigation, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface AgentJourneyCardProps {
  agent: UserAgent;
  activeTicket?: SLATicket;
  onUpdateStatus: (newStatus: 'EM_JORNADA' | 'PAUSADO' | 'FORA_DE_SERVICO') => void;
  onOpenSLATracker: () => void;
}

export const AgentJourneyCard: React.FC<AgentJourneyCardProps> = ({
  agent,
  activeTicket,
  onUpdateStatus,
  onOpenSLATracker,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [slaRemainingMinutes, setSlaRemainingMinutes] = useState(25);

  // Live timer for shift duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (agent.status === 'EM_JORNADA' && agent.shiftStart) {
      const calculateTime = () => {
        const start = new Date(agent.shiftStart!).getTime();
        const now = Date.now();
        const elapsed = Math.max(0, Math.floor((now - start) / 1000) - agent.shiftPauseTotalSeconds);
        setElapsedSeconds(elapsed);
      };
      calculateTime();
      interval = setInterval(calculateTime, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [agent.status, agent.shiftStart, agent.shiftPauseTotalSeconds]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Target percent calculation
  const goalPercent = Math.min(100, Math.round((agent.dailyGoal.completed / agent.dailyGoal.target) * 100));

  // Circular progress dimensions
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPercent / 100) * circumference;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Meta do Dia & Circular Ring - Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-900 flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden"
      >
        {/* Glow ambient background effect */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Circular Radial Goal Progress */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated Progress Ring */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              className="stroke-emerald-500 transition-all duration-1000 ease-out"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{goalPercent}%</span>
            <span className="text-[8px] uppercase font-bold text-slate-500">META DO DIA</span>
          </div>
        </div>

        {/* Textual Goal Details */}
        <div className="flex-1 text-center sm:text-left flex flex-col justify-center">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" />
            <span>Produtividade Agente Stone</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {agent.dailyGoal.completed} de {agent.dailyGoal.target} Concluídos
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Instalações e manutenções programadas para a rota de hoje.
          </p>

          {/* Progress Bar linear */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden border border-slate-200">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Jornada Controls & Active SLA Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4"
      >
        {/* Shift Timer Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                TEMPO DE JORNADA
              </span>
              <span className="text-lg font-mono font-bold text-slate-900">
                {agent.status === 'EM_JORNADA'
                  ? formatTime(elapsedSeconds)
                  : agent.status === 'PAUSADO'
                  ? 'EM PAUSA'
                  : 'FORA DE SERVIÇO'}
              </span>
            </div>
          </div>

          <span
            className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full border uppercase tracking-wider ${
              agent.status === 'EM_JORNADA'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'
                : agent.status === 'PAUSADO'
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-red-50 text-red-700 border-red-300'
            }`}
          >
            {agent.status === 'EM_JORNADA' ? '● Em Campo' : agent.status === 'PAUSADO' ? '⏸ Em Pausa' : '⏹ Finalizado'}
          </span>
        </div>

        {/* Shift Control Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onUpdateStatus('EM_JORNADA')}
            disabled={agent.status === 'EM_JORNADA'}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              agent.status === 'EM_JORNADA'
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar</span>
          </button>

          <button
            onClick={() => onUpdateStatus('PAUSADO')}
            disabled={agent.status !== 'EM_JORNADA'}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              agent.status !== 'EM_JORNADA'
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95'
            }`}
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pausar</span>
          </button>

          <button
            onClick={() => onUpdateStatus('FORA_DE_SERVICO')}
            disabled={agent.status === 'FORA_DE_SERVICO'}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              agent.status === 'FORA_DE_SERVICO'
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white shadow-md active:scale-95'
            }`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Encerrar</span>
          </button>
        </div>

        {/* Active Ticket SLA Quick Bar */}
        {activeTicket && (
          <div
            onClick={onOpenSLATracker}
            className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl cursor-pointer transition-all group flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 flex-shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                  {activeTicket.merchantName}
                </p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                  <span className="whitespace-nowrap">SLA Alocado: {activeTicket.allocatedSlaMinutes} min</span>
                </p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                A Caminho
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
