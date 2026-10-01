import React, { useState } from "react";
import { Sliders, Save, CheckCircle2, ShieldCheck, Database, FileSpreadsheet, Lock } from "lucide-react";

export const PerformanceSettings: React.FC = () => {
  const [bonusPoolDeduction, setBonusPoolDeduction] = useState<number>(10);
  const [camisa10BonusValue, setCamisa10BonusValue] = useState<number>(30.0);
  const [defaultTMAStone, setDefaultTMAStone] = useState<number>(0.90);
  const [defaultTMATon, setDefaultTMATon] = useState<number>(2.50);
  const [defaultCiclo, setDefaultCiclo] = useState<number>(0.90);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4 text-emerald-600" />
            HERMES PERFORMANCE • CONFIGURAÇÕES
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Parâmetros Globais da Operação
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ajuste de metas padrão de TMA, taxas de retenção de bônus e valores do Programa Camisa 10.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metas Padrão de Indicadores */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Metas Globais Padrão para Franquias (KPIs)
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Meta Padrão TMA Stone (≤)</label>
              <input
                type="number"
                step="0.01"
                value={defaultTMAStone}
                onChange={(e) => setDefaultTMAStone(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Meta Padrão TMA Ton (≤)</label>
              <input
                type="number"
                step="0.01"
                value={defaultTMATon}
                onChange={(e) => setDefaultTMATon(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Meta Padrão Ciclo (≤)</label>
              <input
                type="number"
                step="0.01"
                value={defaultCiclo}
                onChange={(e) => setDefaultCiclo(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Regras Financeiras e Rebate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            Regras de Repasse & Rebate SCL
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">% Dedução Pool de Bônus sobre Rebate Bruto</label>
              <div className="relative">
                <input
                  type="number"
                  value={bonusPoolDeduction}
                  onChange={(e) => setBonusPoolDeduction(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Default: 10% (Rebate Menos Bônus = Rebate Total - 10%).
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Valor do Bônus Camisa 10 por Cliente Credenciado</label>
              <div className="relative">
                <input
                  type="number"
                  step="5"
                  value={camisa10BonusValue}
                  onChange={(e) => setCamisa10BonusValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-bold">R$</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Default: R$ 30,00 por cliente em status Credenciado.
              </span>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="md:col-span-2 flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl">
          <span className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
            <Lock className="w-4 h-4 text-emerald-400" />
            Alterações refletem imediatamente nos módulos de cálculo do HERMES.
          </span>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Configurações Salvas!
              </span>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Parâmetros
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
