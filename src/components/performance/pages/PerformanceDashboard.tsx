import React, { useState } from "react";
import {
  FranchiseKPI,
  AngelPerformanceSummary,
  WorkfinityOS,
  AIPerformanceInsight,
} from "../../../types/performance";
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Building2,
  Users,
  Target,
  Sparkles,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Zap,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import { driveToDirectUrl } from "../../../utils/angelRegistrationHelper";

interface PerformanceDashboardProps {
  franchisesKPIs: FranchiseKPI[];
  angelSummaries: AngelPerformanceSummary[];
  workfinityList: WorkfinityOS[];
  insights: AIPerformanceInsight[];
  onNavigatePage: (pageId: string) => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  franchisesKPIs,
  angelSummaries,
  workfinityList,
  insights,
  onNavigatePage,
}) => {
  // Filter States
  const [selectedFranchise, setSelectedFranchise] = useState<string>("TODAS");
  const [selectedAngel, setSelectedAngel] = useState<string>("TODOS");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("MES_ATUAL");

  // Filtered Angels
  const filteredAngels = angelSummaries.filter((ag) => {
    if (selectedFranchise !== "TODAS" && ag.franchiseName !== selectedFranchise)
      return false;
    if (selectedAngel !== "TODOS" && ag.angelName !== selectedAngel) return false;
    return true;
  });

  // Aggregated Metrics
  const totalOsToday = filteredAngels.reduce(
    (acc, ag) => acc + ag.dailyOsCount,
    0
  );
  const totalOsMonth = filteredAngels.reduce(
    (acc, ag) => acc + ag.monthlyOsCount,
    0
  );
  const totalWorkedDays = Math.max(
    1,
    Math.round(
      filteredAngels.reduce((acc, ag) => acc + ag.workedDaysCount, 0) /
        Math.max(1, filteredAngels.length)
    )
  );

  // Média Diária considerando APENAS dias efetivamente trabalhados
  const realDailyAvg =
    totalWorkedDays > 0 ? (totalOsMonth / totalWorkedDays).toFixed(1) : "0.0";

  const dailyGoalTotal = filteredAngels.length * 12;
  const monthlyGoalTotal = filteredAngels.length * 220;

  // Sorted Rankings
  const topAngels = [...filteredAngels].sort(
    (a, b) => b.monthlyOsCount - a.monthlyOsCount
  );
  const topFranchises = [...franchisesKPIs].sort(
    (a, b) => b.totalOSMonth - a.totalOSMonth
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            HERMES PERFORMANCE • MÓDULO OPERACIONAL
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Dashboard Executivo de Produtividade
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Acompanhamento centralizado de OS, produtividade de campo, metas de
            KPIs e repasse das franquias SCL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigatePage("productiveness")}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Final da Rota</span>
          </button>
          <button
            onClick={() => onNavigatePage("ia_performance")}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>IA Assistant</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
          <Filter className="w-4 h-4 text-emerald-600" />
          Filtros Globais:
        </div>

        {/* Franquia Filter */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Franquia:</span>
          <select
            value={selectedFranchise}
            onChange={(e) => setSelectedFranchise(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="TODAS">Todas as Franquias</option>
            {franchisesKPIs.map((f) => (
              <option key={f.franchiseId} value={f.franchiseName}>
                {f.franchiseName} ({f.city})
              </option>
            ))}
          </select>
        </div>

        {/* Angel Filter */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Angel:</span>
          <select
            value={selectedAngel}
            onChange={(e) => setSelectedAngel(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="TODOS">Todos os Angels</option>
            {angelSummaries.map((ag) => (
              <option key={ag.angelId} value={ag.angelName}>
                {ag.angelName} ({ag.franchiseName})
              </option>
            ))}
          </select>
        </div>

        {/* Period Filter */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Período:</span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="HOJE">Hoje</option>
            <option value="SEMANA">Esta Semana</option>
            <option value="MES_ATUAL">Mês Atual (Julho 2026)</option>
            <option value="ANO">Ano de 2026</option>
          </select>
        </div>

        {(selectedFranchise !== "TODAS" || selectedAngel !== "TODOS") && (
          <button
            onClick={() => {
              setSelectedFranchise("TODAS");
              setSelectedAngel("TODOS");
            }}
            className="ml-auto text-emerald-700 font-bold hover:underline"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total OS Hoje */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total OS do Dia</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalOsToday}{" "}
            <span className="text-xs font-normal text-slate-500">OS</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>Meta Diária: {dailyGoalTotal} OS</span>
            <span
              className={`font-bold ${
                totalOsToday >= dailyGoalTotal
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {Math.round((totalOsToday / Math.max(1, dailyGoalTotal)) * 100)}%
            </span>
          </div>
        </div>

        {/* Total OS Mês */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total OS do Mês</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalOsMonth}{" "}
            <span className="text-xs font-normal text-slate-500">OS</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span>Meta Mensal: {monthlyGoalTotal} OS</span>
            <span
              className={`font-bold ${
                totalOsMonth >= monthlyGoalTotal
                  ? "text-emerald-600"
                  : "text-emerald-600"
              }`}
            >
              {Math.round((totalOsMonth / Math.max(1, monthlyGoalTotal)) * 100)}%
            </span>
          </div>
        </div>

        {/* Média Diária Real */}
        <div className="bg-white border border-emerald-200 bg-emerald-50/30 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-900 text-xs font-bold mb-1">
            <span>Média Diária Real</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950">
            {realDailyAvg}{" "}
            <span className="text-xs font-semibold text-emerald-700">
              OS/dia
            </span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-800 font-semibold border-t border-emerald-200/60 pt-1.5 flex items-center justify-between">
            <span>Base: {totalWorkedDays} dias trabalhados</span>
            <span className="text-[9px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">
              Sem divisão por 30
            </span>
          </div>
        </div>

        {/* Metas Cumpridas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Cumprimento de Metas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {
              filteredAngels.filter(
                (a) => a.TMAStoneMet && a.TMATonMet && a.CicloMet
              ).length
            }
            <span className="text-xs font-normal text-slate-500">
              /{filteredAngels.length} Angels 100%
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
            TMA Stone, Ton & Ciclo em Conformidade
          </div>
        </div>

        {/* Remuneração Prevista Total */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Repasse Bônus Previsto</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            R${" "}
            {filteredAngels
              .reduce((acc, ag) => acc + ag.finalValue, 0)
              .toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 flex items-center justify-between">
            <span>Base Rebate SCL</span>
            <button
              onClick={() => onNavigatePage("remuneration")}
              className="text-emerald-700 font-bold hover:underline text-[10px]"
            >
              Ver Extrato
            </button>
          </div>
        </div>
      </div>

      {/* IA Smart Alerts Section */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white tracking-wide">
              Alertas Inteligentes & Insights Operacionais (IA HERMES)
            </h3>
          </div>
          <button
            onClick={() => onNavigatePage("ia_performance")}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
          >
            Abrir Assistente Completo <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    ins.type === "BEST_PERFORMER"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : ins.type === "KPI_ALERT"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  }`}
                >
                  {ins.type}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(ins.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-100">{ins.title}</h4>
              <p className="text-[11px] text-slate-300 leading-snug">
                {ins.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Comparisons & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Angels Ranking */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Ranking de Produtividade dos Angels
              </h3>
              <p className="text-xs text-slate-500">
                Classificação por volume de OS concluídas no mês
              </p>
            </div>
            <button
              onClick={() => onNavigatePage("rankings")}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Ranking Geral
            </button>
          </div>

          <div className="space-y-2.5">
            {topAngels.map((ag, idx) => (
              <div
                key={ag.angelId}
                className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      idx === 0
                        ? "bg-amber-400 text-amber-950 shadow-xs"
                        : idx === 1
                        ? "bg-slate-300 text-slate-900"
                        : idx === 2
                        ? "bg-amber-700 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {idx + 1}º
                  </div>

                  <img
                    src={driveToDirectUrl(ag.fotoUrl) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt={ag.angelName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                    }}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/20 bg-slate-200 shrink-0"
                  />

                  <div>
                    <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      {ag.angelName}
                      {ag.isReverseLogisticsResp && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold uppercase">
                          Reversa
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {ag.franchiseName} • {ag.workedDaysCount} dias trab.
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-slate-900">
                    {ag.monthlyOsCount}{" "}
                    <span className="text-[10px] text-slate-500">OS</span>
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-700">
                    Média: {ag.realDailyAverage} OS/dia
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Franchises Ranking */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Ranking de Franquias SCL
              </h3>
              <p className="text-xs text-slate-500">
                Volume mensal de OS e indicadores de conformidade
              </p>
            </div>
            <button
              onClick={() => onNavigatePage("rankings")}
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Ver Todos
            </button>
          </div>

          <div className="space-y-2.5">
            {topFranchises.map((f, idx) => {
              const allMet =
                f.TMAStone <= f.TMAStoneTarget &&
                f.TMATon <= f.TMATonTarget &&
                f.Ciclo <= f.CicloTarget;

              return (
                <div
                  key={f.franchiseId}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center">
                      {idx + 1}º
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">
                        Franquia {f.franchiseName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span>{f.city}</span>
                        <span>•</span>
                        <span
                          className={`font-bold ${
                            allMet ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {allMet ? "KPIs Atingidos" : "Pendência TMA"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">
                      {f.totalOSMonth}{" "}
                      <span className="text-[10px] text-slate-500">OS</span>
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-700">
                      Rebate Líquido: R${" "}
                      {f.netRebateBase.toLocaleString("pt-BR", {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
