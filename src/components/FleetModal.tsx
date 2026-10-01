import React, { useState } from 'react';
import { Vehicle, FuelLog } from '../types';
import { X, Fuel, Truck, AlertTriangle, Check, Calculator, Clock, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface FleetModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  onAddFuelLog: (log: FuelLog) => void;
}

export const FleetModal: React.FC<FleetModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  fuelLogs,
  onAddFuelLog,
}) => {
  const [selectedPlate, setSelectedPlate] = useState(vehicles[0]?.plate || 'STN-4020');
  const [currentKm, setCurrentKm] = useState<number>(49150);
  const [liters, setLiters] = useState<number>(30);
  const [totalCostR$, setTotalCostR$] = useState<number>(180);
  const [fuelType, setFuelType] = useState<'GASOLINA' | 'ETANOL' | 'DIESEL'>('GASOLINA');
  const [gasStation, setGasStation] = useState('Posto Ipiranga Av. Paulista');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentVehicle = vehicles.find((v) => v.plate === selectedPlate) || vehicles[0];

  // Calculations
  const kmDrivenSinceLast = Math.max(1, currentKm - (currentVehicle?.currentKm || 0));
  const calculatedKmL = liters > 0 ? Number((kmDrivenSinceLast / liters).toFixed(1)) : 0;
  const calculatedCostPerKm = kmDrivenSinceLast > 0 ? Number((totalCostR$ / kmDrivenSinceLast).toFixed(2)) : 0;

  const isConsumptionAbnormal = calculatedKmL > 0 && calculatedKmL < 8.0 && currentVehicle?.model.includes('Fiorino');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newLog: FuelLog = {
      id: `FUE-${Math.floor(800 + Math.random() * 200)}`,
      vehiclePlate: selectedPlate,
      vehicleModel: currentVehicle?.model || 'Fiat Fiorino',
      agentId: 'AGT-001',
      agentName: 'Carlos Silva',
      timestamp: new Date().toISOString(),
      currentKm,
      liters,
      totalCostR$,
      fuelType,
      gasStation,
      calculatedKmL,
      calculatedCostPerKm,
    };

    onAddFuelLog(newLog);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Gestão de Frota & Abastecimento</h3>
              <p className="text-xs text-slate-500">Cálculo automático de consumo médio (km/L) e custo por km</p>
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
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {success ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto font-bold">
                <Check className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-slate-900">Abastecimento Registrado com Sucesso!</p>
              <p className="text-xs text-slate-500">Métricas de consumo do veículo atualizadas.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Vehicle Selection */}
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Selecione o Veículo</label>
                <select
                  value={selectedPlate}
                  onChange={(e) => setSelectedPlate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                >
                  {vehicles.map((v) => (
                    <option key={v.plate} value={v.plate}>
                      {v.model} - Placa: {v.plate} (KM Anterior: {v.currentKm})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fueling Log Fields */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Odômetro Atual (KM)</label>
                  <input
                    type="number"
                    value={currentKm}
                    onChange={(e) => setCurrentKm(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Litros Abastecidos</label>
                  <input
                    type="number"
                    step="0.1"
                    value={liters}
                    onChange={(e) => setLiters(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCostR$}
                    onChange={(e) => setTotalCostR$(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Combustível</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="GASOLINA">Gasolina</option>
                    <option value="ETANOL">Etanol</option>
                    <option value="DIESEL">Diesel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-medium">Nome do Posto / Local</label>
                <input
                  type="text"
                  value={gasStation}
                  onChange={(e) => setGasStation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Automatic Calculation Banner */}
              <div className="p-4 bg-slate-50 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold uppercase tracking-wider">
                  <Calculator className="w-4 h-4" />
                  <span>Cálculo de Eficiência Automático</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">CONSUMO MÉDIO</span>
                    <span className="text-lg font-bold text-slate-900 font-mono">{calculatedKmL} km/L</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">CUSTO POR KM</span>
                    <span className="text-lg font-bold text-emerald-700 font-mono">R$ {calculatedCostPerKm}/km</span>
                  </div>
                </div>

                {isConsumptionAbnormal && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Atenção: Consumo elevado ({calculatedKmL} km/L). Verifique calibragem ou manutenção.</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl border border-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl shadow-md transition-all"
                >
                  Salvar Abastecimento
                </button>
              </div>
            </form>
          )}

          {/* Previous Fuel Logs Table */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <h4 className="font-extrabold text-slate-500 text-xs uppercase tracking-wider">
              Histórico Recente de Abastecimentos:
            </h4>
            {fuelLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">{log.vehiclePlate} - {log.gasStation}</p>
                  <p className="text-[10px] text-slate-500">
                    {log.liters}L • R$ {(log.totalCostR$ || 0).toFixed(2)} • {new Date(log.timestamp).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700 font-mono">{log.calculatedKmL} km/L</p>
                  <p className="text-[10px] text-slate-500">R$ {log.calculatedCostPerKm}/km</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
