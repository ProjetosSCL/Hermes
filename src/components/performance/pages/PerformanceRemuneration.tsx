import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Pencil,
  Trash2,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Percent,
  DollarSign,
  MessageCircle,
  Award,
  RotateCcw,
  Calculator,
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

type Tab = "EXTRATO" | "SIMULACAO" | "FRANQUIAS" | "CAMISA10" | "REGRAS";

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

interface RebateForm {
  mode: "new" | "edit";
  locked: boolean; // franquia e mês fixos (quando se clica em Editar numa linha)
  existing: boolean; // já existia lançamento para esta franquia/mês
  franchiseId: string;
  year: number;
  month: number;
  rebate: string;
  orders: string;
  tmaStone: string;
  tmaTon: string;
  ciclo: string;
  notes: string;
}

interface FranqRow {
  franchise: Franchise;
  ind: api.FranchiseMonthlyIndicator | null;
  year: number;
  month: number;
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

interface SimDraft {
  rebate: string;
  franchiseOs: string;
  angelOs: string;
  tmaStone: string;
  tmaTon: string;
  ciclo: string;
  reverse: boolean;
}

export interface SimulationInput {
  rebateTotal: number;
  franchiseOs: number;
  angelOs: number;
  tmaStone: number | null;
  tmaTon: number | null;
  ciclo: number | null;
  reverse: boolean;
}

export interface SimulationResult {
  problem: string | null;
  rebateBonus: number;
  angelRebate: number;
  sharePct: number | null;
  hitStone: boolean | null;
  hitTon: boolean | null;
  hitCiclo: boolean | null;
  pct: number;
  maxPct: number;
  amount: number;
}

/**
 * Simulação "e se...?": mesma conta que o banco faz (calculate_angel_variable),
 * só que com números que a pessoa digita. Nada disso é salvo. O teste automático
 * compara esta função com o banco para garantir que as duas dão o mesmo resultado.
 */
export function simulateAngelVariable(s: api.CompensationSettings, i: SimulationInput): SimulationResult {
  const maxPct = i.reverse
    ? s.pctTmaStoneReversa + s.pctTmaTonReversa + s.pctCicloReversa
    : s.pctTmaStoneNormal + s.pctTmaTonNormal;
  const hitStone = hit(i.tmaStone, s.tmaStoneTarget, s.tmaStoneLowerIsBetter);
  const hitTon = hit(i.tmaTon, s.tmaTonTarget, s.tmaTonLowerIsBetter);
  const hitCiclo = i.reverse ? hit(i.ciclo, s.cicloTarget, s.cicloLowerIsBetter) : null;

  let problem: string | null = null;
  if (i.rebateTotal <= 0) problem = "Informe o rebate total da franquia.";
  else if (i.franchiseOs <= 0) problem = "Informe o total de OS da franquia.";
  else if (i.angelOs <= 0) problem = "Informe o total de OS do Angel.";
  else if (i.angelOs > i.franchiseOs) problem = "As OS do Angel não podem ser maiores que as da franquia.";
  else if (hitStone === null || hitTon === null || (i.reverse && hitCiclo === null))
    problem = "Informe TMA Stone, TMA TON (e Ciclo, para quem faz logística reversa).";

  const rebateBonus = i.rebateTotal * (1 - s.rebateDeductionPct / 100);
  const angelRebate = i.franchiseOs > 0 ? (rebateBonus * i.angelOs) / i.franchiseOs : 0;
  const pct = i.reverse
    ? (hitStone ? s.pctTmaStoneReversa : 0) + (hitTon ? s.pctTmaTonReversa : 0) + (hitCiclo ? s.pctCicloReversa : 0)
    : (hitStone ? s.pctTmaStoneNormal : 0) + (hitTon ? s.pctTmaTonNormal : 0);
  const amount = problem ? 0 : Math.round(angelRebate * pct) / 100;
  return {
    problem,
    rebateBonus,
    angelRebate,
    sharePct: i.franchiseOs > 0 ? (i.angelOs / i.franchiseOs) * 100 : null,
    hitStone,
    hitTon,
    hitCiclo,
    pct,
    maxPct,
    amount,
  };
}

const waLink = (phone?: string): string | null => {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") && d.length >= 12 ? d : "55" + d}`;
};
const iniciais = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const pctStr = (n: number) => String(n).replace(".", ",");
const metaStr = (n: number) => n.toFixed(2).replace(".", ",");

/** Foto da franquia; sem foto (ou foto que não abre) mostra as iniciais. */
const FranchiseAvatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 32 }) => {
  const [quebrada, setQuebrada] = useState(false);
  useEffect(() => setQuebrada(false), [url]);
  const dim = { width: size, height: size };
  if (url && !quebrada) {
    return (
      <img
        src={url}
        alt={name}
        style={dim}
        onError={() => setQuebrada(true)}
        className="rounded-full object-cover border border-slate-200 bg-white flex-shrink-0"
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{ ...dim, fontSize: Math.max(8, Math.round(size * 0.34)) }}
      className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black flex-shrink-0"
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
};

export const PerformanceRemuneration: React.FC<PerformanceRemunerationProps> = () => {
  const now = new Date();
  // O mês corrente ainda não fechou: a tela abre no mês anterior (competência vigente).
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [year, setYear] = useState<number>(prevMonthDate.getFullYear());
  const [month, setMonth] = useState<number>(prevMonthDate.getMonth() + 1);
  const [tab, setTab] = useState<Tab>("EXTRATO");

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
  const [selectedAngelId, setSelectedAngelId] = useState("");
  const [equipment, setEquipment] = useState<api.AgentEquipment[]>([]);
  const [franchisePhotos, setFranchisePhotos] = useState<Record<string, string>>({});
  // Em qual mês estão os dados carregados: evita mostrar (ou salvar) números do mês anterior
  const [dataPeriod, setDataPeriod] = useState("");
  const [calcsPeriod, setCalcsPeriod] = useState("");
  const [sim, setSim] = useState<SimDraft>({ rebate: "", franchiseOs: "", angelOs: "", tmaStone: "", tmaTon: "", ciclo: "", reverse: false });
  const calcSeq = useRef(0);
  const simLoadedFor = useRef("");
  const periodKey = `${year}-${month}`;

  const [rebateForm, setRebateForm] = useState<RebateForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ ind: api.FranchiseMonthlyIndicator; nome: string } | null>(null);
  const [franqAll, setFranqAll] = useState(false);
  const [allIndicators, setAllIndicators] = useState<api.FranchiseMonthlyIndicator[]>([]);
  const [allLoaded, setAllLoaded] = useState(false);
  const [franqSearch, setFranqSearch] = useState("");
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
        const [f, a, s, l, eq, fotos] = await Promise.all([
          api.fetchFranchises(),
          api.fetchAgents(),
          api.fetchCompensationSettings(),
          api.fetchCamisa10Leads(),
          api.fetchAgentEquipment().catch(() => [] as api.AgentEquipment[]),
          // se o campo de foto ainda não existir no banco, segue sem fotos (mostra as iniciais)
          api.fetchFranchisePhotos().catch(() => ({} as Record<string, string>)),
        ]);
        setEquipment(eq);
        setFranchisePhotos(fotos);
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
    let cancelled = false;
    const periodo = `${year}-${month}`;
    setLoading(true);
    (async () => {
      try {
        const [ind, rec, ai] = await Promise.all([
          api.fetchFranchiseIndicators(year, month),
          api.fetchCompensationRecords(year, month),
          api.fetchAngelIndicators(year, month),
        ]);
        if (cancelled) return;
        setIndicators(ind);
        setRecords(rec);
        setAngelInds(ai);
        setDataPeriod(periodo);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        showToast("err", "Não foi possível carregar os lançamentos do mês.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, year, month]);

  const greenAngels = useMemo(
    () =>
      agents
        .filter((a) => (a.jobTitle || "").toLowerCase().includes("angel"))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [agents]
  );
  const selAngel = useMemo(() => greenAngels.find((a) => a.id === selectedAngelId) ?? null, [greenAngels, selectedAngelId]);
  useEffect(() => {
    if (greenAngels.length > 0 && !greenAngels.some((a) => a.id === selectedAngelId)) setSelectedAngelId(greenAngels[0].id);
  }, [greenAngels, selectedAngelId]);

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? "—";

  // O cálculo do variável é feito pelo banco (rebate -> desconto -> parte do Angel -> % -> R$).
  // A tela só mostra o resultado; por isso recalcula sempre que algo muda.
  const loadCalcs = async () => {
    const seq = ++calcSeq.current;
    const periodo = `${year}-${month}`;
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
    if (seq !== calcSeq.current) return; // chegou uma consulta mais nova: esta já está velha
    setCalcs(Object.fromEntries(entries));
    setCalcsPeriod(periodo);
  };

  useEffect(() => {
    if (isAdmin && greenAngels.length > 0) loadCalcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, greenAngels, year, month]);

  // Simulação: começa pelos números reais do Angel no mês e a pessoa mexe à vontade
  const loadSimFromReal = () => {
    if (!selAngel) return;
    const fr = franchises.find((f) => f.name === selAngel.franchiseName);
    const ind = fr ? indicators.find((i) => i.franchiseId === fr.id) : undefined;
    const ai = angelInds.find((x) => x.agentId === selAngel.id);
    const c = calcsPeriod === periodKey ? calcs[selAngel.id] : null;
    setSim({
      rebate: ind ? fmt(ind.rebateAmount) : "",
      franchiseOs: ind ? String(ind.totalServiceOrders) : "",
      angelOs: ai ? String(ai.totalServiceOrders) : "",
      tmaStone: fmt(ind?.tmaStoneActual),
      tmaTon: fmt(ind?.tmaTonActual),
      ciclo: fmt(ind?.cicloActual),
      reverse: c?.doesReverseLogistics ?? false,
    });
  };

  useEffect(() => {
    if (tab !== "SIMULACAO") {
      simLoadedFor.current = "";
      return;
    }
    if (!selAngel || dataPeriod !== periodKey || calcsPeriod !== periodKey) return;
    const key = `${selAngel.id}|${periodKey}`;
    if (simLoadedFor.current === key) return;
    simLoadedFor.current = key;
    loadSimFromReal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedAngelId, periodKey, dataPeriod, calcsPeriod]);

  // "Todas as Competências": busca todos os meses de todas as franquias
  const loadAllIndicators = async () => {
    try {
      setAllIndicators(await api.fetchAllFranchiseIndicators());
      setAllLoaded(true);
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível carregar todas as competências.");
    }
  };
  useEffect(() => {
    if (isAdmin && tab === "FRANQUIAS" && franqAll) {
      setAllLoaded(false);
      loadAllIndicators();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab, franqAll]);

  // No formulário de "Adicionar rebate": se a franquia/mês escolhidos já têm lançamento, carrega os valores
  useEffect(() => {
    if (!rebateForm || rebateForm.locked || !rebateForm.franchiseId) return;
    let cancelled = false;
    const { franchiseId, year: y, month: m } = rebateForm;
    api
      .fetchFranchiseIndicators(y, m)
      .then((list) => {
        if (cancelled) return;
        const ex = list.find((i) => i.franchiseId === franchiseId);
        setRebateForm((f) => {
          if (!f || f.locked || f.franchiseId !== franchiseId || f.year !== y || f.month !== m) return f;
          if (!ex) return { ...f, existing: false };
          return {
            ...f,
            existing: true,
            rebate: fmt(ex.rebateAmount),
            orders: String(ex.totalServiceOrders),
            tmaStone: fmt(ex.tmaStoneActual),
            tmaTon: fmt(ex.tmaTonActual),
            ciclo: fmt(ex.cicloActual),
            notes: ex.notes ?? "",
          };
        });
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rebateForm?.franchiseId, rebateForm?.year, rebateForm?.month, rebateForm?.locked]);

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
  const mergeIndicator = (list: api.FranchiseMonthlyIndicator[], saved: api.FranchiseMonthlyIndicator) => [
    ...list.filter((i) => !(i.franchiseId === saved.franchiseId && i.year === saved.year && i.month === saved.month)),
    saved,
  ];

  const openRebateForm = (franchiseId: string, y: number, m: number, ind: api.FranchiseMonthlyIndicator | null, locked: boolean) => {
    setRebateForm({
      mode: ind ? "edit" : "new",
      locked,
      existing: !!ind,
      franchiseId,
      year: y,
      month: m,
      rebate: ind ? fmt(ind.rebateAmount) : "",
      orders: ind ? String(ind.totalServiceOrders) : "",
      tmaStone: fmt(ind?.tmaStoneActual),
      tmaTon: fmt(ind?.tmaTonActual),
      ciclo: fmt(ind?.cicloActual),
      notes: ind?.notes ?? "",
    });
  };

  const saveRebateForm = async () => {
    const f = rebateForm;
    if (!f) return;
    if (!f.franchiseId) {
      showToast("err", "Escolha a franquia.");
      return;
    }
    if (toNum(f.rebate) <= 0 && Math.round(toNum(f.orders)) <= 0) {
      showToast("err", "Informe o rebate total ou o total de OS.");
      return;
    }
    try {
      const saved = await api.upsertFranchiseIndicator({
        franchiseId: f.franchiseId,
        year: f.year,
        month: f.month,
        tmaStoneActual: toNumOrNull(f.tmaStone),
        tmaTonActual: toNumOrNull(f.tmaTon),
        cicloActual: toNumOrNull(f.ciclo),
        rebateAmount: toNum(f.rebate),
        totalServiceOrders: Math.round(toNum(f.orders)),
        notes: f.notes.trim() === "" ? undefined : f.notes,
      });
      setAllIndicators((prev) => (allLoaded ? mergeIndicator(prev, saved) : prev));
      if (saved.year === year && saved.month === month) {
        setIndicators((prev) => mergeIndicator(prev, saved));
        await loadCalcs();
      } else if (!franqAll) {
        setYear(saved.year); // mostra o mês que acabou de ser lançado
        setMonth(saved.month);
      }
      setRebateForm(null);
      showToast("ok", "Lançamento de rebate salvo.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível salvar o lançamento.");
    }
  };

  const deleteRebate = async () => {
    const c = confirmDelete;
    if (!c || !c.ind.id) return;
    try {
      await api.deleteFranchiseIndicator(c.ind.id);
      setIndicators((prev) => prev.filter((i) => i.id !== c.ind.id));
      setAllIndicators((prev) => prev.filter((i) => i.id !== c.ind.id));
      setConfirmDelete(null);
      await loadCalcs();
      showToast("ok", "Lançamento excluído.");
    } catch (err) {
      console.error(err);
      showToast("err", "Não foi possível excluir o lançamento.");
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

  const subTab = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition-all ${
        tab === id ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:bg-white/10"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const ready = dataPeriod === periodKey;
  const calcFor = (id: string): api.AngelVariableCalc | null => (calcsPeriod === periodKey ? calcs[id] ?? null : null);

  const angelsComCalculoOk = greenAngels.filter((a) => calcFor(a.id)?.status === "OK").length;
  const totalVariavelMes = greenAngels.reduce((sum, a) => {
    const c = calcFor(a.id);
    return sum + (c?.status === "OK" ? c.variableAmount ?? 0 : 0);
  }, 0);

  // Angel selecionado (abas Extrato e Simulação)
  const selCalc = selAngel ? calcFor(selAngel.id) : null;
  const selOk = selCalc?.status === "OK";
  const selReverse = selCalc?.doesReverseLogistics ?? false;
  const selEq = selAngel ? equipment.find((e) => e.agentId === selAngel.id) : undefined;
  const selDraft = selAngel ? compDrafts[selAngel.id] : undefined;
  const selC10 = selAngel ? camisa10ForAgentInMonth(selAngel.id) : { count: 0, total: 0 };
  const selVariable = selOk ? selCalc?.variableAmount ?? 0 : 0;
  const selShare = selCalc && selCalc.franchiseOs && selCalc.angelOs ? (selCalc.angelOs / selCalc.franchiseOs) * 100 : null;
  const selSaved = selAngel ? records.some((r) => r.agentId === selAngel.id) : false;
  const selWa = selAngel ? waLink(selAngel.phone) : null;
  const setSel = (patch: Partial<CompDraft>) => {
    if (!selAngel) return;
    setCompDrafts((prev) => ({ ...prev, [selAngel.id]: { ...prev[selAngel.id], ...patch } }));
  };
  const pctRegras = settings
    ? {
        stone: selReverse ? settings.pctTmaStoneReversa : settings.pctTmaStoneNormal,
        ton: selReverse ? settings.pctTmaTonReversa : settings.pctTmaTonNormal,
        ciclo: settings.pctCicloReversa,
      }
    : { stone: 0, ton: 0, ciclo: 0 };
  const selMaxPct = pctRegras.stone + pctRegras.ton + (selReverse ? pctRegras.ciclo : 0);
  const selPadrao = selReverse
    ? `Padrão Reversa (${pctStr(pctRegras.stone)}%+${pctStr(pctRegras.ton)}%+${pctStr(pctRegras.ciclo)}%)`
    : `Padrão Campo (${pctStr(pctRegras.stone)}%+${pctStr(pctRegras.ton)}%)`;

  const linhaClara = (rotulo: string, valor: React.ReactNode, destaque = false) => (
    <div
      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-xs ${
        destaque ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"
      }`}
    >
      <span className={destaque ? "font-bold text-emerald-800" : "text-slate-500"}>{rotulo}</span>
      <span className="font-mono font-bold text-slate-900">{valor}</span>
    </div>
  );
  const linhaEscura = (rotulo: string, valor: React.ReactNode, cor = "text-white") => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-300">{rotulo}</span>
      <span className={`font-mono font-bold ${cor}`}>{valor}</span>
    </div>
  );
  const pilula = (ok: boolean | null, vale: number) =>
    ok === null ? (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500">—</span>
    ) : ok ? (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
        <CheckCircle2 className="w-3.5 h-3.5" /> +{pctStr(vale)}%
      </span>
    ) : (
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-red-100 text-red-700 inline-flex items-center gap-1">
        <XCircle className="w-3.5 h-3.5" /> 0%
      </span>
    );

  const simInput: SimulationInput = {
    rebateTotal: toNum(sim.rebate),
    franchiseOs: Math.round(toNum(sim.franchiseOs)),
    angelOs: Math.round(toNum(sim.angelOs)),
    tmaStone: toNumOrNull(sim.tmaStone),
    tmaTon: toNumOrNull(sim.tmaTon),
    ciclo: toNumOrNull(sim.ciclo),
    reverse: sim.reverse,
  };
  const simResult = settings ? simulateAngelVariable(settings, simInput) : null;
  const setSimField = (patch: Partial<SimDraft>) => setSim((prev) => ({ ...prev, ...patch }));

  const fotoDaFranquia = (nome: string) => {
    const f = franchises.find((x) => x.name === nome);
    return f ? franchisePhotos[f.id] : undefined;
  };

  // ---- aba Franquias & Rebate
  const dedPct = settings?.rebateDeductionPct ?? 10;
  const vigY = prevMonthDate.getFullYear();
  const vigM = prevMonthDate.getMonth() + 1;
  const ehVigente = (y: number, m: number) => y === vigY && m === vigM;
  const semAcentoLower = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const franqRowsBase: FranqRow[] = [];
  if (franqAll) {
    allIndicators.forEach((i) => {
      const f = franchises.find((x) => x.id === i.franchiseId);
      if (f) franqRowsBase.push({ franchise: f, ind: i, year: i.year, month: i.month });
    });
    franqRowsBase.sort(
      (a, b) => b.year - a.year || b.month - a.month || a.franchise.name.localeCompare(b.franchise.name, "pt-BR")
    );
  } else {
    [...franchises]
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      .forEach((f) =>
        franqRowsBase.push({ franchise: f, ind: indicators.find((i) => i.franchiseId === f.id) ?? null, year, month })
      );
  }
  const buscaN = semAcentoLower(franqSearch.trim());
  const franqRows = buscaN
    ? franqRowsBase.filter((r) => semAcentoLower(`${r.franchise.name} ${r.franchise.cityRegion}`).includes(buscaN))
    : franqRowsBase;
  const franqLancadas = franqRows.filter((r) => r.ind);
  const kRebate = franqLancadas.reduce((sum, r) => sum + (r.ind?.rebateAmount ?? 0), 0);
  const kOs = franqLancadas.reduce((sum, r) => sum + (r.ind?.totalServiceOrders ?? 0), 0);
  const kDed = (kRebate * dedPct) / 100;
  const kBase = kRebate - kDed;
  const chipsComp = [0, 1, 2].map((k) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1 - k, 1);
    return { y: d.getFullYear(), m: d.getMonth() + 1 };
  });
  const franqDataPronta = franqAll ? allLoaded : ready;
  const chipIndicador = (rotulo: string, valor: number | null, meta: number, menorMelhor: boolean) => {
    const ok = hit(valor, meta, menorMelhor);
    const cls = ok === null ? "bg-slate-100 text-slate-400" : ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
    return (
      <span
        key={rotulo}
        title={`${rotulo}: ${valor === null ? "sem dado" : metaStr(valor)} (meta ${menorMelhor ? "≤" : "≥"} ${metaStr(meta)})`}
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${cls}`}
      >
        {rotulo} {ok === null ? "—" : ok ? "✓" : "✗"}
      </span>
    );
  };
  const kpi = (rotulo: string, icone: React.ReactNode, valor: React.ReactNode, sub: React.ReactNode, destaque = false) => (
    <div className={`rounded-2xl border p-4 ${destaque ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">{rotulo}</p>
        <span className={destaque ? "text-emerald-600" : "text-slate-400"}>{icone}</span>
      </div>
      <p className={`mt-2 text-xl font-black ${destaque ? "text-emerald-700" : "text-slate-900"}`}>{valor}</p>
      <p className={`mt-0.5 text-[10px] font-bold ${destaque ? "text-emerald-700" : "text-slate-500"}`}>{sub}</p>
    </div>
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

      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="max-w-xl">
          <p className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
            <DollarSign className="w-3.5 h-3.5" /> Hermes Performance • Remuneração Variável
          </p>
          <h2 className="text-2xl font-black text-white mt-1.5">Gestão de Remuneração Variável & Rebate SCL</h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Cálculo proporcional de repasse individual por Angel, com dedução de {settings?.rebateDeductionPct ?? 10}% do
            rebate, apuração mensal e regras de logística reversa.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex flex-wrap gap-1">
          {subTab("EXTRATO", "Extrato Individual", <UserCheck className="w-3.5 h-3.5" />)}
          {subTab("SIMULACAO", "Simulação em Tempo Real", <Calculator className="w-3.5 h-3.5" />)}
          {subTab("FRANQUIAS", "Franquias & Rebate", <Building2 className="w-3.5 h-3.5" />)}
          {subTab("CAMISA10", "Camisa 10", <Shirt className="w-3.5 h-3.5" />)}
          {subTab("REGRAS", "Regras e Metas", <Sliders className="w-3.5 h-3.5" />)}
        </div>
      </div>

      {/* Barra de seleção: Angel + período */}
      {tab !== "FRANQUIAS" && (
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {(tab === "EXTRATO" || tab === "SIMULACAO") && greenAngels.length > 0 ? (
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              {tab === "EXTRATO" ? "Selecionar Angel para Visualizar Extrato:" : "Selecionar Angel para Simular:"}
            </span>
            <select
              aria-label="Angel"
              value={selectedAngelId}
              onChange={(e) => setSelectedAngelId(e.target.value)}
              className={inputCls + " !w-auto flex-1 md:max-w-md font-bold"}
            >
              {greenAngels.map((a) => {
                const os = angelInds.find((x) => x.agentId === a.id)?.totalServiceOrders;
                return (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.franchiseName}
                    {os ? ` (${os} OS)` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-600">Período de referência</span>
        )}
        <div className="flex items-center gap-2">
          <select aria-label="Mês" value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputCls + " !w-auto"}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select aria-label="Ano" value={year} onChange={(e) => setYear(Number(e.target.value))} className={inputCls + " !w-auto"}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      )}

      {!ready && (tab === "EXTRATO" || tab === "SIMULACAO") && (
        <p className="text-xs text-slate-500">Carregando lançamentos do mês...</p>
      )}

      {/* ----------------------------------------------- FRANQUIAS & REBATE */}
      {tab === "FRANQUIAS" && settings && (
        <div className="space-y-4">
          {/* Cabeçalho + filtro */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-black text-slate-900">Franquias & Apuração de Rebate Mensal</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                      Regra: Rebate Base = Rebate Bruto − {dedPct}% Bônus
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
                    Lançamento mensal do rebate, do total de Ordens de Serviço (OS) e dos indicadores (TMA e Ciclo) de cada
                    franquia. Por padrão exibe a competência vigente (mês anterior: {MESES[vigM - 1]}/{vigY}), com filtro
                    para consulta e edição de meses anteriores.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const base = franqAll ? { y: vigY, m: vigM } : { y: year, m: month };
                  const primeira = [...franchises].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))[0];
                  if (primeira) openRebateForm(primeira.id, base.y, base.m, null, false);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Adicionar Rebate do Mês
              </button>
            </div>

            <div className="border-t border-slate-100" />

            <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5" /> Filtrar Competência:
                </span>
                {chipsComp.map((c, idx) => {
                  const ativo = !franqAll && year === c.y && month === c.m;
                  return (
                    <button
                      key={`${c.y}-${c.m}`}
                      onClick={() => {
                        setFranqAll(false);
                        setYear(c.y);
                        setMonth(c.m);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-extrabold border ${
                        ativo ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {ativo && <Calendar className="w-3.5 h-3.5" />}
                      {MESES[c.m - 1]}/{c.y}
                      {idx === 0 ? " (Vigente • Mês Anterior)" : ""}
                    </button>
                  );
                })}
                <button
                  onClick={() => setFranqAll(true)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border ${
                    franqAll ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Todas as Competências
                </button>
                <select
                  aria-label="Mês"
                  value={month}
                  onChange={(e) => {
                    setFranqAll(false);
                    setMonth(Number(e.target.value));
                  }}
                  className={inputCls + " !w-auto"}
                >
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  aria-label="Ano"
                  value={year}
                  onChange={(e) => {
                    setFranqAll(false);
                    setYear(Number(e.target.value));
                  }}
                  className={inputCls + " !w-auto"}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="relative lg:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  aria-label="Buscar franquia"
                  value={franqSearch}
                  onChange={(e) => setFranqSearch(e.target.value)}
                  placeholder="Buscar franquia/cidade..."
                  className={inputCls + " !pl-8"}
                />
              </div>
            </div>
          </div>

          {!franqDataPronta && <p className="text-xs text-slate-500">Carregando lançamentos...</p>}

          {franqDataPronta && (
            <>
              {/* Cartões de resumo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                {kpi(
                  "Período filtrado",
                  <Calendar className="w-4 h-4" />,
                  franqAll ? "Todas as Competências" : `${MESES[month - 1]} / ${year}${ehVigente(year, month) ? " (Vigente)" : ""}`,
                  `${franqLancadas.length} lançamentos encontrados`
                )}
                {kpi("Rebate total (bruto)", <DollarSign className="w-4 h-4" />, brl(kRebate), "Faturamento bruto do período")}
                {kpi(`Dedução bônus (${dedPct}%)`, <Percent className="w-4 h-4" />, <span className="text-amber-600">- {brl(kDed)}</span>, "Fundo retido p/ metas")}
                {kpi(`Base final líquida (${100 - dedPct}%)`, <CheckCircle2 className="w-4 h-4" />, brl(kBase), "Base de repasse aos Angels", true)}
                {kpi(
                  "Total OS / Média",
                  <TrendingUp className="w-4 h-4" />,
                  `${kOs.toLocaleString("pt-BR")} OS`,
                  `Média: ${kOs > 0 ? brl(kRebate / kOs) : "—"} / OS`
                )}
              </div>

              {/* Tabela */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5">
                <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" /> Detalhamento por Operação & Competência
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Clique em Editar para atualizar rebate, OS e indicadores de qualquer mês.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    Mostrando {franqRows.length} registros
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100">
                        <th className="py-2.5 pr-3">Franquia</th>
                        <th className="py-2.5 pr-3">Cidade / UF</th>
                        <th className="py-2.5 pr-3">Competência</th>
                        <th className="py-2.5 pr-3">Rebate total (bruto)</th>
                        <th className="py-2.5 pr-3">Dedução bônus ({dedPct}%)</th>
                        <th className="py-2.5 px-3 bg-emerald-50 text-emerald-700">Rebate menos bônus (base final)</th>
                        <th className="py-2.5 px-3 text-right">Total OS mês</th>
                        <th className="py-2.5 pr-3 text-right">Ticket médio</th>
                        <th className="py-2.5 pr-3">Indicadores</th>
                        <th className="py-2.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {franqRows.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-slate-400">Nenhum registro encontrado.</td>
                        </tr>
                      )}
                      {franqRows.map((r) => {
                        const ind = r.ind;
                        const rebate = ind?.rebateAmount ?? 0;
                        const ded = (rebate * dedPct) / 100;
                        const os = ind?.totalServiceOrders ?? 0;
                        return (
                          <tr key={`${r.franchise.id}-${r.year}-${r.month}`} className="border-b border-slate-50 hover:bg-slate-50/60">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <FranchiseAvatar name={r.franchise.name} url={franchisePhotos[r.franchise.id]} size={32} />
                                <span className="font-extrabold text-slate-900">{r.franchise.name}</span>
                                {!ind ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">NÃO LANÇADO</span>
                                ) : ehVigente(r.year, r.month) ? (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">VIGENTE</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-slate-500">{r.franchise.name}/{r.franchise.cityRegion}</td>
                            <td className="py-3 pr-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                {MESES[r.month - 1]}/{r.year}
                              </span>
                            </td>
                            <td className="py-3 pr-3 font-mono font-bold text-slate-900">{ind ? brl(rebate) : "—"}</td>
                            <td className="py-3 pr-3 font-mono font-bold text-amber-600">{ind ? `- ${brl(ded)}` : "—"}</td>
                            <td className="py-3 px-3 font-mono font-extrabold text-emerald-700 bg-emerald-50/60">{ind ? brl(rebate - ded) : "—"}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{ind ? `${os.toLocaleString("pt-BR")} OS` : "—"}</td>
                            <td className="py-3 pr-3 text-right font-mono text-[11px] text-slate-500">{ind && os > 0 && rebate > 0 ? `${brl(rebate / os)}/OS` : "—"}</td>
                            <td className="py-3 pr-3">
                              <div className="flex flex-wrap gap-1">
                                {chipIndicador("Stone", ind?.tmaStoneActual ?? null, settings.tmaStoneTarget, settings.tmaStoneLowerIsBetter)}
                                {chipIndicador("TON", ind?.tmaTonActual ?? null, settings.tmaTonTarget, settings.tmaTonLowerIsBetter)}
                                {chipIndicador("Ciclo", ind?.cicloActual ?? null, settings.cicloTarget, settings.cicloLowerIsBetter)}
                              </div>
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <button
                                aria-label={`Editar ${r.franchise.name} ${MESES[r.month - 1]}/${r.year}`}
                                title="Editar"
                                onClick={() => openRebateForm(r.franchise.id, r.year, r.month, ind, true)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                aria-label={`Excluir ${r.franchise.name} ${MESES[r.month - 1]}/${r.year}`}
                                title="Excluir"
                                disabled={!ind}
                                onClick={() => ind && setConfirmDelete({ ind, nome: `${r.franchise.name} em ${MESES[r.month - 1]}/${r.year}` })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Pop-up: adicionar / editar */}
          {rebateForm && (
            <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-label="Lançamento de rebate">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3">
                  <FranchiseAvatar
                    name={franchises.find((f) => f.id === rebateForm.franchiseId)?.name ?? "—"}
                    url={franchisePhotos[rebateForm.franchiseId]}
                    size={44}
                  />
                  <div className="flex-1">
                    <p className="text-base font-black text-slate-900">
                      {rebateForm.existing ? "Editar lançamento" : "Adicionar rebate do mês"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Rebate, OS e indicadores da franquia no mês. O variável dos Angels é calculado a partir destes números.
                    </p>
                  </div>
                  <button aria-label="Fechar" onClick={() => setRebateForm(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block col-span-3 sm:col-span-1">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">Franquia</span>
                    <select
                      aria-label="Franquia do lançamento"
                      disabled={rebateForm.locked}
                      value={rebateForm.franchiseId}
                      onChange={(e) => setRebateForm({ ...rebateForm, franchiseId: e.target.value })}
                      className={inputCls}
                    >
                      {[...franchises].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">Mês</span>
                    <select
                      aria-label="Mês do lançamento"
                      disabled={rebateForm.locked}
                      value={rebateForm.month}
                      onChange={(e) => setRebateForm({ ...rebateForm, month: Number(e.target.value) })}
                      className={inputCls}
                    >
                      {MESES.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">Ano</span>
                    <select
                      aria-label="Ano do lançamento"
                      disabled={rebateForm.locked}
                      value={rebateForm.year}
                      onChange={(e) => setRebateForm({ ...rebateForm, year: Number(e.target.value) })}
                      className={inputCls}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {rebateForm.existing && !rebateForm.locked && (
                  <p className="text-[11px] text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Esta franquia já tem lançamento neste mês: os valores abaixo foram carregados e serão substituídos ao salvar.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["rebate", "Rebate total (R$)"],
                      ["orders", "Total de OS"],
                      ["tmaStone", "TMA Stone"],
                      ["tmaTon", "TMA TON"],
                      ["ciclo", "Ciclo"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
                      <input
                        inputMode="decimal"
                        className={inputCls}
                        value={rebateForm[key]}
                        onChange={(e) => setRebateForm({ ...rebateForm, [key]: e.target.value })}
                      />
                    </label>
                  ))}
                  <label className="block">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">Observações</span>
                    <input className={inputCls} value={rebateForm.notes} onChange={(e) => setRebateForm({ ...rebateForm, notes: e.target.value })} />
                  </label>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 space-y-0.5">
                  <p>Dedução do bônus ({dedPct}%): <b>- {brl((toNum(rebateForm.rebate) * dedPct) / 100)}</b></p>
                  <p>Rebate menos bônus (base final): <b>{brl(toNum(rebateForm.rebate) * (1 - dedPct / 100))}</b></p>
                  <p>
                    Ticket médio:{" "}
                    <b>
                      {toNum(rebateForm.rebate) > 0 && toNum(rebateForm.orders) > 0
                        ? `${brl(toNum(rebateForm.rebate) / toNum(rebateForm.orders))}/OS`
                        : "—"}
                    </b>
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setRebateForm(null)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-extrabold text-slate-700">
                    Cancelar
                  </button>
                  <button onClick={saveRebateForm} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold">
                    <Save className="w-3.5 h-3.5" /> Salvar lançamento
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Pop-up: confirmar exclusão */}
          {confirmDelete && (
            <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-label="Confirmar exclusão">
              <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                <p className="text-base font-black text-slate-900">Excluir lançamento?</p>
                <p className="text-xs text-slate-600">
                  Vai apagar o rebate, as OS e os indicadores de <b>{confirmDelete.nome}</b>. O variável dos Angels dessa
                  franquia neste mês deixa de ser calculado até você lançar de novo. Remunerações já salvas não são alteradas.
                </p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-extrabold text-slate-700">
                    Cancelar
                  </button>
                  <button onClick={deleteRebate} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold">
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------- EXTRATO */}
      {tab === "EXTRATO" && settings && ready && (
        <div className="space-y-4">
          {greenAngels.length === 0 && (
            <p className="text-xs text-slate-500">Nenhum Green Angel encontrado (cargo contendo "Angel").</p>
          )}
          {selAngel && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Coluna 1: perfil */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    {selAngel.avatarUrl ? (
                      <img src={selAngel.avatarUrl} alt={selAngel.name} className="w-14 h-14 rounded-full object-cover border-2 border-emerald-400" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-400 flex items-center justify-center text-lg font-black">
                        {iniciais(selAngel.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-black text-slate-900">{selAngel.name}</p>
                        {selWa && (
                          <a
                            href={selWa}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <FranchiseAvatar name={selAngel.franchiseName} url={fotoDaFranquia(selAngel.franchiseName)} size={18} />
                        {selAngel.franchiseName} • {selAngel.jobTitle || "Green Angel"}
                      </p>
                      <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {selPadrao}
                      </span>
                    </div>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selReverse}
                      disabled={!selCalc}
                      onChange={(e) => toggleReverse(selAngel, e.target.checked)}
                    />
                    <span className="text-xs font-bold text-slate-700">Faz logística reversa</span>
                  </label>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    <p className="text-[11px] font-extrabold text-emerald-800 flex items-center gap-1.5">
                      <Shirt className="w-3.5 h-3.5" /> Kit de Uniforme & EPIs Cadastrados:
                    </p>
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {(
                        [
                          ["Jaqueta", selEq?.jaqueta],
                          ["Calça", selEq?.calca],
                          ["Botas", selEq?.botas],
                          ["Capacete", selEq?.capacete],
                        ] as const
                      ).map(([rotulo, valor]) => (
                        <div key={rotulo} className="bg-white border border-emerald-100 rounded-lg py-1.5 text-center">
                          <p className="text-[9px] font-bold text-slate-400">{rotulo}</p>
                          <p className="text-xs font-extrabold text-slate-800">{valor || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {linhaClara("Quantidade OS no Mês:", selCalc?.angelOs ?? selDraft?.angelOs ?? "—")}
                    {linhaClara("Parte das OS da franquia:", selShare !== null ? `${selShare.toFixed(1).replace(".", ",")}%` : "—", true)}
                    {linhaClara("Base Rebate Gerado Individual:", selOk ? brl(selCalc?.angelRebate ?? 0) : "—")}
                  </div>
                </div>

                {/* Coluna 2: composição dos % */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
                  <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-600" /> Composição dos % de Remuneração Conquistados
                  </p>
                  <div className="border-t border-slate-100" />
                  {!selCalc && <p className="text-[11px] text-slate-500">Calculando...</p>}
                  {selCalc && !selOk && (
                    <p className="text-[11px] text-amber-700 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {STATUS_TEXT[selCalc.status] ?? "Faltam dados para calcular."}
                    </p>
                  )}
                  {(
                    [
                      ["TMA Stone", settings.tmaStoneLowerIsBetter ? "≤" : "≥", settings.tmaStoneTarget, pctRegras.stone, selCalc?.hitTmaStone ?? null],
                      ["TMA TON", settings.tmaTonLowerIsBetter ? "≤" : "≥", settings.tmaTonTarget, pctRegras.ton, selCalc?.hitTmaTon ?? null],
                      ...(selReverse
                        ? [["Ciclo", settings.cicloLowerIsBetter ? "≤" : "≥", settings.cicloTarget, pctRegras.ciclo, selCalc?.hitCiclo ?? null] as const]
                        : []),
                    ] as ReadonlyArray<readonly [string, string, number, number, boolean | null]>
                  ).map(([rotulo, sinal, meta, vale, acertou]) => (
                    <div key={rotulo} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3">
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">
                          {rotulo} (Meta {sinal} {metaStr(meta)})
                        </p>
                        <p className="text-[10px] text-slate-500">Vale {pctStr(vale)}%</p>
                      </div>
                      {pilula(selOk ? acertou : null, vale)}
                    </div>
                  ))}
                  <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-3">
                    <div>
                      <p className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" /> Bônus Camisa 10 (Credenciamento)
                      </p>
                      <p className="text-[10px] text-amber-700">
                        {brl(settings.camisa10BonusAmount)} por indicação aprovada • {selC10.count} no mês
                      </p>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-800">+ {brl(selC10.total)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-emerald-500 rounded-2xl px-4 py-3.5 text-white">
                    <span className="text-sm font-extrabold">Total % Conquistado:</span>
                    <span className="font-mono text-base font-black">
                      {pctStr(selOk ? selCalc?.variablePct ?? 0 : 0)}% / {pctStr(selMaxPct)}%
                    </span>
                  </div>
                </div>

                {/* Coluna 3: demonstrativo */}
                <div className="rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white space-y-3">
                  <p className="text-sm font-extrabold text-emerald-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Demonstrativo Financeiro do Angel
                  </p>
                  <div className="border-t border-white/10" />
                  {selOk ? (
                    <div className="space-y-1.5 text-slate-400">
                      {linhaEscura("Rebate total da franquia:", brl(selCalc?.rebateTotal ?? 0), "text-slate-200")}
                      {linhaEscura(`Rebate-bônus (menos ${selCalc?.deductionPct}%):`, brl(selCalc?.rebateBonus ?? 0), "text-slate-200")}
                      {linhaEscura("OS do Angel / OS da franquia:", `${selCalc?.angelOs} / ${selCalc?.franchiseOs}`, "text-slate-200")}
                      <div className="border-t border-white/10 pt-2" />
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">Aguardando os dados do mês para calcular.</p>
                  )}
                  {linhaEscura("Base de Rebate Individual:", brl(selOk ? selCalc?.angelRebate ?? 0 : 0))}
                  {linhaEscura("Percentual Aplicado:", `x ${pctStr(selOk ? selCalc?.variablePct ?? 0 : 0)}%`, "text-emerald-400")}
                  {linhaEscura("Repasse Bruto Variável:", brl(selVariable))}
                  {linhaEscura("Adicional Camisa 10:", `+ ${brl(selC10.total)}`, "text-amber-300")}
                  <div className="border-t border-white/10 pt-3 flex items-end justify-between">
                    <span className="text-sm font-black text-emerald-400">VALOR A RECEBER:</span>
                    <span className="font-mono text-2xl font-black text-emerald-400">{brl(selVariable + selC10.total)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Variável + Camisa 10. Salário fixo e ajudas são lançados abaixo.</p>
                </div>
              </div>

              {/* Lançamento do mês */}
              {selDraft && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-extrabold text-slate-900">
                      Lançamento de {MESES[month - 1]}/{year} — {selAngel.name}
                    </p>
                    {selSaved ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Lançado</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Não lançado</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <label className="block">
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">OS do Angel no mês</span>
                      <input inputMode="numeric" className={inputCls} value={selDraft.angelOs} onChange={(e) => setSel({ angelOs: e.target.value })} />
                    </label>
                    <div className="flex items-end">
                      <button
                        onClick={() => saveAngelOs(selAngel)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-extrabold"
                      >
                        <Save className="w-3.5 h-3.5" /> Salvar OS
                      </button>
                    </div>
                    <label className="block md:col-span-2">
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">Salário fixo (R$)</span>
                      <input inputMode="decimal" className={inputCls} value={selDraft.baseSalary} onChange={(e) => setSel({ baseSalary: e.target.value })} />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(
                      [
                        ["maintenance", "Ajuda manutenção (R$)"],
                        ["food", "Ajuda alimentação (R$)"],
                        ["fuel", "Ajuda combustível (R$)"],
                        ["lodging", "Ajuda hospedagem (R$)"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block">
                        <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
                        <input inputMode="decimal" className={inputCls} value={selDraft[key]} onChange={(e) => setSel({ [key]: e.target.value } as Partial<CompDraft>)} />
                      </label>
                    ))}
                  </div>
                  <label className="block">
                    <span className="block text-[10px] font-bold text-slate-500 mb-1">Observações</span>
                    <input className={inputCls} value={selDraft.notes} onChange={(e) => setSel({ notes: e.target.value })} />
                  </label>
                  {selCalc && !selOk && (
                    <label className="flex items-center gap-2 text-[11px] text-slate-700">
                      <input
                        type="checkbox"
                        checked={!!confirmNoVar[selAngel.id]}
                        onChange={(e) => setConfirmNoVar((prev) => ({ ...prev, [selAngel.id]: e.target.checked }))}
                      />
                      Salvar mesmo assim, com variável de R$ 0,00 (o motivo fica registrado nas observações)
                    </label>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-600">
                      Salário: <b>{brl(toNum(selDraft.baseSalary))}</b> • Variável: <b>{brl(selVariable)}</b> • Ajudas:{" "}
                      <b>{brl(toNum(selDraft.maintenance) + toNum(selDraft.food) + toNum(selDraft.fuel) + toNum(selDraft.lodging))}</b> •
                      Camisa 10: <b>{brl(selC10.total)}</b> • Total estimado:{" "}
                      <b className="text-emerald-700">
                        {brl(
                          toNum(selDraft.baseSalary) + selVariable + toNum(selDraft.maintenance) + toNum(selDraft.food) +
                            toNum(selDraft.fuel) + toNum(selDraft.lodging) + selC10.total
                        )}
                      </b>
                    </p>
                    <button
                      onClick={() => saveCompensation(selAngel)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar lançamento
                    </button>
                  </div>
                </div>
              )}

              {/* Resumo do mês */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5">
                <p className="text-sm font-extrabold text-slate-900">
                  Resumo de {MESES[month - 1]}/{year}
                </p>
                <p className="text-[11px] text-slate-500 mb-3">
                  Variável calculado: <b>{brl(totalVariavelMes)}</b> • {angelsComCalculoOk} de {greenAngels.length} Angels com dados completos.
                  Clique numa linha para abrir o extrato.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[10px] font-bold text-slate-400 border-b border-slate-100">
                        <th className="py-2 pr-3">Angel</th>
                        <th className="py-2 pr-3">Franquia</th>
                        <th className="py-2 pr-3 text-right">OS</th>
                        <th className="py-2 pr-3 text-right">%</th>
                        <th className="py-2 pr-3 text-right">Variável</th>
                        <th className="py-2">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {greenAngels.map((a) => {
                        const c = calcFor(a.id);
                        const ok = c?.status === "OK";
                        return (
                          <tr
                            key={a.id}
                            onClick={() => setSelectedAngelId(a.id)}
                            className={`cursor-pointer border-b border-slate-50 hover:bg-slate-50 ${a.id === selAngel.id ? "bg-emerald-50/60" : ""}`}
                          >
                            <td className="py-2 pr-3 font-bold text-slate-800">{a.name}</td>
                            <td className="py-2 pr-3 text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <FranchiseAvatar name={a.franchiseName} url={fotoDaFranquia(a.franchiseName)} size={20} />
                                {a.franchiseName}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-right font-mono">{c?.angelOs ?? angelInds.find((x) => x.agentId === a.id)?.totalServiceOrders ?? "—"}</td>
                            <td className="py-2 pr-3 text-right font-mono">{ok ? `${pctStr(c?.variablePct ?? 0)}%` : "—"}</td>
                            <td className="py-2 pr-3 text-right font-mono font-bold">{ok ? brl(c?.variableAmount ?? 0) : "—"}</td>
                            <td className="py-2">
                              {records.some((r) => r.agentId === a.id) ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Lançado</span>
                              ) : ok ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pronto p/ lançar</span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Falta dado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------- SIMULAÇÃO */}
      {tab === "SIMULACAO" && settings && ready && selAngel && simResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" /> Simulação em Tempo Real
              </p>
              <button
                onClick={loadSimFromReal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] font-extrabold text-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Voltar aos valores reais
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Começa com os números reais de {selAngel.name} em {MESES[month - 1]}/{year}. Mude o que quiser para ver o
              efeito no variável. Nada aqui é salvo.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["rebate", "Rebate total da franquia (R$)"],
                  ["franchiseOs", "OS da franquia"],
                  ["angelOs", "OS do Angel"],
                  ["tmaStone", "TMA Stone"],
                  ["tmaTon", "TMA TON"],
                  ["ciclo", "Ciclo"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="block text-[10px] font-bold text-slate-500 mb-1">{label}</span>
                  <input inputMode="decimal" className={inputCls} value={sim[key]} onChange={(e) => setSimField({ [key]: e.target.value } as Partial<SimDraft>)} />
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={sim.reverse} onChange={(e) => setSimField({ reverse: e.target.checked })} />
              <span className="text-xs font-bold text-slate-700">Faz logística reversa</span>
            </label>
          </div>

          <div className="rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white space-y-3">
            <p className="text-sm font-extrabold text-emerald-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Resultado da simulação
            </p>
            <div className="border-t border-white/10" />
            {simResult.problem ? (
              <p className="text-[11px] text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {simResult.problem}
              </p>
            ) : (
              <>
                {linhaEscura("Rebate-bônus (após desconto):", brl(simResult.rebateBonus))}
                {linhaEscura(
                  `Parte do Angel (${simInput.angelOs} de ${simInput.franchiseOs} OS = ${(simResult.sharePct ?? 0).toFixed(1).replace(".", ",")}%):`,
                  brl(simResult.angelRebate)
                )}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
                  <span>Indicadores batidos:</span>
                  <Badge ok={simResult.hitStone} label="TMA Stone" />
                  <Badge ok={simResult.hitTon} label="TMA TON" />
                  {sim.reverse && <Badge ok={simResult.hitCiclo} label="Ciclo" />}
                </div>
                {linhaEscura("Percentual aplicado:", `x ${pctStr(simResult.pct)}% (máx. ${pctStr(simResult.maxPct)}%)`, "text-emerald-400")}
              </>
            )}
            <div className="border-t border-white/10 pt-3 flex items-end justify-between">
              <span className="text-sm font-black text-emerald-400">VARIÁVEL SIMULADO:</span>
              <span className="font-mono text-2xl font-black text-emerald-400">{brl(simResult.amount)}</span>
            </div>
          </div>
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
