import React, { useState } from "react";
import { normalizeName } from "../../utils/workfinityParser";
import {
  FranchiseKPI,
  AngelPerformanceSummary,
  WorkfinityOS,
  Camisa10Lead,
  AIPerformanceInsight,
  DailyChamadoDeposit,
  MonthlyChamadoDeposit,
  FranchiseMonthlyRebateRecord,
} from "../../types/performance";
import {
  initialFranchiseKPIs,
  initialAngelSummaries,
  initialWorkfinityOSList,
  initialCamisa10Leads,
  initialAIPerformanceInsights,
  initialDailyDeposits,
  initialMonthlyDeposits,
  initialMonthlyRebateRecords,
} from "../../data/mockPerformanceData";
import { buildEnrichedAngelSummaries } from "../../utils/angelRegistrationHelper";

// Sub-pages imports
import { PerformanceDashboard } from "./pages/PerformanceDashboard";
import { PerformanceProductivity } from "./pages/PerformanceProductivity";
import { PerformanceIndicators } from "./pages/PerformanceIndicators";
import { PerformanceHistory2025 } from "./pages/PerformanceHistory2025";
import { PerformanceRemuneration } from "./pages/PerformanceRemuneration";
import { PerformanceCamisa10 } from "./pages/PerformanceCamisa10";
import { PerformanceRankings } from "./pages/PerformanceRankings";
import { PerformanceReports } from "./pages/PerformanceReports";
import { PerformanceAIAssistant } from "./pages/PerformanceAIAssistant";
import { PerformanceSettings } from "./pages/PerformanceSettings";

import {
  TrendingUp,
  Target,
  DollarSign,
  Award,
  Trophy,
  FileText,
  Sparkles,
  Sliders,
  LayoutDashboard,
  Zap,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const HermesPerformanceModule: React.FC = () => {
  const [activePage, setActivePage] = useState<string>("dashboard");

  // Central Operational State
  const [franchisesKPIs, setFranchisesKPIs] = useState<FranchiseKPI[]>(initialFranchiseKPIs);
  const [angelSummaries, setAngelSummaries] = useState<AngelPerformanceSummary[]>(() =>
    buildEnrichedAngelSummaries(initialAngelSummaries)
  );
  const [workfinityList, setWorkfinityList] = useState<WorkfinityOS[]>(initialWorkfinityOSList);
  const [camisa10Leads, setCamisa10Leads] = useState<Camisa10Lead[]>(initialCamisa10Leads);
  const [insights, setInsights] = useState<AIPerformanceInsight[]>(initialAIPerformanceInsights);
  const [dailyDeposits, setDailyDeposits] = useState<DailyChamadoDeposit[]>(initialDailyDeposits);
  const [monthlyDeposits, setMonthlyDeposits] = useState<MonthlyChamadoDeposit[]>(initialMonthlyDeposits);
  const [monthlyRebateRecords, setMonthlyRebateRecords] = useState<FranchiseMonthlyRebateRecord[]>(initialMonthlyRebateRecords);

  const handleAddMonthlyRebateRecord = (newRec: Omit<FranchiseMonthlyRebateRecord, "id">) => {
    const created: FranchiseMonthlyRebateRecord = {
      ...newRec,
      id: `REB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      updatedAt: new Date().toISOString().split("T")[0],
    };

    setMonthlyRebateRecords((prev) => [created, ...prev]);

    // If marked as active or matching current month/year (Julho/2026 or isVigente), synchronize to franchisesKPIs
    if (created.isVigente || (created.mes === "Julho" && created.ano === "2026")) {
      setFranchisesKPIs((prev) =>
        prev.map((f) => {
          if (
            f.franchiseId === created.franchiseId ||
            f.franchiseName.toLowerCase() === created.franchiseName.toLowerCase()
          ) {
            return {
              ...f,
              totalRebateGross: created.totalRebateGross,
              bonusDeduction: created.bonusDeduction,
              netRebateBase: created.netRebateBase,
              totalOSMonth: created.totalOSMonth,
            };
          }
          return f;
        })
      );
    }
  };

  const handleUpdateMonthlyRebateRecord = (updated: FranchiseMonthlyRebateRecord) => {
    setMonthlyRebateRecords((prev) =>
      prev.map((rec) => (rec.id === updated.id ? updated : rec))
    );

    // If vigente, synchronize to franchisesKPIs
    if (updated.isVigente || (updated.mes === "Julho" && updated.ano === "2026")) {
      setFranchisesKPIs((prev) =>
        prev.map((f) => {
          if (
            f.franchiseId === updated.franchiseId ||
            f.franchiseName.toLowerCase() === updated.franchiseName.toLowerCase()
          ) {
            return {
              ...f,
              totalRebateGross: updated.totalRebateGross,
              bonusDeduction: updated.bonusDeduction,
              netRebateBase: updated.netRebateBase,
              totalOSMonth: updated.totalOSMonth,
            };
          }
          return f;
        })
      );
    }
  };

  const handleDeleteMonthlyRebateRecord = (id: string) => {
    setMonthlyRebateRecords((prev) => prev.filter((rec) => rec.id !== id));
  };

  const handleAddDailyDeposit = (newDep: Omit<DailyChamadoDeposit, "id" | "timestamp">) => {
    const created: DailyChamadoDeposit = {
      ...newDep,
      id: `DEP-D-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    setDailyDeposits((prev) => [created, ...prev]);

    // Update Angel daily count and monthly total
    setAngelSummaries((prev) =>
      prev.map((ag) => {
        if (ag.angelName.toLowerCase() === newDep.angelName.toLowerCase() || ag.angelId === newDep.angelId) {
          const newDaily = ag.dailyOsCount + newDep.totalChamados;
          const newMonthly = ag.monthlyOsCount + newDep.totalChamados;
          const newAvg = parseFloat((newMonthly / Math.max(1, ag.workedDaysCount)).toFixed(2));
          return {
            ...ag,
            dailyOsCount: newDaily,
            monthlyOsCount: newMonthly,
            realDailyAverage: newAvg,
          };
        }
        return ag;
      })
    );

    // Update Franchise total OS
    setFranchisesKPIs((prev) =>
      prev.map((f) => {
        if (f.franchiseName.toLowerCase() === newDep.franchiseName.toLowerCase()) {
          return {
            ...f,
            totalOSMonth: f.totalOSMonth + newDep.totalChamados,
          };
        }
        return f;
      })
    );
  };

  const handleAddMonthlyDeposit = (newDep: Omit<MonthlyChamadoDeposit, "id" | "timestamp" | "dailyAverage" | "goalMetPercentage">) => {
    const dailyAvg = parseFloat((newDep.totalChamados / Math.max(1, newDep.workedDays)).toFixed(2));
    const goalPct = parseFloat(((newDep.totalChamados / Math.max(1, newDep.monthlyGoal)) * 100).toFixed(1));

    const created: MonthlyChamadoDeposit = {
      ...newDep,
      id: `DEP-M-${Date.now()}`,
      dailyAverage: dailyAvg,
      goalMetPercentage: goalPct,
      timestamp: new Date().toISOString(),
    };

    setMonthlyDeposits((prev) => [created, ...prev]);

    // Consolidate onto Angel summary
    setAngelSummaries((prev) =>
      prev.map((ag) => {
        if (ag.angelName.toLowerCase() === newDep.angelName.toLowerCase() || ag.angelId === newDep.angelId) {
          return {
            ...ag,
            monthlyOsCount: newDep.totalChamados,
            workedDaysCount: newDep.workedDays,
            realDailyAverage: dailyAvg,
          };
        }
        return ag;
      })
    );
  };

  // Handlers for state mutation across submodules
  const handleUpdateFranchiseKPI = (updated: FranchiseKPI) => {
    setFranchisesKPIs((prev) =>
      prev.map((f) => (f.franchiseId === updated.franchiseId ? updated : f))
    );
  };

  const handleUpdateAngelSummary = (updated: AngelPerformanceSummary) => {
    setAngelSummaries((prev) =>
      prev.map((ag) => (ag.angelId === updated.angelId ? updated : ag))
    );
  };

  const handleImportWorkfinityOS = (imported: WorkfinityOS[]) => {
    if (!imported || imported.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Deduplicate & Merge into workfinityList
    setWorkfinityList((prev) => {
      const existingOSNums = new Set(prev.map((item) => item.osNumber.trim().toUpperCase()));
      const newItems = imported.filter(
        (item) => !existingOSNums.has(item.osNumber.trim().toUpperCase())
      );
      const combined = [...newItems, ...prev];

      // 2. Aggregate stats per Angel across ALL Workfinity OS records
      const angelStats: Record<
        string,
        {
          displayName: string;
          franchiseName: string;
          city: string;
          todayOs: number;
          totalOs: number;
          workedDates: Set<string>;
        }
      > = {};

      combined.forEach((os) => {
        if (os.status === "CANCELADA") return;
        const normAngel = normalizeName(os.angelName);
        if (!normAngel) return;

        if (!angelStats[normAngel]) {
          angelStats[normAngel] = {
            displayName: os.angelName,
            franchiseName: os.franchiseName || "Patos",
            city: os.city || "Patos/PB",
            todayOs: 0,
            totalOs: 0,
            workedDates: new Set(),
          };
        }

        angelStats[normAngel].totalOs += 1;
        if (os.date === todayStr) {
          angelStats[normAngel].todayOs += 1;
        }
        if (os.date) {
          angelStats[normAngel].workedDates.add(os.date);
        }
      });

      // 3. Update existing AngelSummaries and auto-create missing Angels
      setAngelSummaries((prevAngels) => {
        const matchedNormNames = new Set<string>();

        const updatedExisting = prevAngels.map((ag) => {
          const normAg = normalizeName(ag.angelName);
          const stats = angelStats[normAg];
          if (!stats) return ag;

          matchedNormNames.add(normAg);
          const workedDays = Math.max(ag.workedDaysCount, stats.workedDates.size, 1);
          const totalOs = stats.totalOs;
          const dailyOs = stats.todayOs;
          const realAvg = parseFloat((totalOs / Math.max(1, workedDays)).toFixed(2));
          const newShare = (totalOs / 1020) * 21530.3;

          return {
            ...ag,
            dailyOsCount: dailyOs,
            monthlyOsCount: totalOs,
            workedDaysCount: workedDays,
            realDailyAverage: realAvg,
            individualRebateShare: newShare,
            predictedValue: newShare * 0.03,
            finalValue: newShare * ag.earnedPercentage,
          };
        });

        // Find any angels in imported file NOT in existing list
        const newAngels: AngelPerformanceSummary[] = [];
        Object.entries(angelStats).forEach(([normKey, stats]) => {
          if (!matchedNormNames.has(normKey)) {
            const workedDays = Math.max(1, stats.workedDates.size);
            const realAvg = parseFloat((stats.totalOs / workedDays).toFixed(2));
            const share = (stats.totalOs / 1020) * 21530.3;

            newAngels.push({
              angelId: `ANGEL-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              angelName: stats.displayName,
              franchiseName: stats.franchiseName,
              city: stats.city,
              jobTitle: "Técnico de Campo",
              isReverseLogisticsResp: false,
              dailyOsCount: stats.todayOs,
              weeklyOsCount: Math.round(stats.totalOs / 4),
              monthlyOsCount: stats.totalOs,
              yearlyOsCount: stats.totalOs,
              workedDaysCount: workedDays,
              realDailyAverage: realAvg,
              individualRebateShare: share,
              TMAStoneMet: true,
              TMATonMet: true,
              CicloMet: true,
              earnedPercentage: 0.03,
              predictedValue: share * 0.03,
              finalValue: share * 0.03,
              projectedClosingValue: share * 0.03,
              missingForMaxRemuneration: 0,
            });
          }
        });

        return [...updatedExisting, ...newAngels];
      });

      // 4. Update Franchise KPIs and auto-create missing Franchises
      const franchiseStats: Record<string, { displayName: string; city: string; totalOs: number }> = {};
      combined.forEach((os) => {
        if (os.status === "CANCELADA") return;
        const normFran = normalizeName(os.franchiseName);
        if (!normFran) return;

        if (!franchiseStats[normFran]) {
          franchiseStats[normFran] = {
            displayName: os.franchiseName,
            city: os.city || "Patos/PB",
            totalOs: 0,
          };
        }

        franchiseStats[normFran].totalOs += 1;
      });

      setFranchisesKPIs((prevFran) => {
        const matchedFran = new Set<string>();

        const updatedPrev = prevFran.map((f) => {
          const normF = normalizeName(f.franchiseName);
          const stats = franchiseStats[normF];
          if (!stats) return f;

          matchedFran.add(normF);
          return {
            ...f,
            totalOSMonth: stats.totalOs,
          };
        });

        const newFranchises: FranchiseKPI[] = [];
        Object.entries(franchiseStats).forEach(([normKey, stats]) => {
          if (!matchedFran.has(normKey)) {
            newFranchises.push({
              franchiseId: `FRAN-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              franchiseName: stats.displayName,
              city: stats.city,
              totalRebateGross: stats.totalOs * 25.0,
              bonusDeduction: stats.totalOs * 2.5,
              netRebateBase: stats.totalOs * 22.5,
              TMAStone: 0.85,
              TMATon: 2.1,
              Ciclo: 0.82,
              TMAStoneTarget: 0.9,
              TMATonTarget: 2.5,
              CicloTarget: 0.9,
              totalOSMonth: stats.totalOs,
              dailyGoalTarget: 40,
              monthlyGoalTarget: 1000,
            });
          }
        });

        return [...updatedPrev, ...newFranchises];
      });

      return combined;
    });
  };

  const handleAddCamisa10Lead = (newLead: Omit<Camisa10Lead, "id" | "bonusAmount">) => {
    const created: Camisa10Lead = {
      ...newLead,
      id: `C10-${Date.now()}`,
      bonusAmount: newLead.status === "Credenciado" ? 30.0 : 0,
    };
    setCamisa10Leads((prev) => [created, ...prev]);
  };

  const handleUpdateCamisa10Status = (id: string, newStatus: Camisa10Lead["status"]) => {
    setCamisa10Leads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              status: newStatus,
              bonusAmount: newStatus === "Credenciado" ? 30.0 : 0,
            }
          : lead
      )
    );
  };

  // Sub-navigation Pages definition
  const subPages = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "indicators", label: "Indicadores", icon: Target },
    { id: "history", label: "Histórico 2025/2026", icon: FileSpreadsheet },
    { id: "remuneration", label: "Remuneração Variável", icon: DollarSign },
    { id: "camisa10", label: "Camisa 10", icon: Award },
    { id: "rankings", label: "Rankings", icon: Trophy },
    { id: "reports", label: "Relatórios", icon: FileText },
    { id: "ia_performance", label: "IA Performance", icon: Sparkles, badge: "Gemini 2.5" },
    { id: "settings", label: "Configurações", icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Module Internal Sub-Header Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-lg overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <div className="px-3 py-2 text-emerald-400 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border-r border-slate-800 pr-4 mr-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            HERMES PERFORMANCE
          </div>

          {subPages.map((page) => {
            const Icon = page.icon;
            const isActive = activePage === page.id;

            return (
              <button
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-emerald-500 text-slate-950 font-black shadow-md scale-[1.02]"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-slate-950" : "text-emerald-400"}`} />
                <span>{page.label}</span>
                {page.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                      isActive ? "bg-slate-950 text-emerald-400" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {page.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active Sub-Page */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activePage === "dashboard" && (
            <PerformanceDashboard
              franchisesKPIs={franchisesKPIs}
              angelSummaries={angelSummaries}
              workfinityList={workfinityList}
              insights={insights}
              onNavigatePage={(pageId) => setActivePage(pageId === "productiveness" ? "rankings" : pageId)}
            />
          )}

          {activePage === "productiveness" && (
            <PerformanceProductivity
              workfinityList={workfinityList}
              angelSummaries={angelSummaries}
              franchisesKPIs={franchisesKPIs}
              dailyDeposits={dailyDeposits}
              monthlyDeposits={monthlyDeposits}
              onImportWorkfinityOS={handleImportWorkfinityOS}
              onAddDailyDeposit={handleAddDailyDeposit}
              onAddMonthlyDeposit={handleAddMonthlyDeposit}
            />
          )}

          {activePage === "indicators" && <PerformanceIndicators onEditar={() => setActivePage("remuneration")} />}

          {activePage === "history" && <PerformanceHistory2025 />}

          {activePage === "remuneration" && (
            <PerformanceRemuneration
              franchisesKPIs={franchisesKPIs}
              angelSummaries={angelSummaries}
              monthlyRebateRecords={monthlyRebateRecords}
              onUpdateAngelSummary={handleUpdateAngelSummary}
              onUpdateFranchiseKPI={handleUpdateFranchiseKPI}
              onAddMonthlyRebateRecord={handleAddMonthlyRebateRecord}
              onUpdateMonthlyRebateRecord={handleUpdateMonthlyRebateRecord}
              onDeleteMonthlyRebateRecord={handleDeleteMonthlyRebateRecord}
            />
          )}

          {activePage === "camisa10" && (
            <PerformanceCamisa10
              camisa10Leads={camisa10Leads}
              angelSummaries={angelSummaries}
              onAddCamisa10Lead={handleAddCamisa10Lead}
              onUpdateLeadStatus={handleUpdateCamisa10Status}
            />
          )}

          {activePage === "rankings" && <PerformanceRankings />}

          {activePage === "reports" && (
            <PerformanceReports
              angelSummaries={angelSummaries}
              franchisesKPIs={franchisesKPIs}
              workfinityList={workfinityList}
            />
          )}

          {activePage === "ia_performance" && (
            <PerformanceAIAssistant
              angelSummaries={angelSummaries}
              franchisesKPIs={franchisesKPIs}
              insights={insights}
            />
          )}

          {activePage === "settings" && <PerformanceSettings />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
