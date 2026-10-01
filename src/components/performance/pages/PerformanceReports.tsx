import React, { useState } from "react";
import { AngelPerformanceSummary, FranchiseKPI, WorkfinityOS } from "../../../types/performance";
import { FileText, Download, Filter, Printer, CheckCircle2, Building2 } from "lucide-react";

interface PerformanceReportsProps {
  angelSummaries: AngelPerformanceSummary[];
  franchisesKPIs: FranchiseKPI[];
  workfinityList: WorkfinityOS[];
}

export const PerformanceReports: React.FC<PerformanceReportsProps> = ({
  angelSummaries,
  franchisesKPIs,
  workfinityList,
}) => {
  const [reportType, setReportType] = useState<"PRODUTIVIDADE" | "REMUNERACAO" | "KPI_FRANQUIAS">("PRODUTIVIDADE");
  const [selectedFranchiseFilter, setSelectedFranchiseFilter] = useState("TODAS");

  const handleExportCSV = () => {
    let headers = "";
    let rows = "";

    if (reportType === "PRODUTIVIDADE") {
      headers = "Angel,Franquia,OS Hoje,OS Mês,Dias Trabalhados,Media Diaria Real\n";
      rows = angelSummaries
        .map((a) => `"${a.angelName}","${a.franchiseName}",${a.dailyOsCount},${a.monthlyOsCount},${a.workedDaysCount},${a.realDailyAverage}`)
        .join("\n");
    } else if (reportType === "REMUNERACAO") {
      headers = "Angel,Franquia,OS Mes,Rebate Base,Perc Conquistado,Valor Final\n";
      rows = angelSummaries
        .map((a) => `"${a.angelName}","${a.franchiseName}",${a.monthlyOsCount},${a.individualRebateShare.toFixed(2)},${(a.earnedPercentage*100).toFixed(1)}%,${a.finalValue.toFixed(2)}`)
        .join("\n");
    } else {
      headers = "Franquia,Cidade,Rebate Total,Rebate Menos Bonus,TMA Stone,TMA Ton,Ciclo\n";
      rows = franchisesKPIs
        .map((f) => `"${f.franchiseName}","${f.city}",${f.totalRebateGross.toFixed(2)},${f.netRebateBase.toFixed(2)},${f.TMAStone},${f.TMATon},${f.Ciclo}`)
        .join("\n");
    }

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `HERMES_Relatorio_${reportType}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4 text-emerald-600" />
            HERMES PERFORMANCE • RELATÓRIOS EXECUTIVOS
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Relatórios e Consolidação Operacional
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Geração de relatórios consolidados em CSV/Excel e impressão para prestação de contas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Report Controls & Type Switch */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setReportType("PRODUTIVIDADE")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              reportType === "PRODUTIVIDADE" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Produtividade Angels
          </button>
          <button
            onClick={() => setReportType("REMUNERACAO")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              reportType === "REMUNERACAO" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Remuneração Variável
          </button>
          <button
            onClick={() => setReportType("KPI_FRANQUIAS")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              reportType === "KPI_FRANQUIAS" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Franquias e Rebates
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Filtrar Franquia:</span>
          <select
            value={selectedFranchiseFilter}
            onChange={(e) => setSelectedFranchiseFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
          >
            <option value="TODAS">Todas as Franquias</option>
            {franchisesKPIs.map((f) => (
              <option key={f.franchiseId} value={f.franchiseName}>{f.franchiseName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Data Table Display */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            {reportType === "PRODUTIVIDADE" && (
              <>
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Angel</th>
                    <th className="p-3">Franquia</th>
                    <th className="p-3">OS Hoje</th>
                    <th className="p-3">OS Mês</th>
                    <th className="p-3">Dias Efetivos Trab.</th>
                    <th className="p-3 text-emerald-700 font-bold">Média Diária Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {angelSummaries.map((a) => (
                    <tr key={a.angelId} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{a.angelName}</td>
                      <td className="p-3 text-slate-600">{a.franchiseName}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{a.dailyOsCount}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{a.monthlyOsCount}</td>
                      <td className="p-3 font-mono text-slate-600">{a.workedDaysCount} dias</td>
                      <td className="p-3 font-mono font-black text-emerald-700">{a.realDailyAverage} OS/dia</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {reportType === "REMUNERACAO" && (
              <>
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Angel</th>
                    <th className="p-3">Franquia</th>
                    <th className="p-3">Rebate Base Gerado</th>
                    <th className="p-3">% Conquistado</th>
                    <th className="p-3">Valor Previsto (3%)</th>
                    <th className="p-3 text-emerald-700 font-bold">Valor Final Aprovado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {angelSummaries.map((a) => (
                    <tr key={a.angelId} className="hover:bg-slate-50">
                      <td className="p-3 font-sans font-bold text-slate-900">{a.angelName}</td>
                      <td className="p-3 font-sans text-slate-600">{a.franchiseName}</td>
                      <td className="p-3 text-slate-800">R$ {(a.individualRebateShare || 0).toFixed(2)}</td>
                      <td className="p-3 font-bold text-emerald-700">{((a.earnedPercentage || 0) * 100).toFixed(1)}%</td>
                      <td className="p-3 text-slate-500">R$ {(a.predictedValue || 0).toFixed(2)}</td>
                      <td className="p-3 font-black text-emerald-700">R$ {(a.finalValue || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {reportType === "KPI_FRANQUIAS" && (
              <>
                <thead className="bg-slate-50 uppercase text-[10px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Franquia</th>
                    <th className="p-3">Cidade</th>
                    <th className="p-3">Rebate Bruto</th>
                    <th className="p-3">Rebate - Bônus (Net)</th>
                    <th className="p-3">TMA Stone</th>
                    <th className="p-3">TMA Ton</th>
                    <th className="p-3">Ciclo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {franchisesKPIs.map((f) => {
                    const stone = f.TMAStone ?? 0;
                    const stoneTarget = f.TMAStoneTarget ?? 0.9;
                    const ton = f.TMATon ?? 0;
                    const tonTarget = f.TMATonTarget ?? 2.5;
                    const ciclo = f.Ciclo ?? 0;
                    const cicloTarget = f.CicloTarget ?? 0.9;
                    return (
                      <tr key={f.franchiseId} className="hover:bg-slate-50">
                        <td className="p-3 font-sans font-bold text-slate-900">{f.franchiseName}</td>
                        <td className="p-3 font-sans text-slate-600">{f.city}</td>
                        <td className="p-3 text-slate-800">R$ {(f.totalRebateGross || 0).toFixed(2)}</td>
                        <td className="p-3 font-bold text-emerald-700">R$ {(f.netRebateBase || 0).toFixed(2)}</td>
                        <td className={`p-3 font-bold ${stone <= stoneTarget ? "text-emerald-600" : "text-red-600"}`}>
                          {stone.toFixed(2)}
                        </td>
                        <td className={`p-3 font-bold ${ton <= tonTarget ? "text-emerald-600" : "text-red-600"}`}>
                          {ton.toFixed(2)}
                        </td>
                        <td className={`p-3 font-bold ${ciclo <= cicloTarget ? "text-emerald-600" : "text-red-600"}`}>
                          {ciclo.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
