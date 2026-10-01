import React, { useState } from 'react';
import { Machine, MachineStatus, MachineMovement } from '../types';
import { X, QrCode, Camera, Check, ArrowRightLeft, ShieldCheck, Battery, Wifi, User, HardDrive, AlertCircle } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { motion, AnimatePresence } from 'motion/react';

interface MachineScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  onUpdateMachineCustody: (
    machineId: string,
    newCustodyId: string,
    newCustodyName: string,
    newStatus: MachineStatus,
    reason: MachineMovement['reason'],
    signatureUrl?: string
  ) => void;
}

export const MachineScannerModal: React.FC<MachineScannerModalProps> = ({
  isOpen,
  onClose,
  machines,
  onUpdateMachineCustody,
}) => {
  const [manualSerialInput, setManualSerialInput] = useState('');
  const [scannedMachine, setScannedMachine] = useState<Machine | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);
  
  // Custody transfer form state
  const [targetCustodyType, setTargetCustodyType] = useState<'AGENTE' | 'CLIENTE' | 'ESTOQUE' | 'MANUTENCAO'>('AGENTE');
  const [targetCustodyName, setTargetCustodyName] = useState('Carlos Silva (Agente)');
  const [targetReason, setTargetReason] = useState<MachineMovement['reason']>('Carga de Estoque');
  const [signatureData, setSignatureData] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleScanSerial = (serial: string) => {
    const found = machines.find(
      (m) => m.serialNumber.toLowerCase() === serial.trim().toLowerCase()
    );
    if (found) {
      setScannedMachine(found);
      setIsScanningActive(false);
    } else {
      alert(`Máquina com Número de Série "${serial}" não foi encontrada no acervo.`);
    }
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedMachine) return;

    let newStatus: MachineStatus = 'COM_AGENTE';
    if (targetCustodyType === 'CLIENTE') newStatus = 'PRODUCAO';
    if (targetCustodyType === 'ESTOQUE') newStatus = 'ESTOQUE';
    if (targetCustodyType === 'MANUTENCAO') newStatus = 'MANUTENCAO';

    onUpdateMachineCustody(
      scannedMachine.id,
      targetCustodyType,
      targetCustodyName,
      newStatus,
      targetReason,
      signatureData
    );

    setSuccessMessage(`Custódia da máquina ${scannedMachine.serialNumber} atualizada com sucesso para "${targetCustodyName}"!`);
    setTimeout(() => {
      setSuccessMessage('');
      setScannedMachine(null);
      setIsScanningActive(true);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Scanner de Máquinas Stone</h3>
              <p className="text-xs text-slate-500">Leitura de Código de Barras / QR / NS em Tempo Real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex-1 space-y-5">
          {successMessage ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto font-bold">
                <Check className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-slate-900">{successMessage}</p>
              <p className="text-xs text-slate-500">Movimentação registrada no histórico da franquia.</p>
            </div>
          ) : isScanningActive ? (
            /* Camera Simulation View */
            <div className="space-y-4">
              <div className="relative w-full h-56 bg-slate-900 rounded-2xl overflow-hidden border-2 border-emerald-500/40 flex flex-col items-center justify-center text-center p-4">
                {/* Laser scan line animation */}
                <motion.div
                  animate={{ y: [-90, 90, -90] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981]"
                />

                <Camera className="w-10 h-10 text-emerald-400 opacity-60 mb-2 animate-pulse" />
                <p className="text-xs font-bold text-white z-10">
                  Aponte a câmera para o Código de Barras / QR Code do POS
                </p>
                <p className="text-[10px] text-slate-300 z-10 mt-1">
                  Ex: NS na parte posterior do dispositivo Stone
                </p>

                {/* Target Frame Corner Accents */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
              </div>

              {/* Quick Test Serial Buttons */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Simular Leitura Instantânea (Selecione uma Máquina):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {machines.slice(0, 4).map((machine) => (
                    <button
                      key={machine.id}
                      onClick={() => handleScanSerial(machine.serialNumber)}
                      className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-400 rounded-xl text-left transition-all group"
                    >
                      <div className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700">
                        {machine.serialNumber}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between mt-1">
                        <span>{machine.model}</span>
                        <span className="text-emerald-700 font-bold">{machine.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Input */}
              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  placeholder="Ou digite o Número de Série (ex: STN-9982301-A)"
                  value={manualSerialInput}
                  onChange={(e) => setManualSerialInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => handleScanSerial(manualSerialInput)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all"
                >
                  Buscar
                </button>
              </div>
            </div>
          ) : scannedMachine ? (
            /* Scanned Machine Details & Custody Transfer Form */
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              {/* Scanned Card */}
              <div className="p-4 bg-slate-50 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-extrabold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                      MÁQUINA LOCALIZADA
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">{scannedMachine.model}</h4>
                    <p className="text-xs font-mono text-emerald-700 font-bold">NS: {scannedMachine.serialNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedMachine(null);
                      setIsScanningActive(true);
                    }}
                    className="text-xs text-slate-500 underline hover:text-slate-800"
                  >
                    Rescanear
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Battery className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{scannedMachine.batteryLevel}% Bateria</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{scannedMachine.connectivity}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="truncate">{scannedMachine.currentCustodyName}</span>
                  </div>
                </div>
              </div>

              {/* Custody Transfer Form */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4" />
                  Troca de Posse (Custódia)
                </h4>

                {/* Target Custody Type */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                      Nova Destinação
                    </label>
                    <select
                      value={targetCustodyType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setTargetCustodyType(val);
                        if (val === 'AGENTE') setTargetCustodyName('Carlos Silva (Agente)');
                        if (val === 'CLIENTE') setTargetCustodyName('Padaria e Confeitaria Central Ltda');
                        if (val === 'ESTOQUE') setTargetCustodyName('Estoque Central Franquia SP');
                        if (val === 'MANUTENCAO') setTargetCustodyName('Laboratório Técnico Stone');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="AGENTE">Com Agente (Campo)</option>
                      <option value="CLIENTE">Instalada no Cliente (Produção)</option>
                      <option value="ESTOQUE">Devolver ao Estoque</option>
                      <option value="MANUTENCAO">Enviar para Manutenção</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                      Responsável / Nome do Custodiante
                    </label>
                    <input
                      type="text"
                      value={targetCustodyName}
                      onChange={(e) => setTargetCustodyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-[11px] text-slate-500 font-semibold mb-1">
                    Motivo da Movimentação
                  </label>
                  <select
                    value={targetReason}
                    onChange={(e) => setTargetReason(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Carga de Estoque">Carga de Estoque para Agente</option>
                    <option value="Entrega Cliente">Entrega & Instalação no Cliente</option>
                    <option value="Retirada Manutenção">Retirada para Manutenção / Defeito</option>
                    <option value="Transferência Agente">Transferência entre Agentes</option>
                    <option value="Devolução">Devolução ao Almoxarifado</option>
                  </select>
                </div>

                {/* Digital Signature */}
                <SignaturePad onSave={(url) => setSignatureData(url)} label="Assinatura de Confirmação de Custódia" />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScannedMachine(null);
                    setIsScanningActive(true);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs border border-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md transition-all"
                >
                  Confirmar Troca de Custódia
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};
