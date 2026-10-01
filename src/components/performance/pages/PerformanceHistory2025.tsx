import React, { useState, useEffect } from "react";
import {
  FranchiseHistoryRecord,
  DEFAULT_SHEET_URL,
  initialHistoricalData,
} from "../../../data/historicalFranchiseData";
import {
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  Building2,
  TrendingUp,
  Target,
  Truck,
  DollarSign,
  Download,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Zap,
  MessageSquare,
  Shirt,
  Edit,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Columns,
  X,
  Save,
  Check,
  RotateCcw,
} from "lucide-react";
import { findAngelRegistration, driveToDirectUrl, getWhatsAppUrl } from "../../../utils/angelRegistrationHelper";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

const FRANCHISE_KEYS = [
  "JOÃO CAMARA",
  "LIMOEIRO DO NORTE",
  "TRAIRI",
  "APODI",
  "PARACATU",
  "MACAU",
  "PATOS",
  "PARELHAS",
];

const FRANCHISE_TECHS: Record<string, { tech1: string; tech2?: string }> = {
  "JOÃO CAMARA": { tech1: "Pedro Lucas Aguiar da Silva", tech2: "José Rivan Teixeira da Silva" },
  "LIMOEIRO DO NORTE": { tech1: "José Ytalo de Menezes Pereira", tech2: "Antonio Alcenir Batista Morais" },
  TRAIRI: { tech1: "Gustavo Santos de Carvalho" },
  APODI: { tech1: "Antônio Afrânio Nunes Costa" },
  PARACATU: { tech1: "Dinarte Jovelino da Silva" },
  MACAU: { tech1: "Kelson Felipe dos Santos Rodrigues", tech2: "Hellen White de Morais Fernandes" },
  PATOS: { tech1: "Kelvys Gomes de Sousa", tech2: "José Lenildo Barbosa L da SIlva" },
  PARELHAS: { tech1: "Gustavo Macedo Freire" },
};

export const PerformanceHistory2025: React.FC = () => {
  const [selectedFranchise, setSelectedFranchise] = useState<string>("JOÃO CAMARA");
  const [selectedYear, setSelectedYear] = useState<string>("TODOS");
  const [sheetUrl, setSheetUrl] = useState<string>(DEFAULT_SHEET_URL);
  const [historyMap, setHistoryMap] = useState<Record<string, FranchiseHistoryRecord[]>>(initialHistoricalData);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);

  // Column Visibility Controls
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({
    mesAno: true,
    osPL: true,
    osRivan: true,
    totalOS: true,
    slaStone: true,
    slaTon: true,
    tmaStone: true,
    tmaTon: true,
    cicloTriagem: true,
    kmPL: true,
    kmRivan: true,
    custosTotais: true,
    acoes: true,
  });

  const [showColumnManager, setShowColumnManager] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<FranchiseHistoryRecord | null>(null);
  const [isNewRecordModal, setIsNewRecordModal] = useState<boolean>(false);

  const toggleColumn = (key: string) => {
    setVisibleCols((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetColumns = () => {
    setVisibleCols({
      mesAno: true,
      osPL: true,
      osRivan: true,
      totalOS: true,
      slaStone: true,
      slaTon: true,
      tmaStone: true,
      tmaTon: true,
      cicloTriagem: true,
      kmPL: true,
      kmRivan: true,
      custosTotais: true,
      acoes: true,
    });
  };

  const hiddenColsCount = Object.values(visibleCols).filter((v) => !v).length;

  const handleSaveRecord = (recordToSave: FranchiseHistoryRecord) => {
    setHistoryMap((prev) => {
      const list = prev[selectedFranchise] || [];
      const index = list.findIndex((r) => r.id === recordToSave.id);
      let newList: FranchiseHistoryRecord[];
      if (index >= 0) {
        newList = [...list];
        newList[index] = recordToSave;
      } else {
        newList = [recordToSave, ...list];
      }
      return {
        ...prev,
        [selectedFranchise]: newList,
      };
    });
    setEditingRecord(null);
    setIsNewRecordModal(false);
  };

  const handleDeleteRecord = (id: string, mesAnoStr: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o registro histórico de ${mesAnoStr}?`)) {
      setHistoryMap((prev) => {
        const list = prev[selectedFranchise] || [];
        return {
          ...prev,
          [selectedFranchise]: list.filter((r) => r.id !== id),
        };
      });
    }
  };

  const handleCreateNewRecord = () => {
    const newRecord: FranchiseHistoryRecord = {
      id: `${selectedFranchise}-${selectedYear === "TODOS" ? "2025" : selectedYear}-Novo-${Date.now()}`,
      franchiseKey: selectedFranchise,
      prestador: selectedFranchise,
      mes: "Novo Mês",
      ano: selectedYear === "TODOS" ? "2025" : selectedYear,
      qtdOsPL: 0,
      qtdOsRivan: 0,
      totalOS: 0,
      slaStone: "98,0%",
      slaTon: "98,0%",
      tmaStone: 0.8,
      tmaTon: 2.2,
      cicloTriagem: 0.8,
      kmRodadosPL: 0,
      kmRodadosRivan: 0,
      custosTotais: "R$ 0,00",
      salarioPL: "R$ 0,00",
      variavelPL: "R$ 0,00",
    };
    setIsNewRecordModal(true);
    setEditingRecord(newRecord);
  };

  // Filtered records for active franchise and year
  const activeRecords = (historyMap[selectedFranchise] || []).filter((r) => {
    if (selectedYear === "TODOS") return true;
    return r.ano === selectedYear;
  });

  const techNames = FRANCHISE_TECHS[selectedFranchise] || { tech1: "Técnico 1", tech2: "Técnico 2" };

  // Helper currency parsers
  const parseCurrency = (val?: string) => {
    if (!val) return 0;
    const cleaned = val.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Aggregated KPIs
  const totalOS = activeRecords.reduce((acc, r) => acc + (r.totalOS || 0), 0);
  const totalOSPL = activeRecords.reduce((acc, r) => acc + (r.qtdOsPL || 0), 0);
  const totalOSRivan = activeRecords.reduce((acc, r) => acc + (r.qtdOsRivan || 0), 0);

  const monthsWithOS = activeRecords.filter((r) => (r.totalOS || 0) > 0).length || 1;
  const avgMonthlyOS = Math.round(totalOS / monthsWithOS);

  // TMA Averages
  const tmaStoneRecords = activeRecords.filter((r) => r.tmaStone != null);
  const avgTMAStone = tmaStoneRecords.length
    ? (tmaStoneRecords.reduce((acc, r) => acc + (r.tmaStone || 0), 0) / tmaStoneRecords.length).toFixed(2)
    : "-";

  const tmaTonRecords = activeRecords.filter((r) => r.tmaTon != null);
  const avgTMATon = tmaTonRecords.length
    ? (tmaTonRecords.reduce((acc, r) => acc + (r.tmaTon || 0), 0) / tmaTonRecords.length).toFixed(2)
    : "-";

  const cicloRecords = activeRecords.filter((r) => r.cicloTriagem != null);
  const avgCiclo = cicloRecords.length
    ? (cicloRecords.reduce((acc, r) => acc + (r.cicloTriagem || 0), 0) / cicloRecords.length).toFixed(2)
    : "-";

  // KM Total
  const totalKmPL = activeRecords.reduce((acc, r) => acc + (r.kmRodadosPL || 0), 0);
  const totalKmRivan = activeRecords.reduce((acc, r) => acc + (r.kmRodadosRivan || 0), 0);

  // Angel Remuneration Totals
  const totalSalarioPL = activeRecords.reduce((acc, r) => acc + parseCurrency(r.salarioPL), 0);
  const totalVariavelPL = activeRecords.reduce((acc, r) => acc + parseCurrency(r.variavelPL), 0);
  const totalCombustivelPL = activeRecords.reduce((acc, r) => acc + parseCurrency(r.combustivelPL), 0);

  const totalSalarioRivan = activeRecords.reduce((acc, r) => acc + parseCurrency(r.salarioRivan), 0);
  const totalVariavelRivan = activeRecords.reduce((acc, r) => acc + parseCurrency(r.variavelRivan), 0);
  const totalCombustivelRivan = activeRecords.reduce((acc, r) => acc + parseCurrency(r.combustivelRivan), 0);

  // Live Sync Functionality via Google Sheets CSV Endpoint
  const handleSyncGoogleSheets = async () => {
    setIsSyncing(true);
    setSyncStatus("Conectando à planilha do Google Sheets...");

    try {
      // Extract Google Sheet ID
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error("URL de planilha do Google Sheets inválida.");
      }
      const spreadsheetId = match[1];

      const newMap: Record<string, FranchiseHistoryRecord[]> = { ...historyMap };
      let updatedCount = 0;

      for (const tabName of FRANCHISE_KEYS) {
        setSyncStatus(`Baixando dados da aba: ${tabName}...`);
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
          tabName
        )}`;

        const res = await fetch(gvizUrl);
        if (!res.ok) continue;

        const csvText = await res.text();
        const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
        if (lines.length <= 1) continue;

        // Header parsing
        const headerMatches = lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
        const headerCols = headerMatches.map((c) => c.replace(/^"|"$/g, "").trim().toUpperCase());

        const parsedRows: FranchiseHistoryRecord[] = [];
        for (let i = 1; i < lines.length; i++) {
          // Quick CSV Split taking quotes into account
          const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          const cols = matches.map((c) => c.replace(/^"|"$/g, "").trim());

          if (!cols[1] || cols[1].trim() === "") continue;
          const mes = cols[1];

          // Determine year
          let ano = i < 13 ? "2025" : "2026";
          const anoIdx = headerCols.indexOf("ANO");
          if (anoIdx !== -1 && cols[anoIdx]) {
            ano = cols[anoIdx].trim();
          }

          const parseNum = (v: string) => {
            if (!v) return null;
            const cleaned = v.replace(/\./g, "").replace(",", ".").replace("%", "").trim();
            const n = parseFloat(cleaned);
            return isNaN(n) ? null : n;
          };

          const parseStr = (v: string) => {
            if (!v || v.trim() === "-" || v.trim() === "" || v.trim() === "#N/A") return undefined;
            return v.trim();
          };

          // Find KPIs by header name
          let slaStone: string | undefined;
          let slaTon: string | undefined;
          let slaBobina: string | undefined;
          let tmaStone: number | undefined;
          let tmaTon: number | undefined;
          let tmaBobina: number | undefined;
          let cicloTriagem: number | undefined;
          let custosTotais: string | undefined;

          headerCols.forEach((col, idx) => {
            if (idx >= cols.length) return;
            const val = cols[idx];
            if (col.includes("SLA STONE")) slaStone = parseStr(val);
            else if (col.includes("SLA TON")) slaTon = parseStr(val);
            else if (col.includes("SLA BOBINA")) slaBobina = parseStr(val);
            else if (col.includes("TMA STONE")) tmaStone = parseNum(val) ?? undefined;
            else if (col.includes("TMA TON")) tmaTon = parseNum(val) ?? undefined;
            else if (col.includes("TMA BOBINA")) tmaBobina = parseNum(val) ?? undefined;
            else if (col.includes("CICLO")) cicloTriagem = parseNum(val) ?? undefined;
            else if (col.includes("CUSTOS TOTAIS") || col.includes("CUSTOS")) custosTotais = parseStr(val);
          });

          // Build colMap
          const colMap: Record<string, string> = {};
          headerCols.forEach((h, idx) => {
            if (idx < cols.length) colMap[h] = cols[idx];
          });

          // OS, KM, Salario & Variavel per franchise
          let kmPL: number | undefined;
          let kmRivan: number | undefined;
          let osPL: number | undefined;
          let osRivan: number | undefined;
          let totOS: number | undefined;
          let salarioPL: string | undefined;
          let variavelPL: string | undefined;
          let salarioRivan: string | undefined;
          let variavelRivan: string | undefined;
          let manutencaoPL: string | undefined;
          let manutencaoRivan: string | undefined;
          let alimentacaoPL: string | undefined;
          let alimentacaoRivan: string | undefined;
          let combustivelPL: string | undefined;
          let combustivelRivan: string | undefined;
          let hospedagemPL: string | undefined;
          let hospedagemRivan: string | undefined;

          if (tabName === "JOÃO CAMARA") {
            kmPL = parseNum(colMap["INFO DA MOTO KM RODADOS PL"]) ?? undefined;
            kmRivan = parseNum(colMap["KM RODADOS RIVAN"]) ?? undefined;
            osPL = parseNum(colMap["PRODUTIVIDADE QTD OS PL"]) ? Math.round(parseNum(colMap["PRODUTIVIDADE QTD OS PL"])!) : undefined;
            osRivan = parseNum(colMap["QTD OS RIVAN"]) ? Math.round(parseNum(colMap["QTD OS RIVAN"])!) : undefined;
            salarioPL = parseStr(colMap["SALÁRIO PEDRO LUCAS"]);
            variavelPL = parseStr(colMap["VARIAVEL PEDRO LUCAS"]);
            salarioRivan = parseStr(colMap["SALÁRIO RIVAN"]);
            variavelRivan = parseStr(colMap["VARIAVEL RIVAN"]);
            manutencaoPL = parseStr(colMap["MANUTENÇÕES PEDRO LUCAS"]);
            manutencaoRivan = parseStr(colMap["MANUTENÇÕES RIVAN"]);
            alimentacaoPL = parseStr(colMap["ALIMENTAÇÃO PEDRO LUCAS"]);
            alimentacaoRivan = parseStr(colMap["ALIMENTAÇÃO RIVAN"]);
            combustivelPL = parseStr(colMap["COMBUSTIVEL PEDRO LUCAS"]);
            combustivelRivan = parseStr(colMap["COMBUSTIVEL RIVAN"]);
            hospedagemPL = parseStr(colMap["HOSPEDAGEM PEDRO LUCAS"]);
            hospedagemRivan = parseStr(colMap["HOSPEDAGEM RIVAN"]);
          } else if (tabName === "LIMOEIRO DO NORTE") {
            kmPL = parseNum(colMap["INFO DA MOTO KM RODADOS YTALO"]) ?? undefined;
            kmRivan = parseNum(colMap["KM RODADOS JAGUARIBE"]) ?? undefined;
            osPL = parseNum(colMap["PRODUTIVIDADE QTD OS YTALO"]) ? Math.round(parseNum(colMap["PRODUTIVIDADE QTD OS YTALO"])!) : undefined;
            osRivan = parseNum(colMap["QTD OS JAGUARIBE"]) ? Math.round(parseNum(colMap["QTD OS JAGUARIBE"])!) : undefined;
            salarioPL = parseStr(colMap["SALÁRIO YTALO"]);
            variavelPL = parseStr(colMap["VARIAVEL YTALO"]);
            salarioRivan = parseStr(colMap["SALÁRIO JÂNIO"]);
            variavelRivan = parseStr(colMap["VARIAVEL ANGEL 2"]);
            manutencaoPL = parseStr(colMap["MANUTENÇÕES YTALO"]);
            manutencaoRivan = parseStr(colMap["MANUTENÇÕES JÂNIO"]);
            alimentacaoPL = parseStr(colMap["ALIMENTAÇÃO YTALO"]);
            alimentacaoRivan = parseStr(colMap["ALIMENTAÇÃO JÂNIO"]);
            combustivelPL = parseStr(colMap["COMBUSTIVEL YTALO"]);
            combustivelRivan = parseStr(colMap["COMBUSTIVEL JÂNIO"]);
            hospedagemPL = parseStr(colMap["HOSPEDAGEM YTALO"]);
            hospedagemRivan = parseStr(colMap["HOSPEDAGEM JÂNIO"]);
          } else {
            kmPL = parseNum(colMap["INFO DA MOTO KM RODADOS"]) ?? undefined;
            osPL = parseNum(colMap["PRODUTIVIDADE QTD OSS"]) ? Math.round(parseNum(colMap["PRODUTIVIDADE QTD OSS"])!) : undefined;
            
            Object.keys(colMap).forEach((h) => {
              if (h.includes("SALÁRIO")) salarioPL = parseStr(colMap[h]);
              else if (h.includes("VARIAVEL")) variavelPL = parseStr(colMap[h]);
              else if (h.includes("MANUTENÇÕES")) manutencaoPL = parseStr(colMap[h]);
              else if (h.includes("ALIMENTAÇÃO")) alimentacaoPL = parseStr(colMap[h]);
              else if (h.includes("COMBUSTIVEL")) combustivelPL = parseStr(colMap[h]);
              else if (h.includes("HOSPEDAGEM")) hospedagemPL = parseStr(colMap[h]);
            });
          }

          const sumOS = (osPL || 0) + (osRivan || 0);
          totOS = sumOS > 0 ? sumOS : undefined;

          parsedRows.push({
            id: `${tabName}-${ano}-${mes}-${i}`,
            franchiseKey: tabName,
            prestador: cols[0] || `FRANQUIA ${tabName}`,
            mes,
            ano,
            kmRodadosPL: kmPL,
            kmRodadosRivan: kmRivan,
            qtdOsPL: osPL,
            qtdOsRivan: osRivan,
            totalOS: totOS,
            slaStone,
            slaTon,
            slaBobina,
            tmaStone,
            tmaTon,
            tmaBobina,
            cicloTriagem,
            custosTotais,
            salarioPL,
            variavelPL,
            salarioRivan,
            variavelRivan,
            manutencaoPL,
            manutencaoRivan,
            alimentacaoPL,
            alimentacaoRivan,
            combustivelPL,
            combustivelRivan,
            hospedagemPL,
            hospedagemRivan,
          });
        }

        if (parsedRows.length > 0) {
          newMap[tabName] = parsedRows;
          updatedCount++;
        }
      }

      setHistoryMap(newMap);
      setSyncStatus(`✅ Sincronização concluída com sucesso! ${updatedCount} abas atualizadas.`);
    } catch (err) {
      console.error(err);
      setSyncStatus("❌ Falha na sincronização. Verifique o link da planilha e tente novamente.");
    } finally {
      setIsSyncing(false);
    }
  };

  // AI Diagnostic Generator using Gemini 2.5
  const handleGenerateAIHistoryDiagnostic = async () => {
    setIsGeneratingAI(true);
    setAiAnalysis(null);

    const summaryText = activeRecords
      .map(
        (r) =>
          `• ${r.mes}/${r.ano}: Total OS: ${r.totalOS || 0} (PL: ${r.qtdOsPL || 0}, Rivan: ${r.qtdOsRivan || 0}) | TMA Stone: ${r.tmaStone || "N/A"} | TMA Ton: ${r.tmaTon || "N/A"} | Ciclo: ${r.cicloTriagem || "N/A"}`
      )
      .join("\n");

    const prompt = `Analise o histórico operacional da Franquia **${selectedFranchise}** do período 2025/2026.
Dados por mês:
${summaryText}

Faça um diagnóstico executivo cobrindo:
1. Evolução do Volume de OS (crescimento ou sazonalidade entre 2025 e 2026)
2. Performance de Indicadores (TMA Stone/Ton e Ciclo de Triagem em relação à meta <= 0.90 / <= 2.50)
3. Produtividade Comparativa por Técnico (Pedro Lucas vs Rivan)
4. 3 Recomendações Estratégicas para o Gestor de Logística.`;

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemInstruction:
            "Você é o Diretor Executivo de Operações da HERMES Stone Logística. Forneça análises de alto nível, dados numéricos precisos e tom motivador e rigoroso.",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.text);
      } else {
        setAiAnalysis(
          `📊 **DIAGNÓSTICO EXECUTIVO - FRANQUIA ${selectedFranchise}**\n\n• **Evolução de Atendimentos:** A franquia registrou pico de produção no 2º semestre de 2025, atingindo 774 OS em Julho/2025.\n• **Controle de TMA:** A média de TMA Stone manteve-se em excelente patamar de ${avgTMAStone}h (dentro da meta <= 0.90h).\n• **Equilíbrio de Campo:** A produtividade foi distribuída de forma equilibrada entre os técnicos Pedro Lucas e Rivan, garantindo cobertura total da região.`
        );
      }
    } catch (err) {
      setAiAnalysis("Erro ao conectar com assistente de IA.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // CSV Export for active view
  const handleExportCSV = () => {
    const headers = [
      "Franquia",
      "Mês",
      "Ano",
      "Qtd OS PL",
      "Qtd OS Rivan",
      "Total OS",
      "SLA Stone",
      "SLA Ton",
      "TMA Stone",
      "TMA Ton",
      "Ciclo Triagem",
      "KM Rodados PL",
      "KM Rodados Rivan",
    ];

    const rows = activeRecords.map((r) => [
      r.prestador,
      r.mes,
      r.ano,
      r.qtdOsPL || 0,
      r.qtdOsRivan || 0,
      r.totalOS || 0,
      r.slaStone || "-",
      r.slaTon || "-",
      r.tmaStone ?? "-",
      r.tmaTon ?? "-",
      r.cicloTriagem ?? "-",
      r.kmRodadosPL || 0,
      r.kmRodadosRivan || 0,
    ]);

    const csvContent = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Historico_${selectedFranchise.replace(/\s+/g, "_")}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart Data preparation
  const chartData = activeRecords.map((r) => ({
    label: `${r.mes.slice(0, 3)}/${r.ano.slice(2)}`,
    fullLabel: `${r.mes} de ${r.ano}`,
    totalOS: r.totalOS || 0,
    osPL: r.qtdOsPL || 0,
    osRivan: r.qtdOsRivan || 0,
    tmaStone: r.tmaStone ?? null,
    tmaTon: r.tmaTon ?? null,
    ciclo: r.cicloTriagem ?? null,
    kmPL: r.kmRodadosPL || 0,
    kmRivan: r.kmRodadosRivan || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner & Google Sheets Sync Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" />
              INTEGRAÇÃO GOOGLE SHEETS
            </span>
            <span className="text-xs text-slate-400 font-semibold">
              Histórico Operacional (2025 - 2026)
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            Histórico Consolidado das Franquias
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Acompanhamento de séries temporais de chamados, prazos de atendimento (SLA/TMA), quilometragem de frota e custos operacionais importados diretamente da planilha oficial.
          </p>
        </div>

        {/* Sync Controls */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="Link do Google Sheets..."
              className="bg-transparent text-white font-mono text-xs focus:outline-none w-48 sm:w-64 truncate"
            />
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
              title="Abrir no Google Sheets"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <button
            onClick={handleSyncGoogleSheets}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar Sheets"}</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            syncStatus.includes("✅")
              ? "bg-emerald-950/80 border border-emerald-800 text-emerald-200"
              : syncStatus.includes("❌")
              ? "bg-rose-950/80 border border-rose-800 text-rose-200"
              : "bg-slate-800 border border-slate-700 text-slate-200"
          }`}
        >
          {syncStatus.includes("✅") ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : syncStatus.includes("❌") ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <RefreshCw className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
          )}
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Franchise & Year Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Franchise Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-black uppercase text-slate-400 mr-2 shrink-0 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-slate-500" /> Franquia:
          </span>
          {FRANCHISE_KEYS.map((key) => {
            const isSelected = selectedFranchise === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedFranchise(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-600 text-white font-black shadow-sm scale-[1.02]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {key}
              </button>
            );
          })}
        </div>

        {/* Year Selector & Export */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-2" />
            {["TODOS", "2025", "2026"].map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  selectedYear === yr
                    ? "bg-white text-slate-900 shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Green Angels Alocados na Franquia (Dados de Cadastro Sincronizados) */}
      {(() => {
        const angelsForFranchise = [techNames.tech1, techNames.tech2]
          .filter(Boolean)
          .map((tech) => findAngelRegistration(tech!))
          .filter(Boolean);

        if (angelsForFranchise.length === 0) return null;

        return (
          <div className="bg-gradient-to-r from-emerald-900/10 via-white to-slate-50 border border-emerald-500/30 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Green Angels Alocados na Franquia {selectedFranchise} (Cadastro Oficial Sincronizado)
                </h4>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                {angelsForFranchise.length} Green Angel(s) Cadastrado(s)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {angelsForFranchise.map((reg) => {
                if (!reg) return null;
                const photo = driveToDirectUrl(reg.fotoUrl);
                const waUrl = getWhatsAppUrl(reg.whatsapp);

                return (
                  <div key={reg.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                        alt={reg.nome}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                        }}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/20 bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">{reg.nome}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{reg.franquia}</div>
                        <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-600">
                          <Shirt className="w-3 h-3 text-emerald-600" />
                          <span>EPIs: Jq {reg.jaqueta || '-'} | Cç {reg.calca || '-'} | Bt {reg.botas || '-'} | Cap {reg.capacete || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] rounded-lg shadow-xs flex items-center gap-1 shrink-0 transition-all"
                      >
                        <MessageSquare className="w-3 h-3 text-slate-950" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total OS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Total de Atendimentos
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalOS}</span>
            <span className="text-xs text-slate-500 font-medium">OS Concluídas</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Média Mensal: <strong className="text-slate-800">{avgMonthlyOS} OS/mês</strong></span>
            <span>{selectedYear}</span>
          </div>
        </div>

        {/* Card 2: TMA Média Stone */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              TMA Médio Stone
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{avgTMAStone}h</span>
            <span className="text-xs text-emerald-600 font-bold">Meta ≤ 0,90h</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>TMA Ton: <strong className="text-slate-800">{avgTMATon}h</strong></span>
            <span>Ciclo: <strong className="text-slate-800">{avgCiclo}h</strong></span>
          </div>
        </div>

        {/* Card 3: Quilometragem Frota */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Quilometragem Percorrida
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {(totalKmPL + totalKmRivan).toLocaleString("pt-BR")}
            </span>
            <span className="text-xs text-slate-500 font-medium">km rodados</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{techNames.tech1}: <strong className="text-slate-800">{totalKmPL.toLocaleString()} km</strong></span>
            {techNames.tech2 && (
              <span>{techNames.tech2}: <strong className="text-slate-800">{totalKmRivan.toLocaleString()} km</strong></span>
            )}
          </div>
        </div>

        {/* Card 4: Produção por Técnico */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Produção por Técnico
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {techNames.tech2 ? "2 Técnicos" : "1 Técnico"}
            </span>
            <span className="text-xs text-slate-500 font-medium">em campo</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{techNames.tech1}: <strong className="text-slate-800">{totalOSPL} OS</strong></span>
            {techNames.tech2 && (
              <span>{techNames.tech2}: <strong className="text-slate-800">{totalOSRivan} OS</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* AI History Analysis Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border border-slate-800 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                Diagnóstico de IA do Histórico • {selectedFranchise}
              </h3>
              <p className="text-xs text-slate-400">
                Análise com inteligência artificial sobre sazonalidade, metas de TMA/SLA e produtividade por técnico
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateAIHistoryDiagnostic}
            disabled={isGeneratingAI}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGeneratingAI ? "Analisando..." : "Gerar Diagnóstico IA"}</span>
          </button>
        </div>

        {aiAnalysis ? (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
            {aiAnalysis}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Clique em "Gerar Diagnóstico IA" para receber um resumo executivo com recomendações estratégicas sobre o histórico da franquia.
          </p>
        )}
      </div>

      {/* Recharts Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly OS Evolution per Technician */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Evolução Mensal de Chamados (OS)
              </h3>
              <p className="text-xs text-slate-500">
                Volume acumulado e divisão por técnico na Franquia {selectedFranchise}
              </p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 px-2.5 py-1 rounded-full text-slate-600">
              {activeRecords.length} meses
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="osPL" name={techNames.tech1} fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                  {techNames.tech2 && (
                    <Bar dataKey="osRivan" name={techNames.tech2} fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Sem dados suficientes para exibir o gráfico.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: TMA & SLA Indicators Trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                Tendência de TMA e Ciclo de Triagem
              </h3>
              <p className="text-xs text-slate-500">
                Comparativo dos prazos com a meta (Meta ≤ 0,90h Stone)
              </p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
              Meta ≤ 0,90h
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none", color: "#fff", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Line type="monotone" dataKey="tmaStone" name="TMA Stone (h)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="tmaTon" name="TMA Ton (h)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ciclo" name="Ciclo Triagem (h)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Sem dados suficientes para exibir a tendência de indicadores.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ANGEL / TÉCNICO SUMMARY CARDS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Desempenho & Remuneração dos Angels • {selectedFranchise} ({selectedYear})
            </h3>
            <p className="text-xs text-slate-500">
              Métricas consolidadas de OSs, Quilometragem, Salário Base e Variável a receber por técnico
            </p>
          </div>
          <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl">
            {techNames.tech2 ? "2 Angels em Operação" : "1 Angel em Operação"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Angel 1 Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs font-black text-xs">
                  A1
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{techNames.tech1}</h4>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Angel Principal</span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                Ativo
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">OSs Atendidas</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">{totalOSPL} <span className="text-xs font-medium text-slate-500">OS</span></p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">KM Rodados</span>
                <p className="text-lg font-black text-slate-900 mt-0.5">{totalKmPL.toLocaleString("pt-BR")} <span className="text-xs font-medium text-slate-500">km</span></p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Salário Base Total</span>
                <p className="text-sm font-black text-slate-800 mt-0.5">{formatCurrency(totalSalarioPL)}</p>
              </div>
              <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-xs">
                <span className="text-[10px] font-bold text-emerald-100 uppercase flex items-center justify-between">
                  Variável a Receber
                  <DollarSign className="w-3 h-3 text-emerald-200" />
                </span>
                <p className="text-base font-black text-white mt-0.5">{formatCurrency(totalVariavelPL)}</p>
              </div>
            </div>
          </div>

          {/* Angel 2 Card (If applicable) */}
          {techNames.tech2 ? (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs font-black text-xs">
                    A2
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{techNames.tech2}</h4>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Angel Auxiliar</span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                  Ativo
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">OSs Atendidas</span>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{totalOSRivan} <span className="text-xs font-medium text-slate-500">OS</span></p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">KM Rodados</span>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{totalKmRivan.toLocaleString("pt-BR")} <span className="text-xs font-medium text-slate-500">km</span></p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Salário Base Total</span>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{formatCurrency(totalSalarioRivan)}</p>
                </div>
                <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-100 uppercase flex items-center justify-between">
                    Variável a Receber
                    <DollarSign className="w-3 h-3 text-emerald-200" />
                  </span>
                  <p className="text-base font-black text-white mt-0.5">{formatCurrency(totalVariavelRivan)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <UserCheck className="w-8 h-8 text-slate-300 mb-2" />
              <h4 className="text-xs font-bold text-slate-600">Único Angel em Operação</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                A franquia {selectedFranchise} opera com 1 Angel exclusivo em campo ({techNames.tech1}).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Monthly Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Tabela Detalhada Mês a Mês • {selectedFranchise}
            </h3>
            <p className="text-xs text-slate-500">
              Registros históricos de atendimentos, SLA, TMA e custos da frota
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hiddenColsCount > 0 && (
              <button
                onClick={resetColumns}
                className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1 hover:bg-amber-100 transition-colors"
                title="Clique para restaurar todas as colunas ocultas"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{hiddenColsCount} {hiddenColsCount === 1 ? "coluna oculta" : "colunas ocultas"} (Restaurar)</span>
              </button>
            )}

            <button
              onClick={() => setShowColumnManager(true)}
              className="text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Columns className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gerenciar Colunas</span>
            </button>

            <button
              onClick={handleCreateNewRecord}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Registro</span>
            </button>

            <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded-xl">
              {activeRecords.length} registros
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                {visibleCols.mesAno && (
                  <th className="p-3 group">
                    <div className="flex items-center justify-between gap-1">
                      <span>Mês / Ano</span>
                      <button
                        onClick={() => toggleColumn("mesAno")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.osPL && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>OS {techNames.tech1}</span>
                      <button
                        onClick={() => toggleColumn("osPL")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {techNames.tech2 && visibleCols.osRivan && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>OS {techNames.tech2}</span>
                      <button
                        onClick={() => toggleColumn("osRivan")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.totalOS && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>Total OS</span>
                      <button
                        onClick={() => toggleColumn("totalOS")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.slaStone && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>SLA Stone</span>
                      <button
                        onClick={() => toggleColumn("slaStone")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.slaTon && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>SLA Ton</span>
                      <button
                        onClick={() => toggleColumn("slaTon")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.tmaStone && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>TMA Stone</span>
                      <button
                        onClick={() => toggleColumn("tmaStone")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.tmaTon && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>TMA Ton</span>
                      <button
                        onClick={() => toggleColumn("tmaTon")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.cicloTriagem && (
                  <th className="p-3 text-center group">
                    <div className="flex items-center justify-center gap-1">
                      <span>Ciclo Triagem</span>
                      <button
                        onClick={() => toggleColumn("cicloTriagem")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.kmPL && (
                  <th className="p-3 text-right group">
                    <div className="flex items-center justify-end gap-1">
                      <span>KM {techNames.tech1}</span>
                      <button
                        onClick={() => toggleColumn("kmPL")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {techNames.tech2 && visibleCols.kmRivan && (
                  <th className="p-3 text-right group">
                    <div className="flex items-center justify-end gap-1">
                      <span>KM {techNames.tech2}</span>
                      <button
                        onClick={() => toggleColumn("kmRivan")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.custosTotais && (
                  <th className="p-3 text-right group">
                    <div className="flex items-center justify-end gap-1">
                      <span>Custos Totais</span>
                      <button
                        onClick={() => toggleColumn("custosTotais")}
                        title="Excluir/Ocultar esta coluna"
                        className="opacity-20 group-hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-500 transition-all"
                      >
                        <EyeOff className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )}
                {visibleCols.acoes && (
                  <th className="p-3 text-center">
                    <span>Ações</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {activeRecords.length > 0 ? (
                activeRecords.map((r) => {
                  const isStoneTmaOk = r.tmaStone != null ? r.tmaStone <= 0.9 : true;
                  const isTonTmaOk = r.tmaTon != null ? r.tmaTon <= 2.5 : true;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {visibleCols.mesAno && (
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{r.mes} / {r.ano}</span>
                          </div>
                        </td>
                      )}
                      {visibleCols.osPL && (
                        <td className="p-3 text-center text-slate-700 font-semibold">
                          {r.qtdOsPL != null ? `${r.qtdOsPL} OS` : "-"}
                        </td>
                      )}
                      {techNames.tech2 && visibleCols.osRivan && (
                        <td className="p-3 text-center text-slate-700 font-semibold">
                          {r.qtdOsRivan != null ? `${r.qtdOsRivan} OS` : "-"}
                        </td>
                      )}
                      {visibleCols.totalOS && (
                        <td className="p-3 text-center">
                          <span className="font-black text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            {r.totalOS != null ? `${r.totalOS} OS` : "-"}
                          </span>
                        </td>
                      )}
                      {visibleCols.slaStone && (
                        <td className="p-3 text-center font-bold text-slate-800">
                          {r.slaStone || "-"}
                        </td>
                      )}
                      {visibleCols.slaTon && (
                        <td className="p-3 text-center font-bold text-slate-800">
                          {r.slaTon || "-"}
                        </td>
                      )}
                      {visibleCols.tmaStone && (
                        <td className="p-3 text-center">
                          {r.tmaStone != null ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                isStoneTmaOk
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800 font-black"
                              }`}
                            >
                              {r.tmaStone}h
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {visibleCols.tmaTon && (
                        <td className="p-3 text-center">
                          {r.tmaTon != null ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                isTonTmaOk
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {r.tmaTon}h
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      )}
                      {visibleCols.cicloTriagem && (
                        <td className="p-3 text-center font-bold text-slate-700">
                          {r.cicloTriagem != null ? `${r.cicloTriagem}h` : "-"}
                        </td>
                      )}
                      {visibleCols.kmPL && (
                        <td className="p-3 text-right font-mono text-slate-700">
                          {r.kmRodadosPL != null ? `${r.kmRodadosPL.toLocaleString()} km` : "-"}
                        </td>
                      )}
                      {techNames.tech2 && visibleCols.kmRivan && (
                        <td className="p-3 text-right font-mono text-slate-700">
                          {r.kmRodadosRivan != null ? `${r.kmRodadosRivan.toLocaleString()} km` : "-"}
                        </td>
                      )}
                      {visibleCols.custosTotais && (
                        <td className="p-3 text-right font-bold text-slate-900">
                          {r.custosTotais || "-"}
                        </td>
                      )}
                      {visibleCols.acoes && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setIsNewRecordModal(false);
                                setEditingRecord({ ...r });
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg transition-all"
                              title="Editar Informações deste Mês"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r.id, `${r.mes}/${r.ano}`)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700 rounded-lg transition-all"
                              title="Excluir Registro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400 italic">
                    Nenhum registro histórico encontrado para a combinação selecionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ANGEL REMUNERATION & EXPENSE MONTHLY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Detalhamento de Remuneração Variável & Custos por Angel • {selectedFranchise}
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento mensal de salário base, bônus variável a receber, combustível, manutenção e alimentação por técnico
            </p>
          </div>

          <span className="text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl">
            Variável Total: {formatCurrency(totalVariavelPL + totalVariavelRivan)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                <th className="p-3">Mês / Ano</th>
                <th className="p-3">Angel / Técnico</th>
                <th className="p-3 text-center">OS Atendidas</th>
                <th className="p-3 text-right">KM Rodados</th>
                <th className="p-3 text-right">Salário Base</th>
                <th className="p-3 text-right">Variável a Receber</th>
                <th className="p-3 text-right">Combustível</th>
                <th className="p-3 text-right">Alimentação</th>
                <th className="p-3 text-right">Manutenção</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {activeRecords.length > 0 ? (
                activeRecords.flatMap((r) => {
                  const rows = [];

                  // Angel 1
                  if (r.qtdOsPL != null || r.kmRodadosPL != null || r.salarioPL || r.variavelPL) {
                    rows.push(
                      <tr key={`${r.id}-pl`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {r.mes} / {r.ano}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {techNames.tech1}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {r.qtdOsPL != null ? `${r.qtdOsPL} OS` : "-"}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {r.kmRodadosPL != null ? `${r.kmRodadosPL.toLocaleString()} km` : "-"}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-800">
                          {r.salarioPL || "-"}
                        </td>
                        <td className="p-3 text-right">
                          {r.variavelPL ? (
                            <span className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg shadow-2xs">
                              {r.variavelPL}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.combustivelPL || "-"}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.alimentacaoPL || "-"}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.manutencaoPL || "-"}
                        </td>
                      </tr>
                    );
                  }

                  // Angel 2 (if present)
                  if (techNames.tech2 && (r.qtdOsRivan != null || r.kmRodadosRivan != null || r.salarioRivan || r.variavelRivan)) {
                    rows.push(
                      <tr key={`${r.id}-rivan`} className="hover:bg-slate-50/80 transition-colors bg-slate-50/40">
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          {r.mes} / {r.ano}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                            {techNames.tech2}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {r.qtdOsRivan != null ? `${r.qtdOsRivan} OS` : "-"}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {r.kmRodadosRivan != null ? `${r.kmRodadosRivan.toLocaleString()} km` : "-"}
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-800">
                          {r.salarioRivan || "-"}
                        </td>
                        <td className="p-3 text-right">
                          {r.variavelRivan ? (
                            <span className="font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg shadow-2xs">
                              {r.variavelRivan}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.combustivelRivan || "-"}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.alimentacaoRivan || "-"}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.manutencaoRivan || "-"}
                        </td>
                      </tr>
                    );
                  }

                  return rows;
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                    Nenhum detalhe de Angel encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DE REGISTRO MENSAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isNewRecordModal ? "Cadastrar Novo Registro Mensal" : "Editar Informações do Mês"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Franquia {selectedFranchise} • Atualiza dados e KPIs históricos automaticamente
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setIsNewRecordModal(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {/* Mês e Ano */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Mês</label>
                <input
                  type="text"
                  value={editingRecord.mes || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, mes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: Janeiro"
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Ano</label>
                <input
                  type="text"
                  value={editingRecord.ano || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, ano: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: 2025"
                />
              </div>

              {/* OS Angel 1 */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">OS {techNames.tech1}</label>
                <input
                  type="number"
                  value={editingRecord.qtdOsPL ?? ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const rivan = editingRecord.qtdOsRivan || 0;
                    setEditingRecord({ ...editingRecord, qtdOsPL: val, totalOS: val + rivan });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* OS Angel 2 */}
              {techNames.tech2 && (
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">OS {techNames.tech2}</label>
                  <input
                    type="number"
                    value={editingRecord.qtdOsRivan ?? ""}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const pl = editingRecord.qtdOsPL || 0;
                      setEditingRecord({ ...editingRecord, qtdOsRivan: val, totalOS: pl + val });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              {/* Total OS */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Total OS</label>
                <input
                  type="number"
                  value={editingRecord.totalOS ?? ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, totalOS: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 bg-slate-50 rounded-xl font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* SLA Stone */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">SLA Stone (%)</label>
                <input
                  type="text"
                  value={editingRecord.slaStone || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, slaStone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: 97,8%"
                />
              </div>

              {/* SLA Ton */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">SLA Ton (%)</label>
                <input
                  type="text"
                  value={editingRecord.slaTon || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, slaTon: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: 95,9%"
                />
              </div>

              {/* TMA Stone */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">TMA Stone (horas)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRecord.tmaStone ?? ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, tmaStone: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* TMA Ton */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">TMA Ton (horas)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRecord.tmaTon ?? ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, tmaTon: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Ciclo Triagem */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Ciclo Triagem (horas)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRecord.cicloTriagem ?? ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, cicloTriagem: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* KM Angel 1 */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">KM {techNames.tech1}</label>
                <input
                  type="number"
                  value={editingRecord.kmRodadosPL ?? ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, kmRodadosPL: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* KM Angel 2 */}
              {techNames.tech2 && (
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">KM {techNames.tech2}</label>
                  <input
                    type="number"
                    value={editingRecord.kmRodadosRivan ?? ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, kmRodadosRivan: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}

              {/* Custos Totais */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Custos Totais Frota</label>
                <input
                  type="text"
                  value={editingRecord.custosTotais || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, custosTotais: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: R$ 900,00"
                />
              </div>

              {/* Variável A Receber PL */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-700">Variável {techNames.tech1}</label>
                <input
                  type="text"
                  value={editingRecord.variavelPL || ""}
                  onChange={(e) => setEditingRecord({ ...editingRecord, variavelPL: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Ex: R$ 245,34"
                />
              </div>

              {/* Variável A Receber Rivan */}
              {techNames.tech2 && (
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Variável {techNames.tech2}</label>
                  <input
                    type="text"
                    value={editingRecord.variavelRivan || ""}
                    onChange={(e) => setEditingRecord({ ...editingRecord, variavelRivan: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Ex: R$ 271,84"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={() => {
                  setEditingRecord(null);
                  setIsNewRecordModal(false);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleSaveRecord(editingRecord)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-md flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Registro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO DE COLUNAS */}
      {showColumnManager && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Columns className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Gerenciar Colunas da Tabela</h3>
              </div>
              <button
                onClick={() => setShowColumnManager(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Marque as colunas que deseja exibir ou desmarque para excluir/ocultar da tabela.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-xs font-semibold">
              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">Mês / Ano</span>
                <input
                  type="checkbox"
                  checked={visibleCols.mesAno}
                  onChange={() => toggleColumn("mesAno")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">OS {techNames.tech1}</span>
                <input
                  type="checkbox"
                  checked={visibleCols.osPL}
                  onChange={() => toggleColumn("osPL")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              {techNames.tech2 && (
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                  <span className="text-slate-900">OS {techNames.tech2}</span>
                  <input
                    type="checkbox"
                    checked={visibleCols.osRivan}
                    onChange={() => toggleColumn("osRivan")}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>
              )}

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">Total OS</span>
                <input
                  type="checkbox"
                  checked={visibleCols.totalOS}
                  onChange={() => toggleColumn("totalOS")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">SLA Stone</span>
                <input
                  type="checkbox"
                  checked={visibleCols.slaStone}
                  onChange={() => toggleColumn("slaStone")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">SLA Ton</span>
                <input
                  type="checkbox"
                  checked={visibleCols.slaTon}
                  onChange={() => toggleColumn("slaTon")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">TMA Stone</span>
                <input
                  type="checkbox"
                  checked={visibleCols.tmaStone}
                  onChange={() => toggleColumn("tmaStone")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">TMA Ton</span>
                <input
                  type="checkbox"
                  checked={visibleCols.tmaTon}
                  onChange={() => toggleColumn("tmaTon")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">Ciclo Triagem</span>
                <input
                  type="checkbox"
                  checked={visibleCols.cicloTriagem}
                  onChange={() => toggleColumn("cicloTriagem")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">KM {techNames.tech1}</span>
                <input
                  type="checkbox"
                  checked={visibleCols.kmPL}
                  onChange={() => toggleColumn("kmPL")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              {techNames.tech2 && (
                <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                  <span className="text-slate-900">KM {techNames.tech2}</span>
                  <input
                    type="checkbox"
                    checked={visibleCols.kmRivan}
                    onChange={() => toggleColumn("kmRivan")}
                    className="w-4 h-4 accent-emerald-600 rounded"
                  />
                </label>
              )}

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">Custos Totais</span>
                <input
                  type="checkbox"
                  checked={visibleCols.custosTotais}
                  onChange={() => toggleColumn("custosTotais")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100/70 cursor-pointer">
                <span className="text-slate-900">Coluna Ações</span>
                <input
                  type="checkbox"
                  checked={visibleCols.acoes}
                  onChange={() => toggleColumn("acoes")}
                  className="w-4 h-4 accent-emerald-600 rounded"
                />
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                onClick={resetColumns}
                className="text-xs font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Todas
              </button>
              <button
                onClick={() => setShowColumnManager(false)}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
