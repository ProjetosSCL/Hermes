import React, { useState } from 'react';
import { Machine, ChecklistRecord } from '../types';
import { X, FileCheck, Camera, Check, AlertTriangle, ShieldCheck, Upload, RotateCcw, Sparkles } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { motion } from 'motion/react';

interface ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  onSaveChecklist: (checklist: ChecklistRecord) => void;
}

export const ChecklistModal: React.FC<ChecklistModalProps> = ({
  isOpen,
  onClose,
  machines,
  onSaveChecklist,
}) => {
  const [merchantName, setMerchantName] = useState('Padaria e Confeitaria Central Ltda');
  const [cnpj, setCnpj] = useState('12.345.678/0001-90');
  const [selectedMachineSerial, setSelectedMachineSerial] = useState(machines[0]?.serialNumber || 'STN-9982301-A');
  const [machineCondition, setMachineCondition] = useState<'NOVO' | 'BOM_ESTADO' | 'DANIFICADO' | 'IRREGULAR'>('BOM_ESTADO');

  // Conditional Damage fields
  const [damageType, setDamageType] = useState<'TELA_QUEBRADA' | 'BOBINA_PRESA' | 'DEFEITO_CABO' | 'TAMPER_VIOLADO' | 'OUTROS'>('TELA_QUEBRADA');
  const [damageSeverity, setDamageSeverity] = useState<'ALTA' | 'MEDIA' | 'BAIXA'>('MEDIA');
  const [damageDescription, setDamageDescription] = useState('');
  const [simulatedPhotoUrl, setSimulatedPhotoUrl] = useState('');

  // Conditional Test fields
  const [testTransactionPassed, setTestTransactionPassed] = useState(true);
  const [coilCheckPassed, setCoilCheckPassed] = useState(true);
  const [signalStrengthPercent, setSignalStrengthPercent] = useState(92);

  const [signatureUrl, setSignatureUrl] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSimulatePhotoUpload = () => {
    // Sample Stone defective POS image
    setSimulatedPhotoUrl(
      'https://images.unsplash.com/photo-1556742049-0a670f4a458d?w=400&auto=format&fit=crop&q=80'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedMachine = machines.find((m) => m.serialNumber === selectedMachineSerial);

    const isDamaged = machineCondition === 'DANIFICADO' || machineCondition === 'IRREGULAR';

    const newRecord: ChecklistRecord = {
      id: `CHK-${Math.floor(100 + Math.random() * 900)}`,
      merchantName,
      cnpj,
      machineSerial: selectedMachineSerial,
      machineModel: selectedMachine?.model || 'Stone Smart S920',
      agentId: 'AGT-001',
      agentName: 'Carlos Silva',
      timestamp: new Date().toISOString(),
      machineCondition,
      damageDetails: isDamaged
        ? {
            type: damageType,
            severity: damageSeverity,
            description: damageDescription || 'Irregularidade constatada durante a vistoria do equipamento em campo.',
            photoUrl: simulatedPhotoUrl,
          }
        : undefined,
      installationTests: !isDamaged
        ? {
            testTransactionPassed,
            coilCheckPassed,
            signalStrengthPercent,
          }
        : undefined,
      signatureUrl,
      status: isDamaged ? 'COM_RESSALVAS' : 'APROVADO',
    };

    onSaveChecklist(newRecord);
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
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Checklist Operacional de Campo</h3>
              <p className="text-xs text-slate-500">Formulário dinâmico de instalação & vistoria</p>
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
        <div className="p-5 flex-1 overflow-y-auto">
          {success ? (
            <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto font-bold">
                <Check className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-slate-900">Checklist Registrado com Sucesso!</p>
              <p className="text-xs text-slate-500">Laudo técnico associado ao terminal e disponível no sistema.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Merchant Details */}
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-700">
                  1. Dados do Estabelecimento & Equipamento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">Nome do Estabelecimento</label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1 font-medium">CNPJ</label>
                    <input
                      type="text"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1 font-medium">Selecione o POS / Máquina</label>
                  <select
                    value={selectedMachineSerial}
                    onChange={(e) => setSelectedMachineSerial(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={m.serialNumber}>
                        {m.model} - NS: {m.serialNumber} ({m.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Condition Choice */}
              <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-extrabold text-emerald-700 text-xs uppercase tracking-wider">
                  2. Condição Física do Equipamento
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['NOVO', 'BOM_ESTADO', 'DANIFICADO', 'IRREGULAR'] as const).map((cond) => (
                    <button
                      type="button"
                      key={cond}
                      onClick={() => setMachineCondition(cond)}
                      className={`p-2 rounded-xl font-bold border text-center transition-all ${
                        machineCondition === cond
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {cond === 'NOVO'
                        ? 'Novo'
                        : cond === 'BOM_ESTADO'
                        ? 'Bom Estado'
                        : cond === 'DANIFICADO'
                        ? 'Danificado'
                        : 'Irregular'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Fields: If Damaged or Irregular */}
              {(machineCondition === 'DANIFICADO' || machineCondition === 'IRREGULAR') && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-red-600 font-extrabold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Detalhes do Dano / Irregularidade</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Tipo de Dano</label>
                      <select
                        value={damageType}
                        onChange={(e) => setDamageType(e.target.value as any)}
                        className="w-full bg-white border border-red-200 rounded-xl p-2 text-slate-900 focus:outline-none"
                      >
                        <option value="TELA_QUEBRADA">Tela Quebrada / Trincada</option>
                        <option value="BOBINA_PRESA">Bobina de Impressão Presa</option>
                        <option value="DEFEITO_CABO">Cabo / Conector com Defeito</option>
                        <option value="TAMPER_VIOLADO">Lacre de Segurança (Tamper) Violado</option>
                        <option value="OUTROS">Outros Defeitos Físicos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Gravidade</label>
                      <select
                        value={damageSeverity}
                        onChange={(e) => setDamageSeverity(e.target.value as any)}
                        className="w-full bg-white border border-red-200 rounded-xl p-2 text-slate-900 focus:outline-none"
                      >
                        <option value="ALTA">Alta (Inoperante)</option>
                        <option value="MEDIA">Média (Parcial)</option>
                        <option value="BAIXA">Baixa (Estético)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Descrição Detalhada do Problema</label>
                    <textarea
                      rows={2}
                      value={damageDescription}
                      onChange={(e) => setDamageDescription(e.target.value)}
                      placeholder="Descreva a falha ou avaria encontrada..."
                      className="w-full bg-white border border-red-200 rounded-xl p-2 text-slate-900 focus:outline-none placeholder-slate-400"
                    />
                  </div>

                  {/* Photo Upload Simulation */}
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Upload de Foto Evidência</label>
                    {simulatedPhotoUrl ? (
                      <div className="relative w-full h-28 bg-slate-900 rounded-xl overflow-hidden border border-red-300">
                        <img src={simulatedPhotoUrl} alt="Avaria" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setSimulatedPhotoUrl('')}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-lg text-[10px]"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSimulatePhotoUpload}
                        className="w-full py-3 bg-white hover:bg-slate-50 border border-dashed border-red-300 rounded-xl flex items-center justify-center gap-2 text-red-600 font-bold transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Simular Captura de Foto Evidência</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Conditional Fields: If Normal / New */}
              {(machineCondition === 'NOVO' || machineCondition === 'BOM_ESTADO') && (
                <div className="p-4 bg-slate-50 border border-emerald-300 rounded-xl space-y-3">
                  <h4 className="font-extrabold text-emerald-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Testes de Instalação e Conectividade
                  </h4>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 cursor-pointer">
                      <span className="text-slate-900 font-medium">Teste de Transação R$ 1,00 Aprovado</span>
                      <input
                        type="checkbox"
                        checked={testTransactionPassed}
                        onChange={(e) => setTestTransactionPassed(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200 cursor-pointer">
                      <span className="text-slate-900 font-medium">Impressão do Comprovante (Bobina) OK</span>
                      <input
                        type="checkbox"
                        checked={coilCheckPassed}
                        onChange={(e) => setCoilCheckPassed(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600"
                      />
                    </label>

                    <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-1">
                      <div className="flex justify-between text-slate-900 font-medium">
                        <span>Nível do Sinal de Rede (4G)</span>
                        <span className="text-emerald-700 font-bold">{signalStrengthPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={signalStrengthPercent}
                        onChange={(e) => setSignalStrengthPercent(Number(e.target.value))}
                        className="w-full accent-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Signature Component */}
              <SignaturePad onSave={(url) => setSignatureUrl(url)} label="3. Assinatura do Responsável no Local" />

              {/* Form Buttons */}
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
                  Finalizar Laudo
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
