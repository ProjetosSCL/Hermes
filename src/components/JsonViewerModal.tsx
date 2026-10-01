import React, { useState } from 'react';
import { SystemDataExport } from '../types';
import { X, Code2, Copy, Check, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface JsonViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SystemDataExport;
}

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({ isOpen, onClose, data }) => {
  const [copied, setCopied] = useState(false);
  const [selectedKey, setSelectedKey] = useState<keyof SystemDataExport | 'FULL'>('FULL');

  if (!isOpen) return null;

  const displayData = selectedKey === 'FULL' ? data : data[selectedKey];
  const jsonString = JSON.stringify(displayData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stone_franchise_logistics_data_${selectedKey.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[80vh] my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900">
            <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Estrutura de Dados do Sistema (JSON)</h3>
              <p className="text-xs text-slate-500">Usuários, Máquinas, Movimentações, Frota & Checklists</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-emerald-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .json</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter keys bar */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
          {(['FULL', 'users', 'machines', 'movements', 'slaTickets', 'checklists', 'fleetLogs', 'vehicles'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSelectedKey(k as any)}
              className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                selectedKey === k
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {k === 'FULL' ? '📦 Estrutura Completa' : k}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 p-5 overflow-auto bg-slate-900">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap select-all">
            {jsonString}
          </pre>
        </div>
      </motion.div>
    </div>
  );
};
