import React, { useState } from "react";
import { parseWorkfinityExcelRow, normalizeName } from "../../../utils/workfinityParser";
import { driveToDirectUrl, getWhatsAppUrl } from "../../../utils/angelRegistrationHelper";
import {
  WorkfinityOS,
  AngelPerformanceSummary,
  FranchiseKPI,
  DailyChamadoDeposit,
  MonthlyChamadoDeposit,
} from "../../../types/performance";
import { read, utils } from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Trophy,
  MessageSquare,
  Calendar,
  Sparkles,
  Zap,
  MapPin,
  User,
  Copy,
  Check,
  UserCheck,
} from "lucide-react";
import { motion } from "motion/react";

interface PerformanceProductivityProps {
  workfinityList: WorkfinityOS[];
  angelSummaries: AngelPerformanceSummary[];
  franchisesKPIs: FranchiseKPI[];
  dailyDeposits: DailyChamadoDeposit[];
  monthlyDeposits: MonthlyChamadoDeposit[];
  onImportWorkfinityOS: (imported: WorkfinityOS[]) => void;
  onAddDailyDeposit?: (newDep: Omit<DailyChamadoDeposit, "id" | "timestamp">) => void;
  onAddMonthlyDeposit?: (
    newDep: Omit<
      MonthlyChamadoDeposit,
      "id" | "timestamp" | "dailyAverage" | "goalMetPercentage"
    >
  ) => void;
}

export const PerformanceProductivity: React.FC<PerformanceProductivityProps> = ({
  workfinityList,
  angelSummaries,
  franchisesKPIs,
  dailyDeposits,
  onImportWorkfinityOS,
}) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const [finalRotaDate, setFinalRotaDate] = useState(todayStr);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // AI WhatsApp State
  const [isGeneratingWhatsApp, setIsGeneratingWhatsApp] = useState(false);
  const [whatsAppText, setWhatsAppText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Handle Daily Workfinity File Import
  const handleFileUploadDaily = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = read(bstr, { type: "binary" });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rawJson: any[] = utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          alert("O arquivo fornecido está vazio ou com formato inválido.");
          return;
        }

        const parsedList: WorkfinityOS[] = rawJson.map((row, idx) =>
          parseWorkfinityExcelRow(row, idx, finalRotaDate)
        );

        onImportWorkfinityOS(parsedList);
        setSuccessMsg(
          `✅ Importação do Workfinity Concluída! ${parsedList.length} Ordens de Serviço processadas para a data ${finalRotaDate}. Rankings e pódio atualizados em tempo real!`
        );
        setTimeout(() => setSuccessMsg(null), 6000);
      } catch (err) {
        console.error("Erro ao importar Workfinity Diário:", err);
        alert("Erro ao ler o arquivo. Certifique-se de enviar um arquivo CSV ou XLSX válido do Workfinity.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const championFranquiaName = (name?: string) => {
    if (!name) return "Franquia Patos";
    return name.startsWith("Franquia") ? name : `Franquia ${name}`;
  };

  // Calculate exact daily OS for each Angel on `finalRotaDate`
  const getAngelDailyOSForDate = (ag: AngelPerformanceSummary) => {
    const normA = normalizeName(ag.angelName);

    // 1. Count from workfinityList for exact attendance date
    const wfOS = workfinityList.filter(
      (os) => normalizeName(os.angelName) === normA && os.date === finalRotaDate && os.status !== "CANCELADA"
    );

    // 2. Count from dailyDeposits for exact date
    const depOS = dailyDeposits
      .filter((d) => normalizeName(d.angelName) === normA && d.date === finalRotaDate)
      .reduce((acc, d) => acc + d.totalChamados, 0);

    if (wfOS.length > 0) return wfOS.length;
    if (depOS > 0) return depOS;
    if (finalRotaDate === todayStr) return ag.dailyOsCount || 0;
    return 0;
  };

  // Calculate exact daily OS for each Franchise on `finalRotaDate`
  const getFranchiseDailyOSForDate = (fran: FranchiseKPI) => {
    const normF = normalizeName(fran.franchiseName);

    // 1. Count from workfinityList for exact attendance date
    const wfOS = workfinityList.filter(
      (os) => normalizeName(os.franchiseName) === normF && os.date === finalRotaDate && os.status !== "CANCELADA"
    );

    // 2. Count from dailyDeposits for exact date
    const depOS = dailyDeposits
      .filter((d) => normalizeName(d.franchiseName) === normF && d.date === finalRotaDate)
      .reduce((acc, d) => acc + d.totalChamados, 0);

    if (wfOS.length > 0) return wfOS.length;
    if (depOS > 0) return depOS;
    if (finalRotaDate === todayStr) {
      return angelSummaries
        .filter((a) => normalizeName(a.franchiseName) === normF)
        .reduce((acc, a) => acc + (a.dailyOsCount || 0), 0);
    }
    return 0;
  };

  // Enriched & Sorted Angels for Final da Rota
  const angelsWithDailyCount = angelSummaries.map((ag) => ({
    ...ag,
    dailyOsForDate: getAngelDailyOSForDate(ag),
  }));
  const sortedAngels = [...angelsWithDailyCount].sort((a, b) => b.dailyOsForDate - a.dailyOsForDate);
  const championAngel = sortedAngels[0] || angelsWithDailyCount[0];

  // Enriched & Sorted Franchises for Final da Rota
  const franchisesWithDailyCount = franchisesKPIs.map((f) => ({
    ...f,
    dailyOsForDate: getFranchiseDailyOSForDate(f),
  }));
  const sortedFranchises = [...franchisesWithDailyCount].sort((a, b) => {
    if (b.dailyOsForDate !== a.dailyOsForDate) {
      return b.dailyOsForDate - a.dailyOsForDate;
    }
    return b.totalOSMonth - a.totalOSMonth;
  });
  const championFranchise = sortedFranchises[0] || franchisesWithDailyCount[0];

  const championAngelOsToday = championAngel?.dailyOsForDate || 0;
  const avgComparison =
    championAngelOsToday >= (championAngel?.realDailyAverage || 1)
      ? `+${Math.round((((championAngelOsToday - (championAngel?.realDailyAverage || 1)) / (championAngel?.realDailyAverage || 1)) * 100))}%`
      : `${Math.round((((championAngelOsToday - (championAngel?.realDailyAverage || 1)) / (championAngel?.realDailyAverage || 1)) * 100))}%`;

  const totalOSHojeGeral = angelsWithDailyCount.reduce((acc, a) => acc + a.dailyOsForDate, 0);

  // AI WhatsApp Handler
  const handleGenerateWhatsAppSummary = async () => {
    setIsGeneratingWhatsApp(true);
    try {
      const payload = {
        prompt: `Gere um comunicado executivo e vibrante para o grupo de WhatsApp da operação sobre o fechamento do Final da Rota na data ${finalRotaDate}.
Destaque com emojis:
1. A Franquia Campeã do Dia: ${championFranquiaName(championFranchise?.franchiseName)} (${championFranchise?.dailyOsForDate || 0} OS atendidas na data).
2. O Angel Campeão de Produção: ${championAngel?.angelName} da franquia ${championAngel?.franchiseName} (${championAngel?.dailyOsForDate || 0} OS na data, média real ${championAngel?.realDailyAverage} OS/dia, comparativo ${avgComparison}).
3. Total Geral de OS atendidas na operação hoje: ${totalOSHojeGeral} OS.
4. Top 3 Franquias e Top 3 Angels.
Finalize parabenizando todo o time com mensagem motivacional. Utilize formatação oficial do WhatsApp (asteriscos para negrito).`,
        contextData: {
          dataAtendimento: finalRotaDate,
          franquiaCampeã: championFranquiaName(championFranchise?.franchiseName),
          franquiaOsHoje: championFranchise?.dailyOsForDate,
          angelCampeão: championAngel?.angelName,
          angelFranquia: championAngel?.franchiseName,
          angelOsHoje: championAngel?.dailyOsForDate,
          totalOSHojeGeral,
          rankingFranquias: sortedFranchises.slice(0, 5).map((f) => ({
            franquia: f.franchiseName,
            osHoje: f.dailyOsForDate,
            totalMes: f.totalOSMonth,
          })),
          rankingAngels: sortedAngels.slice(0, 5).map((a) => ({
            angel: a.angelName,
            franquia: a.franchiseName,
            osHoje: a.dailyOsForDate,
            mediaReal: a.realDailyAverage,
          })),
        },
      };

      const res = await fetch("/api/performance/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.text) {
        setWhatsAppText(data.text);
      } else {
        throw new Error("Resposta vazia da IA");
      }
    } catch (err) {
      console.warn("Fallback local para resumo de WhatsApp:", err);
      const fallbackMsg = `🚀 *HERMES LOGÍSTICA • FINAL DA ROTA (${finalRotaDate})* 📦

🏆 *FRANQUIA CAMPEÃ DO DIA:*
• *${championFranquiaName(championFranchise?.franchiseName)}* com *${championFranchise?.dailyOsForDate || 0} OS atendidas* hoje!
• Acumulado no Mês: *${championFranchise?.totalOSMonth || 0} OS*

⭐ *ANGEL CAMPEÃO DE PRODUÇÃO:*
• *${championAngel?.angelName || "Destaque"}* (${championAngel?.franchiseName || "Patos"})
• Produção no Dia: *${championAngel?.dailyOsForDate || 0} OS concluídas*
• Média Diária Real: *${championAngel?.realDailyAverage || 0} OS/dia*
• Comparativo x Média: *${avgComparison}*

📊 *BALANÇO GERAL DE CAMPO (${finalRotaDate}):*
• Total de OS Atendidas no Dia: *${totalOSHojeGeral} OS*

Parabéns a todo o time de campo pelo comprometimento e excelência nas entregas! 📦💚`;
      setWhatsAppText(fallbackMsg);
    } finally {
      setIsGeneratingWhatsApp(false);
    }
  };

  const handleCopyWhatsApp = () => {
    if (!whatsAppText) return;
    navigator.clipboard.writeText(whatsAppText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner with Date Picker & Quick Import */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/60 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            HERMES PERFORMANCE • FECHAMENTO OPERACIONAL
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            Final da Rota (Produtividade Diária)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Acompanhamento em tempo real dos atendimentos de campo por Data de Atendimento, pódio de campeões e gerador automático de comunicado para o grupo de WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-emerald-900/80 border border-emerald-700/60 p-1.5 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-emerald-400 ml-1" />
            <span className="text-[10px] text-emerald-200 font-bold uppercase">Data:</span>
            <input
              type="date"
              value={finalRotaDate}
              onChange={(e) => setFinalRotaDate(e.target.value)}
              className="bg-slate-900 text-white font-bold text-xs rounded-lg px-2 py-1 border border-emerald-600/60 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            />
            {finalRotaDate !== todayStr && (
              <button
                onClick={() => setFinalRotaDate(todayStr)}
                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] rounded-md transition-all cursor-pointer"
              >
                Hoje ({todayStr})
              </button>
            )}
          </div>

          <label className="cursor-pointer px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0">
            <Upload className="w-4 h-4" />
            <span>Importar Workfinity Diário</span>
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileUploadDaily}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold p-3.5 rounded-xl flex items-center gap-2 shadow-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* Info Banner on Date Rule */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-white">Filtro de Atendimento Ativo:</strong> Exibindo exclusivamente chamados com Data de Atendimento em{" "}
            <span className="text-emerald-400 font-bold underline">{finalRotaDate}</span>.
          </span>
        </div>
        <span className="text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full shrink-0">
          Total Atendido na Data: {totalOSHojeGeral} OS
        </span>
      </div>

      {/* Campeões Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Franquia Campeã */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 border-2 border-amber-400/60 rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-15">
            <Trophy className="w-24 h-24 text-amber-500" />
          </div>
          <div className="text-[10px] uppercase font-black tracking-widest text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full w-max border border-amber-200">
            🏆 Franquia Campeã do Dia ({finalRotaDate})
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-3">
            {championFranquiaName(championFranchise?.franchiseName)}
          </h3>
          <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            {championFranchise?.city || "Patos/PB"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-amber-200/60 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] font-bold">OS Atendidas na Data</span>
              <div className="text-2xl font-black text-amber-950">{championFranchise?.dailyOsForDate || 0} OS</div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold">Acumulado no Mês</span>
              <div className="text-2xl font-black text-slate-800">{championFranchise?.totalOSMonth || 0} OS</div>
            </div>
          </div>
        </div>

        {/* Angel Campeão */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 border-2 border-emerald-400/60 rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-15">
            <Trophy className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="text-[10px] uppercase font-black tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full w-max border border-emerald-200">
            🏆 Angel Campeão de Produção ({finalRotaDate})
          </div>
          <div className="flex items-center gap-3 mt-3">
            <img
              src={
                driveToDirectUrl(championAngel?.fotoUrl) ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
              }
              alt={championAngel?.angelName}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
              }}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shadow-sm shrink-0 bg-slate-200"
            />
            <div>
              <h3 className="text-xl font-black text-slate-900">
                {championAngel?.angelName || "Angel Destaque"}
              </h3>
              <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                {championAngel?.franchiseName || "Patos"} • {championAngel?.jobTitle || "Técnico"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-emerald-200/60 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] font-bold">OS na Data</span>
              <div className="text-xl font-black text-emerald-950">{championAngel?.dailyOsForDate || 0} OS</div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold">Média Real</span>
              <div className="text-xl font-black text-emerald-600">{championAngel?.realDailyAverage || 0} OS/d</div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold">x Média</span>
              <div className="text-xl font-black text-emerald-600">{avgComparison}</div>
            </div>
          </div>
        </div>
      </div>

      {/* RANKING OFICIAL DAS FRANQUIAS E DOS ANGELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking de Franquias */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Ranking das Franquias ({finalRotaDate})
              </h3>
              <p className="text-xs text-slate-500">
                Classificação baseada nos atendimentos realizados na data informada
              </p>
            </div>
            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
              {sortedFranchises.length} Franquias
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedFranchises.map((fran, index) => {
              const maxOS = sortedFranchises[0]?.dailyOsForDate || 1;
              const pct = Math.min(100, Math.round(((fran.dailyOsForDate || 0) / maxOS) * 100));
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div
                  key={fran.franchiseId}
                  className={`p-3 rounded-xl border transition-all ${
                    isFirst
                      ? "bg-amber-50/60 border-amber-300 shadow-xs"
                      : isSecond
                      ? "bg-slate-50 border-slate-300"
                      : isThird
                      ? "bg-orange-50/50 border-orange-200"
                      : "bg-white border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          isFirst
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : isSecond
                            ? "bg-slate-400 text-white"
                            : isThird
                            ? "bg-amber-700 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {index + 1}º
                      </span>
                      <div>
                        <span className="font-black text-slate-900 block">
                          {championFranquiaName(fran.franchiseName)}
                        </span>
                        <span className="text-[10px] text-slate-500">{fran.city}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-amber-950 block">
                        {fran.dailyOsForDate} OS do Dia
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        ({fran.totalOSMonth} OS no mês)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isFirst ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking dos Angels */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Ranking dos Angels ({finalRotaDate})
              </h3>
              <p className="text-xs text-slate-500">
                Atendimentos concluídos na data selecionada e média diária real
              </p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
              {sortedAngels.length} Angels Ativos
            </span>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {sortedAngels.map((ag, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              const photo = driveToDirectUrl(ag.fotoUrl);
              const waUrl = getWhatsAppUrl(ag.whatsapp);

              return (
                <div
                  key={ag.angelId}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isFirst
                      ? "bg-emerald-50/80 border-emerald-300 shadow-xs"
                      : isSecond
                      ? "bg-slate-50 border-slate-200"
                      : isThird
                      ? "bg-amber-50/50 border-amber-200"
                      : "bg-white border-slate-100 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        isFirst
                          ? "bg-emerald-600 text-white shadow-xs"
                          : isSecond
                          ? "bg-slate-400 text-white"
                          : isThird
                          ? "bg-amber-600 text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {index + 1}º
                    </span>

                    <img
                      src={
                        photo ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      }
                      alt={ag.angelName}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                      }}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/30 bg-slate-200 shrink-0"
                    />

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-900 block text-xs">
                          {ag.angelName}
                        </span>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-0.5 bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 transition-colors"
                            title="Enviar mensagem WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-700" />
                          </a>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {ag.franchiseName} • {ag.jobTitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Atendidos no Dia
                      </span>
                      <span className="text-sm font-black text-emerald-950">
                        {ag.dailyOsForDate} OS
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">
                        Média Real
                      </span>
                      <span className="text-xs font-extrabold text-slate-700">
                        {ag.realDailyAverage} OS/d
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* GERADOR AUTOMÁTICO WHATSAPP IA */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Gerador Automático de Resumo para WhatsApp (IA HERMES)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gere em 1 clique a mensagem formatada para compartilhar no grupo de logística ao encerramento da rota.
            </p>
          </div>

          <button
            onClick={handleGenerateWhatsAppSummary}
            disabled={isGeneratingWhatsApp}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {isGeneratingWhatsApp ? "IA Gerando Mensagem..." : "Gerar Resumo WhatsApp"}
          </button>
        </div>

        {whatsAppText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-emerald-400 uppercase tracking-wider">
                Mensagem Pronta para Envio:
              </span>
              <button
                onClick={handleCopyWhatsApp}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar Texto
                  </>
                )}
              </button>
            </div>

            <pre className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 max-h-60 overflow-y-auto">
              {whatsAppText}
            </pre>
          </motion.div>
        )}
      </div>
    </div>
  );
};
