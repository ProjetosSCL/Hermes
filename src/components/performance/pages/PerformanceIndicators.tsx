import React, { useState } from "react";
import { FranchiseKPI, AngelPerformanceSummary } from "../../../types/performance";
import {
  Target,
  CheckCircle2,
  XCircle,
  Building2,
  Edit2,
  Save,
  Clock,
  ShieldAlert,
  Users,
  Calendar,
  Filter,
  Search,
  Check,
  Award,
  Sparkles,
  Info,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { driveToDirectUrl } from "../../../utils/angelRegistrationHelper";

interface PerformanceIndicatorsProps {
  franchisesKPIs: FranchiseKPI[];
  angelSummaries?: AngelPerformanceSummary[];
  onUpdateFranchiseKPI: (updated: FranchiseKPI) => void;
}

export const PerformanceIndicators: React.FC<PerformanceIndicatorsProps> = ({
  franchisesKPIs,
  angelSummaries = [],
  onUpdateFranchiseKPI,
}) => {
  // Reference Period - defaults to previous month "Julho 2026"
  const [selectedMonth, setSelectedMonth] = useState<string>("Julho");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [statusFilter, setStatusFilter] = useState<"TODAS" | "CONFORME" | "RESSALVA">("TODAS");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FranchiseKPI | null>(null);

  const referenceMonthLabel = `${selectedMonth} de ${selectedYear}`;
  const isPreviousMonthStandard = selectedMonth === "Julho" && selectedYear === "2026";

  const handleStartEdit = (f: FranchiseKPI) => {
    setEditingId(f.franchiseId);
    setEditForm({ ...f });
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onUpdateFranchiseKPI(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  // Filter franchises
  const filteredFranchises = franchisesKPIs.filter((f) => {
    const isEditing = editingId === f.franchiseId && editForm;
    const kpi = isEditing ? editForm : f;

    const stoneMet = kpi.TMAStone <= kpi.TMAStoneTarget;
    const tonMet = kpi.TMATon <= kpi.TMATonTarget;
    const cicloMet = kpi.Ciclo <= kpi.CicloTarget;
    const allMet = stoneMet && tonMet && cicloMet;

    if (statusFilter === "CONFORME" && !allMet) return false;
    if (statusFilter === "RESSALVA" && allMet) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = f.franchiseName.toLowerCase().includes(term);
      const matchCity = f.city.toLowerCase().includes(term);
      if (!matchName && !matchCity) return false;
    }

    return true;
  });

  // Calculate network-wide aggregates for this reference month
  const totalCount = franchisesKPIs.length;
  const conformingCount = franchisesKPIs.filter(
    (f) =>
      (f.TMAStone ?? 999) <= (f.TMAStoneTarget ?? 0.9) &&
      (f.TMATon ?? 999) <= (f.TMATonTarget ?? 2.5) &&
      (f.Ciclo ?? 999) <= (f.CicloTarget ?? 0.9)
  ).length;
  const ressalvaCount = totalCount - conformingCount;
  const conformingPct = totalCount > 0 ? ((conformingCount / totalCount) * 100).toFixed(0) : "0";

  const avgStone =
    totalCount > 0
      ? (franchisesKPIs.reduce((acc, f) => acc + (f.TMAStone || 0), 0) / totalCount).toFixed(2)
      : "0.00";
  const avgTon =
    totalCount > 0
      ? (franchisesKPIs.reduce((acc, f) => acc + (f.TMATon || 0), 0) / totalCount).toFixed(2)
      : "0.00";
  const avgCiclo =
    totalCount > 0
      ? (franchisesKPIs.reduce((acc, f) => acc + (f.Ciclo || 0), 0) / totalCount).toFixed(2)
      : "0.00";

  return (
    <div className="space-y-6">
      {/* Top Banner with Clear Reference Month Indicator */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white border border-emerald-800/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                HERMES PERFORMANCE • MÓDULO INDICADORES
              </span>

              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                MÊS ANTERIOR (COMPETÊNCIA FECHADA)
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
              <span>Indicadores de Performance das Franquias</span>
              <span className="text-emerald-400 font-extrabold text-xl">({referenceMonthLabel})</span>
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Nesta aba ficam consolidados os <strong className="text-white">indicadores do mês anterior das franquias</strong> (por exemplo, <span className="text-emerald-300 font-bold">Julho de 2026</span>). Os índices operacionais de <strong className="text-white">TMA Stone</strong>, <strong className="text-white">TMA Ton</strong> e <strong className="text-white">Ciclo de Triagem</strong> apurados pela unidade no mês fechado são herdados automaticamente por todos os Angels da franquia para o cálculo da Remuneração Variável e Bônus de Rebate.
            </p>
          </div>

          {/* Reference Month Selector Widget */}
          <div className="bg-slate-800/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-700 space-y-3 shrink-0 lg:w-80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Mês de Referência
              </span>
              {isPreviousMonthStandard && (
                <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Vigente (Mês Anterior)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Mês Fechado</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Julho">Julho (Mês Anterior)</option>
                  <option value="Junho">Junho</option>
                  <option value="Maio">Maio</option>
                  <option value="Abril">Abril</option>
                  <option value="Março">Março</option>
                  <option value="Fevereiro">Fevereiro</option>
                  <option value="Janeiro">Janeiro</option>
                  <option value="Dezembro">Dezembro</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold">Ano</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Metas Padrão:</span>
              <span className="font-mono font-bold text-emerald-400">≤0,90h | ≤2,50h | ≤0,90h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network Overview Summary Cards for the Reference Month */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Reference Period */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Competência</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-slate-900">{referenceMonthLabel}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">Mês Fechado / Anterior</div>
        </div>

        {/* Card 2: 100% Conforming Franchises */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>100% Conformes</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-emerald-700">
            {conformingCount} / {totalCount} ({conformingPct}%)
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Bônus Integral (+3,0%)</div>
        </div>

        {/* Card 3: TMA Stone Avg */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Média TMA Stone</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-base font-black font-mono text-slate-900">{avgStone}h</div>
          <div className="text-[10px] text-slate-500 mt-1">Meta Global: ≤ 0,90h</div>
        </div>

        {/* Card 4: TMA Ton Avg */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Média TMA Ton</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-base font-black font-mono text-slate-900">{avgTon}h</div>
          <div className="text-[10px] text-slate-500 mt-1">Meta Global: ≤ 2,50h</div>
        </div>

        {/* Card 5: Ciclo Avg */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
            <span>Média Ciclo Triagem</span>
            <Clock className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-base font-black font-mono text-slate-900">{avgCiclo}h</div>
          <div className="text-[10px] text-slate-500 mt-1">Meta Global: ≤ 0,90h</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar Status:
          </span>

          <button
            onClick={() => setStatusFilter("TODAS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "TODAS"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Todas ({totalCount})
          </button>

          <button
            onClick={() => setStatusFilter("CONFORME")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "CONFORME"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            100% Conformes ({conformingCount})
          </button>

          <button
            onClick={() => setStatusFilter("RESSALVA")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "RESSALVA"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Com Ressalva ({ressalvaCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar franquia ou cidade..."
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
          />
        </div>
      </div>

      {/* Franchise KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFranchises.map((f) => {
          const isEditing = editingId === f.franchiseId && editForm;
          const kpi = isEditing && editForm ? editForm : f;

          const tmaStoneVal = kpi.TMAStone ?? 0;
          const tmaStoneTarget = kpi.TMAStoneTarget ?? 0.9;
          const tmaTonVal = kpi.TMATon ?? 0;
          const tmaTonTarget = kpi.TMATonTarget ?? 2.5;
          const cicloVal = kpi.Ciclo ?? 0;
          const cicloTarget = kpi.CicloTarget ?? 0.9;

          const stoneMet = tmaStoneVal <= tmaStoneTarget;
          const tonMet = tmaTonVal <= tmaTonTarget;
          const cicloMet = cicloVal <= cicloTarget;
          const allMet = stoneMet && tonMet && cicloMet;

          // Calculate earned bonus percentage from KPIs
          let earnedBonusPct = 0;
          if (stoneMet) earnedBonusPct += 1.0;
          if (tonMet) earnedBonusPct += 1.0;
          if (cicloMet) earnedBonusPct += 1.0;

          // Find angels affiliated with this franchise
          const affiliatedAngels = angelSummaries.filter(
            (ag) =>
              ag.franchiseName.toLowerCase().includes(f.franchiseName.toLowerCase()) ||
              f.franchiseName.toLowerCase().includes(ag.franchiseName.toLowerCase())
          );

          return (
            <div
              key={f.franchiseId}
              className={`bg-white border-2 rounded-3xl p-5 shadow-xs transition-all relative flex flex-col justify-between ${
                allMet
                  ? "border-emerald-200 hover:border-emerald-400"
                  : "border-amber-300 hover:border-amber-400"
              }`}
            >
              <div>
                {/* Reference Tag & Status Bar */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    {referenceMonthLabel} (Mês Anterior)
                  </span>

                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                      allMet
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100 text-amber-900 border-amber-300"
                    }`}
                  >
                    {allMet ? "Conforme (100%)" : "Possui Ressalva"}
                  </span>
                </div>

                {/* Franchise Title Bar */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-base font-black text-slate-900">
                        Franquia {f.franchiseName}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{f.city}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => handleStartEdit(f)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                        title="Editar Indicadores Realizados / Metas"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveEdit}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" /> Salvar
                      </button>
                    )}
                  </div>
                </div>

                {/* Bonus Inheritance Summary Tag */}
                <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-bold">Bônus Conquistado Franquia:</span>
                  <span
                    className={`font-black px-2 py-0.5 rounded-md ${
                      earnedBonusPct === 3.0
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    +{earnedBonusPct.toFixed(1)}% / 3.0%
                  </span>
                </div>

                {/* KPI Metrics Display */}
                <div className="space-y-3">
                  {/* 1. TMA Stone */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      stoneMet
                        ? "bg-emerald-50/40 border-emerald-200/80"
                        : "bg-rose-50/40 border-rose-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>TMA Stone</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Meta: ≤ {tmaStoneTarget.toFixed(2)}h)
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <label className="text-[10px] font-bold text-slate-600">Real:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.TMAStone ?? 0}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  TMAStone: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border rounded bg-white"
                            />
                            <label className="text-[10px] font-bold text-slate-600">Meta:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.TMAStoneTarget ?? 0.9}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  TMAStoneTarget: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border rounded bg-white"
                            />
                          </div>
                        ) : (
                          <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                            {tmaStoneVal.toFixed(2)}
                            <span className="text-xs font-normal text-slate-500 ml-0.5">h</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {stoneMet ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Atingido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-300 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Não Atingido
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          {stoneMet ? "+1,0% bônus" : "+0,0% bônus"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. TMA Ton */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      tonMet
                        ? "bg-emerald-50/40 border-emerald-200/80"
                        : "bg-rose-50/40 border-rose-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>TMA Ton</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Meta: ≤ {tmaTonTarget.toFixed(2)}h)
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <label className="text-[10px] font-bold text-slate-600">Real:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.TMATon ?? 0}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  TMATon: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border rounded bg-white"
                            />
                            <label className="text-[10px] font-bold text-slate-600">Meta:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.TMATonTarget ?? 2.5}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  TMATonTarget: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border rounded bg-white"
                            />
                          </div>
                        ) : (
                          <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                            {tmaTonVal.toFixed(2)}
                            <span className="text-xs font-normal text-slate-500 ml-0.5">h</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {tonMet ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Atingido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-300 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Não Atingido
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          {tonMet ? "+1,0% bônus" : "+0,0% bônus"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Ciclo */}
                  <div
                    className={`p-3 rounded-2xl border transition-all ${
                      cicloMet
                        ? "bg-emerald-50/40 border-emerald-200/80"
                        : "bg-rose-50/40 border-rose-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>Ciclo de Triagem</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Meta: ≤ {cicloTarget.toFixed(2)}h)
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 mt-1.5">
                            <label className="text-[10px] font-bold text-slate-600">Real:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.Ciclo ?? 0}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  Ciclo: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border rounded bg-white"
                            />
                            <label className="text-[10px] font-bold text-slate-600">Meta:</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.CicloTarget ?? 0.9}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  CicloTarget: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border rounded bg-white"
                            />
                          </div>
                        ) : (
                          <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                            {cicloVal.toFixed(2)}
                            <span className="text-xs font-normal text-slate-500 ml-0.5">h</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {cicloMet ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Atingido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-300 font-bold text-xs">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Não Atingido
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-500">
                          {cicloMet ? "+1,0% bônus" : "+0,0% bônus"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Affiliated Angels Inheritance Preview */}
                {affiliatedAngels.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                      <span className="flex items-center gap-1 text-emerald-700">
                        <Users className="w-3.5 h-3.5" />
                        Angels que herdam estes KPIs ({affiliatedAngels.length}):
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {affiliatedAngels.map((ag) => {
                        const avatar = ag.fotoUrl ? driveToDirectUrl(ag.fotoUrl) : "";
                        return (
                          <div
                            key={ag.angelId}
                            className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 px-2 py-1 rounded-xl text-[11px] font-medium text-slate-800"
                            title={`${ag.angelName} (${ag.jobTitle})`}
                          >
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={ag.angelName}
                                className="w-4 h-4 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">
                                {ag.angelName.charAt(0)}
                              </div>
                            )}
                            <span className="truncate max-w-[120px] font-semibold">{ag.angelName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Inherited Note */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  Base {referenceMonthLabel}
                </span>
                <span className="font-bold text-slate-800">
                  Total OS: {kpi.totalOSMonth}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFranchises.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma franquia encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Nenhum resultado corresponde ao filtro aplicado ou termo de busca para a competência de {referenceMonthLabel}.
          </p>
          <button
            onClick={() => {
              setStatusFilter("TODAS");
              setSearchTerm("");
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      )}
    </div>
  );
};
