import React from 'react';
import { QrCode, Navigation, Fuel, FileCheck, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface QuickActionsGridProps {
  onOpenScanner: () => void;
  onOpenSLATracker: () => void;
  onOpenFleetFuel: () => void;
  onOpenChecklist: () => void;
}

export const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
  onOpenScanner,
  onOpenSLATracker,
  onOpenFleetFuel,
  onOpenChecklist,
}) => {
  const actions = [
    {
      id: 'scanner',
      title: 'Escanear Máquina',
      subtitle: 'Scanner QR/Barcode & Custódia',
      icon: QrCode,
      color: 'from-[#00D34D] to-[#009E38]',
      onClick: onOpenScanner,
      badge: 'Disponível',
    },
    {
      id: 'sla',
      title: 'Iniciar Rota / SLA',
      subtitle: 'Tempo deslocamento & Chamado',
      icon: Navigation,
      color: 'from-emerald-500 to-teal-700',
      onClick: onOpenSLATracker,
      badge: 'Chamado Ativo',
    },
    {
      id: 'fleet',
      title: 'Abastecimento',
      subtitle: 'KM, combustível e consumo',
      icon: Fuel,
      color: 'from-[#00D34D] to-[#05A340]',
      onClick: onOpenFleetFuel,
      badge: 'Frota',
    },
    {
      id: 'checklist',
      title: 'Checklist Operacional',
      subtitle: 'Inspeção, fotos e assinatura',
      icon: FileCheck,
      color: 'from-emerald-400 to-emerald-600',
      onClick: onOpenChecklist,
      badge: 'Dinâmico',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          Ações Rápidas de Campo
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">Até 3 cliques</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={action.onClick}
              className="group relative bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-400 rounded-2xl p-4 sm:p-5 text-left transition-all shadow-sm flex flex-col justify-between h-36 sm:h-40 overflow-hidden"
            >
              {/* Top Row: Icon & Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-600 text-white font-bold shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap flex-shrink-0">
                  {action.badge}
                </span>
              </div>

              {/* Bottom Row: Text & Chevron */}
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {action.subtitle}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex-shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
