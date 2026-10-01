import React, { useState } from 'react';
import { Machine, MachineMovement, MachineStatus } from '../types';
import { X, Search, ShieldCheck, Filter, Battery, Wifi, User, Clock, ArrowRightLeft, Plus, ChevronRight, History } from 'lucide-react';
import { motion } from 'motion/react';

interface MachineManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  movements: MachineMovement[];
  onOpenScanner: () => void;
}

export const MachineManagementModal: React.FC<MachineManagementModalProps> = ({
  isOpen,
  onClose,
  machines,
  movements,
  onOpenScanner,
}) => {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'HISTORICO'>('INVENTARIO');
  const [statusFilter, setStatusFilter] = useState<MachineStatus | 'TODAS'>('TODAS');
  const [contractorFilter, setContractorFilter] = useState<string>('TODAS');
  const [providerFilter, setProviderFilter] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Dynamic filter lists
  const uniqueContractors = React.useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.contratante) set.add(m.contratante);
    });
    return Array.from(set).sort();
  }, [machines]);

  const uniqueProviders = React.useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.prestadorServico) set.add(m.prestadorServico);
      else if (m.notes && m.notes.startsWith('Prestador: ')) {
        set.add(m.notes.replace('Prestador: ', ''));
      }
    });
    return Array.from(set).sort();
  }, [machines]);

  const filteredMachines = machines.filter((m) => {
    const query = searchQuery.toLowerCase();
    const matchesStatus = statusFilter === 'TODAS' || m.status === statusFilter;
    const matchesContractor = contractorFilter === 'TODAS' || m.contratante === contractorFilter;
    const matchesProvider =
      providerFilter === 'TODAS' ||
      m.prestadorServico === providerFilter ||
      (m.notes && m.notes.includes(providerFilter));

    const matchesQuery =
      !query ||
      m.serialNumber.toLowerCase().includes(query) ||
      m.model.toLowerCase().includes(query) ||
      m.currentCustodyName.toLowerCase().includes(query) ||
      (m.prestadorServico && m.prestadorServico.toLowerCase().includes(query)) ||
      (m.contratante && m.contratante.toLowerCase().includes(query));

    return matchesStatus && matchesContractor && matchesProvider && matchesQuery;
  });

  const getStatusBadge = (status: MachineStatus) => {
    switch (status) {
      case 'ESTOQUE':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-800 border border-blue-200">Estoque</span>;
      case 'COM_AGENTE':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-200">Com Agente</span>;
      case 'PRODUCAO':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-teal-100 text-teal-800 border border-teal-200">Em Produção</span>;
      case 'MANUTENCAO':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-800 border border-red-200">Manutenção</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Gestão & Rastreabilidade de Máquinas</h3>
              <p className="text-xs text-slate-500">Inventário completo POS, custódia e histórico de movimentações</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Leitura / Troca</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-header Tabs & Search */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Main Tabs */}
          <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('INVENTARIO')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'INVENTARIO'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Inventário ({machines.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('HISTORICO')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'HISTORICO'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico de Trocas ({movements.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por NS, Modelo, Custodiante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Filter Bar (Inventário Only) */}
        {activeTab === 'INVENTARIO' && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtros do Inventário:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 1. Status */}
              <div className="flex items-center gap-1">
                <label className="text-slate-500 font-semibold">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                >
                  <option value="TODAS">Todos ({machines.length})</option>
                  <option value="ESTOQUE">Estoque</option>
                  <option value="COM_AGENTE">Com Agente</option>
                  <option value="PRODUCAO">Em Produção</option>
                  <option value="MANUTENCAO">Manutenção</option>
                </select>
              </div>

              {/* 2. Contratante */}
              <div className="flex items-center gap-1">
                <label className="text-slate-500 font-semibold">Contratante:</label>
                <select
                  value={contractorFilter}
                  onChange={(e) => setContractorFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 max-w-[160px] shadow-xs"
                >
                  <option value="TODAS">Todos Contratantes</option>
                  {uniqueContractors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Prestador de Serviços */}
              <div className="flex items-center gap-1">
                <label className="text-slate-500 font-semibold">Prestador:</label>
                <select
                  value={providerFilter}
                  onChange={(e) => setProviderFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 max-w-[180px] shadow-xs"
                >
                  <option value="TODAS">Todos Prestadores ({uniqueProviders.length})</option>
                  {uniqueProviders.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {(statusFilter !== 'TODAS' || contractorFilter !== 'TODAS' || providerFilter !== 'TODAS') && (
                <button
                  onClick={() => {
                    setStatusFilter('TODAS');
                    setContractorFilter('TODAS');
                    setProviderFilter('TODOS' as any);
                  }}
                  className="text-red-600 font-bold underline text-[11px] hover:text-red-800"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3">
          {activeTab === 'INVENTARIO' ? (
            filteredMachines.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">
                Nenhuma máquina encontrada com os filtros selecionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredMachines.slice(0, 200).map((machine) => (
                  <div
                    key={machine.id}
                    className="p-4 bg-slate-50 border border-slate-200 hover:border-emerald-400 rounded-xl transition-all flex flex-col justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          {machine.lote}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">{machine.model}</h4>
                        <p className="text-xs font-mono text-emerald-700 font-bold">NS: {machine.serialNumber}</p>
                      </div>
                      <div>{getStatusBadge(machine.status)}</div>
                    </div>

                    <div className="space-y-1 text-xs pt-2 border-t border-slate-200 text-slate-600">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Contratante:</span>
                        <span className="font-bold text-slate-800 truncate">{machine.contratante || 'STONE PAGAMENTOS'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Prestador:</span>
                        <span className="font-bold text-emerald-800 truncate">
                          {machine.prestadorServico || machine.notes?.replace('Prestador: ', '') || 'Base Franquia'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="truncate max-w-[150px]">{machine.currentCustodyName}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-emerald-700 font-bold">
                          <Battery className="w-3.5 h-3.5" />
                          <span>{machine.batteryLevel}%</span>
                        </div>
                      </div>
                    </div>

                    {machine.notes && (
                      <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                        ⚠ {machine.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Movimentation History Table */
            <div className="space-y-3">
              {movements.map((mov) => (
                <div
                  key={mov.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-mono font-bold text-emerald-700">NS: {mov.machineSerial}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      {new Date(mov.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                    <span>{mov.fromCustody}</span>
                    <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">{mov.toCustody}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                    <span>Agente: {mov.agentName}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      Motivo: {mov.reason}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
