import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  UserCheck,
  Shirt,
  Sliders,
  Save,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Franchise, UserAgent } from "../../../types";
import { supabase } from "../../../services/supabaseClient";
import * as api from "../../../services/api";

/**
 * Tela de Remuneração (versão conectada ao banco de dados).
 *
 * As props abaixo existem só por compatibilidade com quem chama este
 * componente hoje (o módulo de Performance) — esta tela não usa mais nenhuma
 * delas: busca tudo direto do Supabase, e as regras de acesso (quem vê o quê)
 * são garantidas pelo próprio banco.
 */
interface PerformanceRemunerationProps {
  franchisesKPIs?: any;
  angelSummaries?: any;
  monthlyRebateRecords?: any;
  onUpdateAngelSummary?: any;
  onUpdateFranchiseKPI?: any;
  onAddMonthlyRebateRecord?: any;
  onUpdateMonthlyRebateRecord?: any;
  [key: string]: any;
}

type Tab = "INDICADORES" | "REMUNERACAO" | "CAMISA10" | "REGRAS";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const toNum = (s: string): number => {
  const n = parseFloat((s ?? "").toString().replace(",", "."));
  return isNaN(n) ? 0 : n;
};
const toNumOrNull = (s: string): number | null => {
  if ((s ?? "").toString().trim() === "") return null;
  return toNum(s);
};
const fmt = (v: number | null | undefined): string =>
  v === null || v === undefined ? "" : String(v).replace(".", ",");

const hit = (actual: number | null, target: number, lowerIsBetter: boolean): boolean | null => {
  if (actual === null) return null;
  return lowerIsBetter ? actual <= target : actual >= target;
};

interface IndicatorDraft {
  tmaStone: string;
  tmaTon: string;
  ciclo: string;
  rebate: string;
  orders: string;
}

interface CompDraft {
  baseSalary: string;
  angelOs: string;
  maintenance: string;
  food: string;
  fuel: string;
  lodging: string;
  notes: string;
}

const STATUS_TEXT: Record<string, string> = {
  SEM_FRANQUIA: "Este Angel não está ligado a nenhuma franquia no cadastro.",
  SEM_INDICADORES_FRANQUIA: "Lance os indicadores da franquia neste mês (aba Indicadores da Franquia).",
  SEM_REBATE: "Falta o rebate total da franquia neste mês (aba Indicadores da Franquia).",
  SEM_OS_FRANQUIA: "Falta o total de OS da franquia neste mês (aba Indicadores da Franquia).",
  SEM_OS_ANGEL: "Falta o total de OS deste Angel neste mês (campo abaixo).",
  OS_ANGEL_MAIOR_QUE_FRANQUIA: "As OS do Angel são maiores que as da franquia. Confira os dois números.",
  INDICADORES_INCOMPLETOS: "Faltam indicadores da franquia: TMA Stone, TMA TON (e Ciclo, para quem faz logística reversa).",
};

const inputCls =
  "w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500";

const Badge: React.FC<{ ok: boolean | null; label: string }> = ({ ok, label }) => {
  if (ok === null) {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{label}: —</span>;
  }
  return ok ? (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" /> {label}
    </span>
  ) : (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1">
      <XCircle className="w-3 h-3" /> {label}
    </span>
  );
};

export const PerformanceRemuneration: React.FC<PerformanceRemunerationProps> = () => {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [tab, setTab] = useState<Tab>("INDICADORES");

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [settings, setSettings] = useState<api.CompensationSettings | null>(null);
  const [indicators, setIndicators] = useState<api.FranchiseMonthlyIndicator[]>([]);
  const [records, setRecords] = useState<api.AgentCompensationRecord[]>([]);
  const [leads, setLeads] = useState<api.Camisa10Lead[]>([]);
  const [angelInds, setAngelInds] = useState<api.AngelMonthlyIndicator[]>([]);
  const [calcs, setCalcs] = useState<Record<string, api.AngelVariableCalc | null>>({});
  const [confirmNoVar, setConfirmNoVar] = useState<Record<string, boolean>>({});

  const [indDrafts, setIndDrafts] = useState<Record<string, IndicatorDraft>>({});
  const [compDrafts, setCompDrafts] = useState<Record<string, CompDraft>>({});
  const [settingsDraft, setSettingsDraft] = useState<api.CompensationSettings | null>(null);

  const [newLeadAgent, setNewLeadAgent] = useState("");
  const [newLeadText, setNewLeadText] = useState("");

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // 1) Descobre se quem está logado é Admin (a tela inteira é só para Admin;
  //    o banco já bloqueia o resto por conta própria, isto é só a vitrine).
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setIsAdmin(false);
          return;
        }
        const profile = await api.fetchMyProfile(data.user.id);
        setIsAdmin(profile.role === "ADMIN");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  // 2) Dados que não dependem do mês
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const [f, a, s, l] = await Promise.all([
          api.fetchFranchises(),
          api.fetchAgents(),
          api.fetchCompensationSettings(),
          api.fetchCamisa10Leads(),
        ]);
        setFranchises(f);
        setAgents(a);
        setSettings(s);
        setSettingsDraft(s);
        setLeads(l);
      } catch (err) {
        console.error(err);
        showToast("err", "Não foi possível carregar os dados de remuneração.");
      }
    })();
  }, [isAdmin]);

  // 3) Dados que dependem do mês/ano
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    (async () => {
      try {
        const [ind, rec, ai] = await Promise.all([
          api.fetchFranchiseIndicators(year, month),
          api.fetchCompensationRecords(year, month),
          api.fetchAngelIndicators(year, month),
        ]);
        setIndicators(ind);
        setRecords(rec);
        setAngelInds(ai);
      } catch (err) {
        console.error(err);
        showToast("err", "Não foi possível carregar os lançamentos do mês.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, year, month]);

  const greenAngels = useMemo(
    () => agents.filter((a) => (a.jobTitle || "").toLowerCase().includes("angel")),
    [agents]
  );

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "—";

  // O cálculo do variável é feito pelo banco (rebate -> desconto -> parte do Angel -> % -> R$).
  // A tela só mostra o resultado; por isso recalcula sempre que algo muda.
  const loadCalcs = async () => {
    const entries = await Promise.all(
      greenAngels.map(async (a) => {
        try {
          return [a.id, await api.calculateAngelVariable(a.id, year, month)] as const;
        } catch (err) {
          console.error(err);
          return [a.id, null] as const;
        }
      })
    );
    setCalcs(Object.fromEntries(entries));
  };

  useEffect(() => {
    if (isAdmin && greenAngels.length > 0) loadCalcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, greenAngels, year, month]);

  // Rascunhos dos indicadores: reinicia quando mudam franquias/indicadores do mês
  useEffect(() => {
    const drafts: Record<string, IndicatorDraft> = {};
    franchises.forEach((f) => {
      const ind = indicators.find((i) => i.franchiseId === f.id);
      drafts[f.id] = {
        tmaStone: fmt(ind?.tmaStoneActual),
        tmaTon: fmt(ind?.tmaTonActual),
        ciclo: fmt(ind?.cicloActual),
        rebate: fmt(ind?.rebateAmount),
        orders: ind ? String(ind.totalServiceOrders) : "",
      };
    });
    setIndDrafts(drafts);
  }, [franchises, indicators]);

  // Rascunhos de remuneração: reinicia quando mudam Angels/registros do mês
  useEffect(() => {
    const drafts: Record<string, CompDraft> = {};
    greenAngels.forEach((a) => {
      const r = records.find((x) => x.agentId === a.id);
      const ai = angelInds.find((x) => x.agentId === a.id);
      drafts[a.id] = {
        baseSalary: fmt(r?.baseSalary),
        angelOs: ai ? String(ai.totalServiceOrders) : "",
        maintenance: fmt(r?.maintenanceAllowance),
        food: fmt(r?.foodAllowance),
        fuel: fmt(r?.fuelAllowance),
        lodging: fmt(r?.lodgingAllowance),
        notes: r?.notes ?? "",
      };
    });
    setCompDrafts(drafts);
  }, [greenAngels, records, angelInds]);

  const camisa10ForAgentInMonth = (agentId: string) => {
    const approved = leads.filter((l) => {
      if (l.agentId !== agentId || l.status !== "APROVADO" || !l.approvedAt) return false;
      const d = new Date(l.approvedAt);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    return {
      count: approved.length,
      total: approved.reduce((sum, l) => sum + (l.bonusAmount ?? 0), 0),
    };
  };

  // ------------------------------------------------------------------ ações
  const saveIndicator = async (franchiseId: string) => {
    const d = indDrafts[franchiseId];
    if (!d) return;
    try {
      const saved = await api.upsertFranchiseIndicator({
        franchiseId,
        year,
        month,
        tmaStoneActual: toNumOrNull(d.tmaStone),
        tmaTonActual: toNumOrNull(d.tmaTon),
        cicloActual: toNumOrNull(d.ciclo),
        rebateAmount: toNum(d.rebate),
        totalServiceOrders: Math.round(toNum(d.orders)),
      });
      setIndicators((prev) => [...prev.filter((i) => i.franchiseId !== franchiseId), saved]);
      await loadCalcs();
      showToast("ok", "Indicadores salvos.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível salvar os indicadores.");
    }
  };

  const saveAngelOs = async (agent: UserAgent) => {
    const d = compDrafts[agent.id];
    if (!d) return;
    const os = Math.round(toNum(d.angelOs));
    if (os <= 0) {
      showToast("err", "Informe o total de OS do Angel (maior que zero).");
      return;
    }
    try {
      const saved = await api.upsertAngelOs(agent.id, year, month, os);
      setAngelInds((prev) => [...prev.filter((x) => x.agentId !== agent.id), saved]);
      await loadCalcs();
      showToast("ok", "OS do Angel salvas.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível salvar as OS do Angel.");
    }
  };

  const toggleReverse = async (agent: UserAgent, value: boolean) => {
    try {
      await api.setReverseLogistics(agent.id, value);
      await loadCalcs();
      showToast("ok", value ? "Marcado como quem faz logística reversa." : "Marcado como quem não faz logística reversa.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível alterar a logística reversa.");
    }
  };

  const saveCompensation = async (agent: UserAgent) => {
    const d = compDrafts[agent.id];
    if (!d) return;
    try {
      // Recalcula no banco na hora de salvar: nunca grava um valor de tela desatualizado.
      const calc = await api.calculateAngelVariable(agent.id, year, month);
      const ok = calc.status === "OK";
      if (!ok && !confirmNoVar[agent.id]) {
        showToast("err", STATUS_TEXT[calc.status] ?? "Variável não calculado: faltam dados.");
        return;
      }
      const notes = ok
        ? d.notes
        : `${d.notes ? d.notes + " | " : ""}Variável não calculado: ${STATUS_TEXT[calc.status] ?? calc.status}`;
      const saved = await api.upsertCompensationRecord({
        agentId: agent.id,
        year,
        month,
        baseSalary: toNum(d.baseSalary),
        doesReverseLogistics: calc.doesReverseLogistics,
        variablePct: ok ? calc.variablePct ?? 0 : 0,
        variableBonus: ok ? calc.variableAmount ?? 0 : 0,
        maintenanceAllowance: toNum(d.maintenance),
        foodAllowance: toNum(d.food),
        fuelAllowance: toNum(d.fuel),
        lodgingAllowance: toNum(d.lodging),
        notes,
      });
      setRecords((prev) => [...prev.filter((r) => r.agentId !== agent.id), saved]);
      showToast("ok", `Remuneração de ${agent.name} salva.`);
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível salvar a remuneração.");
    }
  };

  const reviewLead = async (lead: api.Camisa10Lead, decision: "APROVADO" | "REJEITADO") => {
    if (!settings) return;
    try {
      const updated = await api.reviewCamisa10Lead(lead.id, decision, settings.camisa10BonusAmount);
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      showToast("ok", decision === "APROVADO" ? "Indicação aprovada." : "Indicação rejeitada.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível atualizar a indicação.");
    }
  };

  const addLead = async () => {
    if (!newLeadAgent || !newLeadText.trim()) {
      showToast("err", "Escolha o agente e descreva a indicação.");
      return;
    }
    try {
      const created = await api.createCamisa10Lead(newLeadAgent, newLeadText.trim());
      setLeads((prev) => [created, ...prev]);
      setNewLeadText("");
      showToast("ok", "Indicação registrada como pendente.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível registrar a indicação.");
    }
  };

  const saveSettings = async () => {
    if (!settingsDraft) return;
    try {
      await api.updateCompensationSettings(settingsDraft);
      setSettings(settingsDraft);
      showToast("ok", "Regras salvas.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível salvar as regras.");
    }
  };

  // ----------------------------------------------------------------- render
  if (isAdmin === null) {
    return <div className="p-8 text-sm text-slate-500">Carregando...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm">
        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-extrabold">Acesso restrito</p>
          <p className="text-xs mt-1">Os dados de remuneração só podem ser vistos e lançados por administradores.</p>
        </div>
      </div>
    );
  }

  const tabBtn = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
        tab === id ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  const angelsComCalculoOk = greenAngels.filter((a) => calcs[a.id]?.status === "OK").length;
  const totalVariavelMes = greenAngels.reduce(
    (sum, a) => sum + (calcs[a.id]?.status === "OK" ? calcs[a.id]?.variableAmount ?? 0 : 0),
    0
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg ${
            toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Cabeçalho + período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Remuneração</h2>
          <p className="text-xs text-slate-500">
            Salário fixo + variável dos Green Angels (por indicador) + bônus Camisa 10.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputCls + " !w-auto"}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls + " !w-auto"}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabBtn("INDICADORES", "Indicadores da Franquia", <Building2 className="w-3.5 h-3.5" />)}
        {tabBtn("REMUNERACAO", "Green Angels", <UserCheck className="w-3.5 h-3.5" />)}
        {tabBtn("CAMISA10", "Camisa 10", <Shirt className="w-3.5 h-3.5" />)}
        {tabBtn("REGRAS", "Regras e Metas", <Sliders className="w-3.5 h-3.5" />)}
      </div>

      {loading && <p className="text-xs text-slate-500">Carregando lançamentos do mês...</p>}

      {/* ------------------------------------------------------ INDICADORES */}
      {tab === "INDICADORES" && settings && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Números de cada franquia em {MESES[month - 1]}/{year}. O que veio da planilha de produtividade já aparece
            preenchido; complete o que estiver em branco (normalmente TMA, Ciclo e rebate total). O rebate total é a
            base do variável dos Green Angels.
          </p>
          {franchises.length === 0 && (
            <p className="text-xs text-slate-500">Nenhuma franquia cadastrada ainda.</p>
          )}
          {franchises.map((f) => {
            const d = indDrafts[f.id];
            if (!d) return null;
            const faltando: string[] = [];
            if (d.tmaStone.trim() === "") faltando.push("TMA Stone");
            if (d.tmaTon.trim() === "") faltando.push("TMA TON");
            if (toNum(d.rebate) <= 0) faltando.push("Rebate total");
            if (toNum(d.orders) <= 0) faltando.push("Total de OS");
            return (
              <div key={f.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{f.name}</p>
                    <p className="text-[11px] text-slate-500">{f.cityRegion}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge ok={hit(toNumOrNull(d.tmaStone), settings.tmaStoneTarget, settings.tmaStoneLowerIsBetter)} label="TMA Stone" />
                    <Badge ok={hit(toNumOrNull(d.tmaTon), settings.tmaTonTarget, settings.tmaTonLowerIsBetter)} label="TMA TON" />
                    <Badge ok={hit(toNumOrNull(d.ciclo), settings.cicloTarget, settings.cicloLowerIsBetter)} label="Ciclo" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {([
                    ["tmaStone", "TMA Stone"],
                    ["tmaTon", "TMA TON"],
                    ["ciclo", "Ciclo"],
                    ["rebate", "Rebate total (R$)"],
                    ["orders", "Total de OS"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
                      <input
                        inputMode="decimal"
                        className={inputCls}
                        value={d[key]}
                        onChange={(e) =>
                          setIndDrafts((prev) => ({ ...prev, [f.id]: { ...prev[f.id], [key]: e.target.value } }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-slate-600">
                  Rebate-bônus (rebate total menos {settings.rebateDeductionPct}%):{" "}
                  <b>{brl(toNum(d.rebate) * (1 - settings.rebateDeductionPct / 100))}</b>
                </p>
                {faltando.length > 0 && (
                  <p className="text-[11px] text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Falta lançar: {faltando.join(", ")}.
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => saveIndicator(f.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------ REMUNERAÇÃO */}
      {tab === "REMUNERACAO" && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Só Green Angels aparecem aqui. O variável é calculado pelo sistema, passo a passo, a partir do rebate da
            franquia e das OS de cada Angel. Você confere, lança salário e ajudas, e salva.
          </p>
          {greenAngels.length > 0 && (
            <p className="text-xs font-bold text-slate-700">
              Variável calculado em {MESES[month - 1]}/{year}: {brl(totalVariavelMes)} • {angelsComCalculoOk} de{" "}
              {greenAngels.length} Angels com dados completos
            </p>
          )}
          {greenAngels.length === 0 && (
            <p className="text-xs text-slate-500">Nenhum Green Angel encontrado (cargo contendo "Angel").</p>
          )}
          {greenAngels.map((a) => {
            const d = compDrafts[a.id];
            if (!d) return null;
            const calc = calcs[a.id] ?? null;
            const ok = calc?.status === "OK";
            const variable = ok ? calc?.variableAmount ?? 0 : 0;
            const allowances = toNum(d.maintenance) + toNum(d.food) + toNum(d.fuel) + toNum(d.lodging);
            const c10 = camisa10ForAgentInMonth(a.id);
            const total = toNum(d.baseSalary) + variable + allowances + c10.total;
            const saved = records.some((r) => r.agentId === a.id);
            const share =
              calc && calc.franchiseOs && calc.angelOs ? (calc.angelOs / calc.franchiseOs) * 100 : null;
            const set = (patch: Partial<CompDraft>) =>
              setCompDrafts((prev) => ({ ...prev, [a.id]: { ...prev[a.id], ...patch } }));
            return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{a.name}</p>
                    <p className="text-[11px] text-slate-500">{a.franchiseName}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={calc?.doesReverseLogistics ?? false}
                        disabled={!calc}
                        onChange={(e) => toggleReverse(a, e.target.checked)}
                      />
                      <span className="text-xs font-bold text-slate-700">Faz logística reversa</span>
                    </label>
                    {saved ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Lançado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Não lançado
                      </span>
                    )}
                  </div>
                </div>

                {/* Cálculo do variável, passo a passo */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-[11px] font-extrabold text-slate-700">Cálculo do variável</p>
                  {!calc && <p className="text-[11px] text-slate-500">Calculando...</p>}
                  {calc && !ok && (
                    <p className="text-[11px] text-amber-700 flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {STATUS_TEXT[calc.status] ?? "Faltam dados para calcular."}
                    </p>
                  )}
                  {calc && ok && (
                    <div className="space-y-1 text-[11px] text-slate-700">
                      <p>
                        1. Rebate total da franquia: <b>{brl(calc.rebateTotal ?? 0)}</b>
                      </p>
                      <p>
                        2. Menos {calc.deductionPct}% = rebate-bônus: <b>{brl(calc.rebateBonus ?? 0)}</b>
                      </p>
                      <p>
                        3. Parte do Angel: {calc.angelOs} de {calc.franchiseOs} OS ({share?.toFixed(1).replace(".", ",")}%)
                        = <b>{brl(calc.angelRebate ?? 0)}</b>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>4. Indicadores batidos:</span>
                        <Badge ok={calc.hitTmaStone} label="TMA Stone" />
                        <Badge ok={calc.hitTmaTon} label="TMA TON" />
                        {calc.doesReverseLogistics && <Badge ok={calc.hitCiclo} label="Ciclo" />}
                        <span>
                          = <b>{String(calc.variablePct ?? 0).replace(".", ",")}%</b>
                        </span>
                      </div>
                      <p>
                        5. Variável do Angel: <b className="text-emerald-700">{brl(calc.variableAmount ?? 0)}</b>
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <label className="block">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">OS do Angel no mês</span>
                    <input inputMode="numeric" className={inputCls} value={d.angelOs} onChange={(e) => set({ angelOs: e.target.value })} />
                  </label>
                  <div className="flex items-end">
                    <button
                      onClick={() => saveAngelOs(a)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-extrabold"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar OS
                    </button>
                  </div>
                  <label className="block md:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">Salário fixo (R$)</span>
                    <input inputMode="decimal" className={inputCls} value={d.baseSalary} onChange={(e) => set({ baseSalary: e.target.value })} />
                  </label>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {([
                    ["maintenance", "Ajuda manutenção (R$)"],
                    ["food", "Ajuda alimentação (R$)"],
                    ["fuel", "Ajuda combustível (R$)"],
                    ["lodging", "Ajuda hospedagem (R$)"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
                      <input inputMode="decimal" className={inputCls} value={d[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<CompDraft>)} />
                    </label>
                  ))}
                </div>

                <label className="block">
                  <span className="block text-[10px] font-bold text-slate-500 mb-1">Observações</span>
                  <input className={inputCls} value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
                </label>

                {calc && !ok && (
                  <label className="flex items-center gap-2 text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!confirmNoVar[a.id]}
                      onChange={(e) => setConfirmNoVar((prev) => ({ ...prev, [a.id]: e.target.checked }))}
                    />
                    Salvar mesmo assim, com variável de R$ 0,00 (o motivo fica registrado nas observações)
                  </label>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <p className="text-[11px] text-slate-600">
                    Variável: <b>{brl(variable)}</b> • Ajudas: <b>{brl(allowances)}</b> • Camisa 10 ({c10.count}):{" "}
                    <b>{brl(c10.total)}</b> • Total estimado: <b className="text-emerald-700">{brl(total)}</b>
                  </p>
                  <button
                    onClick={() => saveCompensation(a)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold"
                  >
                    <Save className="w-3.5 h-3.5" /> Salvar lançamento
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------- CAMISA 10 */}
      {tab === "CAMISA10" && settings && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-extrabold text-slate-900">
              Registrar indicação (bônus de {brl(settings.camisa10BonusAmount)} quando aprovada)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select className={inputCls} value={newLeadAgent} onChange={(e) => setNewLeadAgent(e.target.value)}>
                <option value="">Quem indicou...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <input
                className={inputCls + " md:col-span-1"}
                placeholder="Nome/contato do indicado"
                value={newLeadText}
                onChange={(e) => setNewLeadText(e.target.value)}
              />
              <button
                onClick={addLead}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {leads.length === 0 && <p className="text-xs text-slate-500">Nenhuma indicação registrada ainda.</p>}
            {leads.map((l) => (
              <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-slate-900">{agentName(l.agentId)}</p>
                  <p className="text-[11px] text-slate-500">
                    {l.leadDescription} • {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      l.status === "APROVADO"
                        ? "bg-emerald-100 text-emerald-700"
                        : l.status === "REJEITADO"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {l.status === "APROVADO" ? `Aprovada (${brl(l.bonusAmount ?? 0)})` : l.status === "REJEITADO" ? "Rejeitada" : "Pendente"}
                  </span>
                  {l.status === "PENDENTE" && (
                    <>
                      <button onClick={() => reviewLead(l, "APROVADO")} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg" title="Aprovar">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => reviewLead(l, "REJEITADO")} className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg" title="Rejeitar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------- REGRAS */}
      {tab === "REGRAS" && settingsDraft && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Metas e percentuais usados no cálculo sugerido. Mudar aqui vale para os próximos cálculos — lançamentos já
            salvos não mudam sozinhos.
          </p>

          <div>
            <p className="text-xs font-extrabold text-slate-900 mb-2">Metas dos indicadores</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([
                ["tmaStoneTarget", "tmaStoneLowerIsBetter", "TMA Stone"],
                ["tmaTonTarget", "tmaTonLowerIsBetter", "TMA TON"],
                ["cicloTarget", "cicloLowerIsBetter", "Ciclo"],
              ] as const).map(([targetKey, dirKey, label]) => (
                <div key={targetKey} className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-500">{label} — meta</span>
                  <input
                    inputMode="decimal"
                    className={inputCls}
                    value={fmt(settingsDraft[targetKey])}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, [targetKey]: toNum(e.target.value) })}
                  />
                  <select
                    className={inputCls}
                    value={settingsDraft[dirKey] ? "menor" : "maior"}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, [dirKey]: e.target.value === "menor" })}
                  >
                    <option value="menor">Bate a meta quando o valor é MENOR ou igual</option>
                    <option value="maior">Bate a meta quando o valor é MAIOR ou igual</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-900 mb-2">Quem faz logística reversa (até 4%)</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                ["pctTmaStoneReversa", "TMA Stone (%)"],
                ["pctTmaTonReversa", "TMA TON (%)"],
                ["pctCicloReversa", "Ciclo (%)"],
              ] as const).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
                  <input inputMode="decimal" className={inputCls} value={fmt(settingsDraft[key])} onChange={(e) => setSettingsDraft({ ...settingsDraft, [key]: toNum(e.target.value) })} />
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold text-slate-900 mb-2">Quem não faz logística reversa (até 3%, sem Ciclo)</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                ["pctTmaStoneNormal", "TMA Stone (%)"],
                ["pctTmaTonNormal", "TMA TON (%)"],
              ] as const).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
                  <input inputMode="decimal" className={inputCls} value={fmt(settingsDraft[key])} onChange={(e) => setSettingsDraft({ ...settingsDraft, [key]: toNum(e.target.value) })} />
                </label>
              ))}
            </div>
          </div>

          <div className="max-w-xs">
            <label className="block">
              <span className="block text-[10px] font-bold text-slate-500 mb-1">Desconto sobre o rebate total, antes do cálculo (%)</span>
              <input
                inputMode="decimal"
                className={inputCls}
                value={fmt(settingsDraft.rebateDeductionPct)}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, rebateDeductionPct: toNum(e.target.value) })}
              />
            </label>
          </div>

          <div className="max-w-xs">
            <label className="block">
              <span className="block text-[10px] font-bold text-slate-500 mb-1">Bônus Camisa 10 por indicação aprovada (R$)</span>
              <input
                inputMode="decimal"
                className={inputCls}
                value={fmt(settingsDraft.camisa10BonusAmount)}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, camisa10BonusAmount: toNum(e.target.value) })}
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button onClick={saveSettings} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold">
              <Save className="w-3.5 h-3.5" /> Salvar regras
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
