import React, { useState, useEffect } from 'react';
import { SLATicket } from '../types';
import { X, Clock, MapPin, Navigation, CheckCircle2, AlertTriangle, ShieldCheck, Building2, PhoneCall } from 'lucide-react';
import { motion } from 'motion/react';

interface SLATrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTicket?: SLATicket;
  onCompleteTicket: (ticketId: string) => void;
}

export const SLATrackerModal: React.FC<SLATrackerModalProps> = ({
  isOpen,
  onClose,
  activeTicket,
  onCompleteTicket,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60); // 25 min remaining
  const [step, setStep] = useState<'A_CAMINHO' | 'EM_ATENDIMENTO' | 'CONCLUIDO'>('A_CAMINHO');

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !activeTicket) return null;

  const minutesLeft = Math.floor(secondsRemaining / 60);
  const secondsLeft = secondsRemaining % 60;

  const slaPercent = Math.min(
    100,
    Math.round((secondsRemaining / (activeTicket.allocatedSlaMinutes * 60)) * 100)
  );

  const handleFinish = () => {
    setStep('CONCLUIDO');
    setTimeout(() => {
      onCompleteTicket(activeTicket.id);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">SLA Operacional & Deslocamento</h3>
              <p className="text-xs text-slate-500">Cálculo automático de atendimento em campo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {/* SLA Timer Banner */}
          <div className="p-5 bg-slate-50 border border-emerald-300 rounded-2xl text-center space-y-2 relative overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">
              TEMPO RESTANTE PARA EXCEDER SLA
            </span>
            <div className="text-3xl sm:text-4xl font-mono font-black text-emerald-700 tracking-tight">
              {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>SLA Alocado: {activeTicket.allocatedSlaMinutes} minutos</span>
            </div>

            {/* SLA Progress Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  minutesLeft > 15 ? 'bg-emerald-600' : minutesLeft > 5 ? 'bg-amber-500' : 'bg-red-600'
                }`}
                style={{ width: `${slaPercent}%` }}
              />
            </div>
          </div>

          {/* Ticket Merchant Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">
                  {activeTicket.type.replace(/_/g, ' ')}
                </span>
                <h4 className="text-base font-extrabold text-slate-900 mt-1.5">{activeTicket.merchantName}</h4>
                <p className="text-xs text-slate-500">CNPJ: {activeTicket.cnpjs}</p>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                Prioridade {activeTicket.priority}
              </span>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{activeTicket.address}</span>
            </div>

            {activeTicket.notes && (
              <p className="text-xs text-slate-600 italic bg-slate-100 p-2 rounded">
                " {activeTicket.notes} "
              </p>
            )}
          </div>

          {/* Map Simulation Graphic */}
          <div className="relative w-full h-36 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
            {/* SVG Grid background */}
            <svg className="absolute inset-0 w-full h-full opacity-30" width="100%" height="100%">
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10b981" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Simulated Animated Route */}
            <div className="relative z-10 flex items-center justify-between w-4/5">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-xs shadow-lg shadow-emerald-500/30">
                  AG
                </div>
                <span className="text-[10px] text-white font-bold mt-1">Sua Posição</span>
              </div>

              {/* Animated dotted line */}
              <div className="flex-1 mx-3 border-t-2 border-dashed border-emerald-400 animate-pulse" />

              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-red-500 text-white font-bold flex items-center justify-center text-xs shadow-lg shadow-red-500/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-white font-bold mt-1">Cliente</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {step === 'A_CAMINHO' ? (
              <button
                onClick={() => setStep('EM_ATENDIMENTO')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                <span>Cheguei no Cliente (Iniciar Atendimento)</span>
              </button>
            ) : step === 'EM_ATENDIMENTO' ? (
              <button
                onClick={handleFinish}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finalizar Atendimento no SLA</span>
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center text-xs font-bold text-emerald-800">
                ✔ Chamado Concluído com Sucesso Dentro do SLA!
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
