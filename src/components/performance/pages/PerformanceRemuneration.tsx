import React, { useState, useMemo } from "react";
import { FranchiseKPI, AngelPerformanceSummary, FranchiseMonthlyRebateRecord } from "../../../types/performance";
import {
  DollarSign,
  Building2,
  UserCheck,
  TrendingUp,
  Percent,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Edit2,
  Sliders,
  Calculator,
  ArrowRight,
  ShieldAlert,
  MessageSquare,
  Shirt,
  Check,
  Calendar,
  Filter,
  Search,
  Trash2,
  Save,
  X,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { driveToDirectUrl, getWhatsAppUrl } from "../../../utils/angelRegistrationHelper";

interface PerformanceRemunerationProps {
  franchisesKPIs: FranchiseKPI[];
  angelSummaries: AngelPerformanceSummary[];
  monthlyRebateRecords?: FranchiseMonthlyRebateRecord[];
  onUpdateAngelSummary: (updated: AngelPerformanceSummary) => void;
  onUpdateFranchiseKPI: (updated: FranchiseKPI) => void;
  onAddMonthlyRebateRecord?: (newRec: Omit<FranchiseMonthlyRebateRecord, "id">) => void;
  onUpdateMonthlyRebateRecord?: (updated: FranchiseMonthlyRebateRecord) => void;
  onDeleteMonthlyRebateRecord?: (id: string) => void;
}

export const PerformanceRemuneration: React.FC<PerformanceRemunerationProps> = ({
  franchisesKPIs,
  angelSummaries,
  monthlyRebateRecords = [],
  onUpdateAngelSummary,
  onUpdateFranchiseKPI,
  onAddMonthlyRebateRecord,
  onUpdateMonthlyRebateRecord,
  onDeleteMonthlyRebateRecord,
}) => {
  const [selectedTab, setSelectedTab] = useState<"EXTRATO" | "SIMULACAO" | "CADASTRO_FRANQUIAS">("EXTRATO");
  const [selectedAngelId, setSelectedAngelId] = useState<string>(angelSummaries[0]?.angelId || "");

  // --- Rebate Filter State ---
  const [filterMonth, setFilterMonth] = useState<string>("Julho");
  const [filterYear, setFilterYear] = useState<string>("2026");
  const [filterMode, setFilterMode] = useState<"VIGENTE" | "ESPECIFICO" | "TODOS">("VIGENTE");
  const [searchFranchise, setSearchFranchise] = useState<string>("");

  // --- Modal State for Add / Edit Rebate ---
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Form Fields
  const [formFranchiseName, setFormFranchiseName] = useState<string>("Patos");
  const [formCity, setFormCity] = useState<string>("Patos/PB");
  const [formMes, setFormMes] = useState<string>("Julho");
  const [formAno, setFormAno] = useState<string>("2026");
  const [formGrossRebate, setFormGrossRebate] = useState<string>("23922.56");
  const [formTotalOS, setFormTotalOS] = useState<string>("1020");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formIsVigente, setFormIsVigente] = useState<boolean>(true);

  const activeAngel = angelSummaries.find((a) => a.angelId === selectedAngelId) || angelSummaries[0];
  const activeFranchise = franchisesKPIs.find((f) => f.franchiseName === activeAngel?.franchiseName) || franchisesKPIs[0];

  // Helper calculation for individual rebate share
  const calculateAngelRebateShare = (osCount: number, totalFranchiseOS: number, netRebateBase: number) => {
    if (!totalFranchiseOS || totalFranchiseOS === 0) return 0;
    return (osCount / totalFranchiseOS) * netRebateBase;
  };

  // Known franchises map for easy city auto-completion
  const knownFranchises = useMemo(() => {
    const map = new Map<string, string>();
    franchisesKPIs.forEach((f) => map.set(f.franchiseName, f.city));
    monthlyRebateRecords.forEach((r) => map.set(r.franchiseName, r.city));
    return map;
  }, [franchisesKPIs, monthlyRebateRecords]);

  // Handle franchise dropdown change in modal
  const handleFranchiseSelectionChange = (name: string) => {
    setFormFranchiseName(name);
    if (knownFranchises.has(name)) {
      setFormCity(knownFranchises.get(name)!);
    }
  };

  // Open modal for NEW record
  const handleOpenAddModal = (defaultMonth = filterMonth, defaultYear = filterYear) => {
    setEditingRecordId(null);
    setFormFranchiseName(franchisesKPIs[0]?.franchiseName || "Patos");
    setFormCity(franchisesKPIs[0]?.city || "Patos/PB");
    setFormMes(defaultMonth === "TODOS" ? "Julho" : defaultMonth);
    setFormAno(defaultYear === "TODOS" ? "2026" : defaultYear);
    setFormGrossRebate("20000.00");
    setFormTotalOS("1000");
    setFormNotes("");
    setFormIsVigente(defaultMonth === "Julho" && defaultYear === "2026");
    setIsModalOpen(true);
  };

  // Open modal for EDITING an existing record
  const handleOpenEditModal = (rec: FranchiseMonthlyRebateRecord) => {
    setEditingRecordId(rec.id);
    setFormFranchiseName(rec.franchiseName);
    setFormCity(rec.city);
    setFormMes(rec.mes);
    setFormAno(rec.ano);
    setFormGrossRebate(rec.totalRebateGross.toString());
    setFormTotalOS(rec.totalOSMonth.toString());
    setFormNotes(rec.notes || "");
    setFormIsVigente(!!rec.isVigente);
    setIsModalOpen(true);
  };

  // Save Rebate Modal (Add or Update)
  const handleSaveRebate = (e: React.FormEvent) => {
    e.preventDefault();

    const gross = parseFloat(formGrossRebate.replace(",", ".")) || 0;
    const deduction = parseFloat((gross * 0.10).toFixed(2));
    const net = parseFloat((gross - deduction).toFixed(2));
    const totalOS = parseInt(formTotalOS, 10) || 0;

    const recordData = {
      franchiseId: `FRAN-${formFranchiseName.replace(/\s+/g, "").toUpperCase()}-SCL`,
      franchiseName: formFranchiseName.trim(),
      city: formCity.trim(),
      mes: formMes,
      ano: formAno,
      monthYear: `${formMes}/${formAno}`,
      totalRebateGross: gross,
      bonusDeductionRate: 0.10,
      bonusDeduction: deduction,
      netRebateBase: net,
      totalOSMonth: totalOS,
      isVigente: formIsVigente,
      notes: formNotes.trim(),
    };

    if (editingRecordId) {
      if (onUpdateMonthlyRebateRecord) {
        onUpdateMonthlyRebateRecord({
          ...recordData,
          id: editingRecordId,
          updatedAt: new Date().toISOString().split("T")[0],
        });
      }
    } else {
      if (onAddMonthlyRebateRecord) {
        onAddMonthlyRebateRecord(recordData);
      }
    }

    setIsModalOpen(false);
    setEditingRecordId(null);
  };

  // Filtered Rebate Records according to user selections
  const filteredRebateRecords = useMemo(() => {
    return monthlyRebateRecords.filter((rec) => {
      // Filter Mode logic
      if (filterMode === "VIGENTE") {
        // Active month is Julho/2026 (mês anterior fechado)
        const isVigenteMatch = rec.isVigente || (rec.mes === "Julho" && rec.ano === "2026");
        if (!isVigenteMatch) return false;
      } else if (filterMode === "ESPECIFICO") {
        if (filterMonth !== "TODOS" && rec.mes !== filterMonth) return false;
        if (filterYear !== "TODOS" && rec.ano !== filterYear) return false;
      }

      // Search term
      if (searchFranchise.trim()) {
        const term = searchFranchise.toLowerCase();
        const matchName = rec.franchiseName.toLowerCase().includes(term);
        const matchCity = rec.city.toLowerCase().includes(term);
        const matchPeriod = rec.monthYear.toLowerCase().includes(term);
        if (!matchName && !matchCity && !matchPeriod) return false;
      }

      return true;
    });
  }, [monthlyRebateRecords, filterMode, filterMonth, filterYear, searchFranchise]);

  // Aggregate stats for current filtered list
  const aggregateTotals = useMemo(() => {
    const totalGross = filteredRebateRecords.reduce((acc, r) => acc + r.totalRebateGross, 0);
    const totalDeduction = filteredRebateRecords.reduce((acc, r) => acc + r.bonusDeduction, 0);
    const totalNet = filteredRebateRecords.reduce((acc, r) => acc + r.netRebateBase, 0);
    const totalOS = filteredRebateRecords.reduce((acc, r) => acc + r.totalOSMonth, 0);
    const avgTicketOS = totalOS > 0 ? (totalGross / totalOS).toFixed(2) : "0.00";

    return { totalGross, totalDeduction, totalNet, totalOS, avgTicketOS };
  }, [filteredRebateRecords]);

  // Auto-calculated preview in Modal
  const previewGross = parseFloat(formGrossRebate.replace(",", ".")) || 0;
  const previewDeduction = parseFloat((previewGross * 0.10).toFixed(2));
  const previewNet = parseFloat((previewGross - previewDeduction).toFixed(2));
  const previewTotalOS = parseInt(formTotalOS, 10) || 0;
  const previewTicket = previewTotalOS > 0 ? (previewGross / previewTotalOS).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            HERMES PERFORMANCE • REMUNERAÇÃO VARIÁVEL
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Gestão de Remuneração Variável & Rebate SCL
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Cálculo proporcional de repasse individual por Angel com dedução de 10% para pool de bônus, apuração mensal de rebate e regras de logística reversa.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-700">
          <button
            onClick={() => setSelectedTab("EXTRATO")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTab === "EXTRATO" ? "bg-emerald-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            Extrato Individual
          </button>
          <button
            onClick={() => setSelectedTab("SIMULACAO")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              selectedTab === "SIMULACAO" ? "bg-emerald-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            Simulação em Tempo Real
          </button>
          <button
            onClick={() => setSelectedTab("CADASTRO_FRANQUIAS")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === "CADASTRO_FRANQUIAS" ? "bg-emerald-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Franquias & Rebate
          </button>
        </div>
      </div>

      {/* SECTION 1: EXTRATO INDIVIDUAL DO ANGEL */}
      {selectedTab === "EXTRATO" && (
        <div className="space-y-6">
          {/* Angel Switcher Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Selecionar Angel para Visualizar Extrato:</span>
            </div>

            <select
              value={selectedAngelId}
              onChange={(e) => setSelectedAngelId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {angelSummaries.map((ag) => (
                <option key={ag.angelId} value={ag.angelId}>
                  {ag.angelName} — {ag.franchiseName} ({ag.monthlyOsCount} OS)
                </option>
              ))}
            </select>
          </div>

          {activeAngel && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Angel Profile & Summary Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                  <img
                    src={driveToDirectUrl(activeAngel.fotoUrl) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={activeAngel.angelName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                    }}
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-500/30 shrink-0 bg-slate-100 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-base font-black text-slate-900 truncate">{activeAngel.angelName}</h3>
                      {getWhatsAppUrl(activeAngel.whatsapp) && (
                        <a
                          href={getWhatsAppUrl(activeAngel.whatsapp)!}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-[10px] rounded-lg shadow-xs flex items-center gap-1 shrink-0 transition-all"
                          title="Falar no WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3 text-slate-950" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium">{activeAngel.franchiseName} • {activeAngel.jobTitle}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                      activeAngel.isReverseLogisticsResp ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-slate-100 text-slate-700"
                    }`}>
                      {activeAngel.isReverseLogisticsResp ? "Resp. Logística Reversa (1%+1%+1%)" : "Padrão Campo (1.5%+1.5%)"}
                    </span>
                  </div>
                </div>

                {/* Kit de Uniforme do Angel */}
                {(activeAngel.jaqueta || activeAngel.calca || activeAngel.botas || activeAngel.capacete) && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-900">
                      <span className="flex items-center gap-1">
                        <Shirt className="w-3.5 h-3.5 text-emerald-700" />
                        Kit de Uniforme & EPIs Cadastrados:
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono">
                        {activeAngel.registrationId || "SCL-OK"}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center">
                      <div className="bg-white p-1 rounded border border-emerald-100">
                        <span className="text-slate-400 block text-[9px]">Jaqueta</span>
                        <span className="text-slate-800">{activeAngel.jaqueta || "N/A"}</span>
                      </div>
                      <div className="bg-white p-1 rounded border border-emerald-100">
                        <span className="text-slate-400 block text-[9px]">Calça</span>
                        <span className="text-slate-800">{activeAngel.calca || "N/A"}</span>
                      </div>
                      <div className="bg-white p-1 rounded border border-emerald-100">
                        <span className="text-slate-400 block text-[9px]">Botas</span>
                        <span className="text-slate-800">{activeAngel.botas || "N/A"}</span>
                      </div>
                      <div className="bg-white p-1 rounded border border-emerald-100">
                        <span className="text-slate-400 block text-[9px]">Capacete</span>
                        <span className="text-slate-800">{activeAngel.capacete || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* KPI Metrics List */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 font-medium">Quantidade OS no Mês:</span>
                    <span className="font-extrabold text-slate-900">{activeAngel.monthlyOsCount} OS</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 font-medium">Dias Efetivamente Trabalhados:</span>
                    <span className="font-extrabold text-slate-900">{activeAngel.workedDaysCount} dias</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 text-emerald-950 font-bold rounded-xl border border-emerald-200">
                    <span className="text-emerald-800">Média Diária Real:</span>
                    <span className="font-mono text-sm">{activeAngel.realDailyAverage} OS/dia</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-slate-500 font-medium">Base Rebate Gerado Individual:</span>
                    <span className="font-mono font-extrabold text-slate-900">
                      R$ {activeAngel.individualRebateShare.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rules Breakdown & Percentage Conquistada */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  Composição dos % de Remuneração Conquistados
                </h3>

                <div className="space-y-3 text-xs">
                  {/* TMA Stone Rule */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">TMA Stone (Meta ≤ 0,90)</div>
                      <div className="text-[10px] text-slate-500">
                        {activeAngel.isReverseLogisticsResp ? "Vale 1,0%" : "Vale 1,5%"}
                      </div>
                    </div>
                    {activeAngel.TMAStoneMet ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> +{activeAngel.isReverseLogisticsResp ? "1.0%" : "1.5%"}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 text-red-600" /> 0.0% (Perdido)
                      </span>
                    )}
                  </div>

                  {/* TMA Ton Rule */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">TMA Ton (Meta ≤ 2,50)</div>
                      <div className="text-[10px] text-slate-500">
                        {activeAngel.isReverseLogisticsResp ? "Vale 1,0%" : "Vale 1,5%"}
                      </div>
                    </div>
                    {activeAngel.TMATonMet ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> +{activeAngel.isReverseLogisticsResp ? "1.0%" : "1.5%"}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-200">
                        <XCircle className="w-3.5 h-3.5 text-red-600" /> 0.0% (Perdido)
                      </span>
                    )}
                  </div>

                  {/* Ciclo / Logística Reversa */}
                  {activeAngel.isReverseLogisticsResp && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">Ciclo de Triagem (Meta ≤ 0,90)</div>
                        <div className="text-[10px] text-slate-500">Exclusivo Responsável Reversa (Vale 1,0%)</div>
                      </div>
                      {activeAngel.CicloMet ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded text-[11px] flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> +1.0%
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 font-bold rounded text-[11px] flex items-center gap-1 border border-red-200">
                          <XCircle className="w-3.5 h-3.5 text-red-600" /> 0.0% (Perdido)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Camisa 10 Bonus Line */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-950 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        Bônus Camisa 10 (Credenciamento)
                      </div>
                      <div className="text-[10px] text-amber-700">R$ 50,00 por cliente credenciado</div>
                    </div>
                    <span className="font-bold text-amber-900 font-mono text-xs">
                      + R$ {(activeAngel.camisa10BonusTotal || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500 text-slate-950 rounded-xl font-bold flex items-center justify-between">
                  <span>Total % Conquistado:</span>
                  <span className="text-base font-black font-mono">
                    {((activeAngel.earnedPercentage || 0) * 100).toFixed(1)}% / {((activeAngel.maxPossiblePercentage || 0.03) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Final Financial Breakdown Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-2xl p-5 shadow-xs border border-emerald-800/40 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Demonstrativo Financeiro do Angel
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>Base de Rebate Individual:</span>
                      <span className="font-mono font-bold text-white">
                        R$ {(activeAngel.individualRebateShare || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span>Percentual Aplicado:</span>
                      <span className="font-mono font-bold text-emerald-300">
                        x {((activeAngel.earnedPercentage || 0) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span>Repasse Bruto Variável:</span>
                      <span className="font-mono font-bold text-white">
                        R$ {(activeAngel.remunerationGrossCalculated || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-amber-300">
                      <span>Adicional Camisa 10:</span>
                      <span className="font-mono font-bold">
                        + R$ {(activeAngel.camisa10BonusTotal || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-slate-700 pt-2 flex items-center justify-between text-sm">
                      <span className="font-black text-emerald-400">VALOR A RECEBER:</span>
                      <span className="font-mono font-black text-xl text-emerald-400">
                        R$ {(activeAngel.finalValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {(activeAngel.missingForMaxRemuneration || 0) > 0 && (
                  <div className="mt-4 p-2.5 bg-rose-500/20 border border-rose-500/30 rounded-xl text-[11px] text-rose-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <p>
                      Faltam R$ {(activeAngel.missingForMaxRemuneration || 0).toFixed(2)} para atingir o valor máximo por causa da não conformidade nos indicadores de TMA/Ciclo da Franquia.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: SIMULAÇÃO EM TEMPO REAL */}
      {selectedTab === "SIMULACAO" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Simulação de Repasse em Tempo Real (Visão do Angel)
            </h3>
            <p className="text-xs text-slate-500">
              Durante todo o mês o Angel visualiza sua produção atual, projeção e quanto falta para a remuneração máxima.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Quanto Já Produziu</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{activeAngel.monthlyOsCount || 0} OS</div>
              <span className="text-[10px] text-slate-400">Em {activeAngel.workedDaysCount || 0} dias trabalhados</span>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Rebate Gerado Hoje</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                R$ {(activeAngel.individualRebateShare || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Base individual proporcional</span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-800 font-bold uppercase">Receberia Hoje</span>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                R$ {(activeAngel.finalValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">{((activeAngel.earnedPercentage || 0) * 100).toFixed(1)}% conquistado</span>
            </div>

            <div className="p-4 bg-slate-900 text-white border border-slate-800 rounded-xl">
              <span className="text-[11px] text-emerald-400 font-bold uppercase">Projeção Fechamento Mês</span>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                R$ {(activeAngel.projectedClosingValue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">Estimativa fim de mês</span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CADASTRO DE FRANQUIAS E REBATE TOTAL COM HISTÓRICO & FILTRO */}
      {selectedTab === "CADASTRO_FRANQUIAS" && (
        <div className="space-y-6">
          {/* Top Control and Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                    Franquias & Apuração de Rebate Mensal
                  </h3>
                  <span className="bg-emerald-100 text-emerald-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Regra: Rebate Base = Rebate Bruto - 10% Bônus
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lançamento mensal do rebate e total de Ordens de Serviço (OS) apuradas por operação. Por padrão, exibe a competência <strong className="text-slate-800">vigente do mês anterior (Julho/2026)</strong>, com filtro para consulta e edição de meses anteriores.
                </p>
              </div>

              {/* Add New Rebate Button */}
              <button
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Adicionar Rebate do Mês</span>
              </button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  Filtrar Competência:
                </span>

                {/* Filter Mode Buttons */}
                <button
                  onClick={() => {
                    setFilterMode("VIGENTE");
                    setFilterMonth("Julho");
                    setFilterYear("2026");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterMode === "VIGENTE"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Julho/2026 (Vigente • Mês Anterior)
                </button>

                <button
                  onClick={() => {
                    setFilterMode("ESPECIFICO");
                    setFilterMonth("Junho");
                    setFilterYear("2026");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterMode === "ESPECIFICO" && filterMonth === "Junho" && filterYear === "2026"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Junho/2026
                </button>

                <button
                  onClick={() => {
                    setFilterMode("ESPECIFICO");
                    setFilterMonth("Maio");
                    setFilterYear("2026");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterMode === "ESPECIFICO" && filterMonth === "Maio" && filterYear === "2026"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Maio/2026
                </button>

                <button
                  onClick={() => {
                    setFilterMode("TODOS");
                    setFilterMonth("TODOS");
                    setFilterYear("TODOS");
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterMode === "TODOS"
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Todas as Competências
                </button>

                {/* Custom Month Selector */}
                <div className="flex items-center gap-1.5 ml-1">
                  <select
                    value={filterMonth}
                    onChange={(e) => {
                      setFilterMonth(e.target.value);
                      setFilterMode("ESPECIFICO");
                    }}
                    className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Julho">Julho</option>
                    <option value="Junho">Junho</option>
                    <option value="Maio">Maio</option>
                    <option value="Abril">Abril</option>
                    <option value="Março">Março</option>
                    <option value="Fevereiro">Fevereiro</option>
                    <option value="Janeiro">Janeiro</option>
                    <option value="TODOS">Todos os Meses</option>
                  </select>

                  <select
                    value={filterYear}
                    onChange={(e) => {
                      setFilterYear(e.target.value);
                      setFilterMode("ESPECIFICO");
                    }}
                    className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="TODOS">Todos Anos</option>
                  </select>
                </div>
              </div>

              {/* Search by Franchise Name */}
              <div className="relative w-full md:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchFranchise}
                  onChange={(e) => setSearchFranchise(e.target.value)}
                  placeholder="Buscar franquia/cidade..."
                  className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Consolidated Aggregate Cards for Selected Period */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Período Filtrado</span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-sm font-black text-slate-900 truncate">
                {filterMode === "VIGENTE"
                  ? "Julho / 2026 (Vigente)"
                  : filterMode === "TODOS"
                  ? "Todas as Competências"
                  : `${filterMonth} / ${filterYear}`}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">
                {filteredRebateRecords.length} lançamentos encontrados
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Rebate Total (Bruto)</span>
                <DollarSign className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-base font-black font-mono text-slate-900">
                R$ {aggregateTotals.totalGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Faturamento bruto do período</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Dedução Bônus (10%)</span>
                <Percent className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-base font-black font-mono text-amber-700">
                - R$ {aggregateTotals.totalDeduction.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Fundo retido p/ metas</div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
              <div className="text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Base Final Líquida (90%)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-base font-black font-mono text-emerald-800">
                R$ {aggregateTotals.totalNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-emerald-700 font-bold mt-1">Base de repasse aos Angels</div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs col-span-2 sm:col-span-1">
              <div className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Total OS / Média</span>
                <TrendingUp className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-base font-black font-mono text-slate-900">
                {aggregateTotals.totalOS.toLocaleString("pt-BR")} OS
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Média: R$ {aggregateTotals.avgTicketOS} / OS
              </div>
            </div>
          </div>

          {/* Rebates Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Detalhamento por Operação & Competência
                </h4>
                <p className="text-[11px] text-slate-500">
                  Clique em <strong className="text-slate-800">Editar</strong> para atualizar os valores de rebate e OS de qualquer mês.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
                Mostrando {filteredRebateRecords.length} registros
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Franquia</th>
                    <th className="p-3">Cidade / UF</th>
                    <th className="p-3">Competência</th>
                    <th className="p-3">Rebate Total (Bruto)</th>
                    <th className="p-3">Dedução Bônus (10%)</th>
                    <th className="p-3 text-emerald-700 font-bold bg-emerald-50/50">Rebate Menos Bônus (Base Final)</th>
                    <th className="p-3">Total OS Mês</th>
                    <th className="p-3">Ticket Médio</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredRebateRecords.map((r) => {
                    const isVigente = r.isVigente || (r.mes === "Julho" && r.ano === "2026");
                    const ticket = r.totalOSMonth > 0 ? (r.totalRebateGross / r.totalOSMonth).toFixed(2) : "0.00";

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-sans">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="font-black text-slate-900">{r.franchiseName}</span>
                            {isVigente && (
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 rounded font-sans uppercase">
                                Vigente
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-sans text-slate-600">{r.city}</td>
                        <td className="p-3 font-sans">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            {r.monthYear}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          R$ {r.totalRebateGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-amber-700 font-bold">
                          - R$ {r.bonusDeduction.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 font-bold text-emerald-800 bg-emerald-50/60">
                          R$ {r.netRebateBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 font-sans font-bold text-slate-800">
                          {r.totalOSMonth} OS
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          R$ {ticket}/OS
                        </td>
                        <td className="p-3 font-sans text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(r)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                              title="Editar Lançamento de Rebate"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteMonthlyRebateRecord && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Deseja excluir o lançamento de rebate de ${r.franchiseName} (${r.monthYear})?`)) {
                                    onDeleteMonthlyRebateRecord(r.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Excluir Lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRebateRecords.length === 0 && (
              <div className="p-10 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                <h5 className="font-bold text-slate-700 text-sm">Nenhum lançamento de rebate encontrado</h5>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Não existem registros cadastrados para a competência de{" "}
                  <strong>{filterMonth}/{filterYear}</strong> com os filtros atuais.
                </p>
                <button
                  onClick={() => handleOpenAddModal(filterMonth, filterYear)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Cadastrar Rebate para {filterMonth}/{filterYear}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR / EDITAR REBATE MENSAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      {editingRecordId ? "Editar Lançamento de Rebate" : "Novo Lançamento de Rebate Mensal"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cadastre o rebate total e as OS apuradas no mês para a franquia.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRebate} className="space-y-4 text-xs">
                {/* Franchise Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Franquia / Operação *</label>
                    <select
                      value={formFranchiseName}
                      onChange={(e) => handleFranchiseSelectionChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {Array.from(knownFranchises.keys()).map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                      <option value="Nova Operação">+ Outra Franquia...</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Cidade / UF *</label>
                    <input
                      type="text"
                      required
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="Ex: Patos/PB"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Period Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Mês de Competência *</label>
                    <select
                      value={formMes}
                      onChange={(e) => {
                        setFormMes(e.target.value);
                        if (e.target.value === "Julho" && formAno === "2026") {
                          setFormIsVigente(true);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Janeiro">Janeiro</option>
                      <option value="Fevereiro">Fevereiro</option>
                      <option value="Março">Março</option>
                      <option value="Abril">Abril</option>
                      <option value="Maio">Maio</option>
                      <option value="Junho">Junho</option>
                      <option value="Julho">Julho (Mês Anterior)</option>
                      <option value="Agosto">Agosto</option>
                      <option value="Setembro">Setembro</option>
                      <option value="Outubro">Outubro</option>
                      <option value="Novembro">Novembro</option>
                      <option value="Dezembro">Dezembro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Ano *</label>
                    <select
                      value={formAno}
                      onChange={(e) => {
                        setFormAno(e.target.value);
                        if (formMes === "Julho" && e.target.value === "2026") {
                          setFormIsVigente(true);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                    </select>
                  </div>
                </div>

                {/* Values and OS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Rebate Total Bruto (R$) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formGrossRebate}
                        onChange={(e) => setFormGrossRebate(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Total de OS do Mês *</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={formTotalOS}
                        onChange={(e) => setFormTotalOS(e.target.value)}
                        placeholder="Ex: 1020"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 font-bold text-xs">OS</span>
                    </div>
                  </div>
                </div>

                {/* Automatic Computation Breakdown Preview Box */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-900">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Cálculo Automático da Base de Repasse:
                    </span>
                    <span className="text-emerald-700 font-mono text-[10px]">
                      Ticket: R$ {previewTicket}/OS
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                    <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                      <span className="text-[10px] font-sans text-slate-400 block font-bold">Bruto (100%)</span>
                      <span className="font-bold text-slate-900 text-xs">
                        R$ {previewGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
                      <span className="text-[10px] font-sans text-amber-700 block font-bold">Bônus (-10%)</span>
                      <span className="font-bold text-amber-700 text-xs">
                        - R$ {previewDeduction.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-sans text-emerald-100 block font-bold">Base Final (90%)</span>
                      <span className="font-black text-white text-xs">
                        R$ {previewNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes and Vigente check */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Observações / Notas</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ex: Fechamento auditado, repasse aprovado."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isVigenteCheck"
                    checked={formIsVigente}
                    onChange={(e) => setFormIsVigente(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="isVigenteCheck" className="text-xs text-slate-700 font-bold cursor-pointer">
                    Definir como competência vigente para cálculo de repasse dos Angels
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer text-xs flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingRecordId ? "Salvar Alterações" : "Gravar Lançamento"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
