import React, { useEffect, useRef, useState } from "react";
import { Trophy, Award, Building2, Users, MessageCircle, Upload, Copy, Calendar, X, AlertTriangle, CheckCircle2, Shirt } from "lucide-react";
import * as api from "../../../services/api";
import { supabase } from "../../../services/supabaseClient";
import { Franchise, UserAgent } from "../../../types";
import { buildDailyRecords, decodeWorkfinityBytes, parseWorkfinity, rotuloDia, DailyRecord, ImportSummary } from "../../../utils/workfinityDaily";

/**
 * Rankings de Alta Performance.
 *  - X1 SCL: disputa do dia (franquia e Angel campeões) a partir do relatório diário do Workfinity
 *  - Angels (OS), Franquias e Camisa 10: rankings do mês
 * Tudo vem do banco do Hermes. O relatório do Workfinity é lido no computador de quem importa e
 * só as contagens por técnico/dia são gravadas (nenhum dado de cliente).
 */

type Tab = "X1" | "ANGELS" | "FRANQUIAS" | "CAMISA10";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const pad = (n: number) => String(n).padStart(2, "0");
const chaveMes = (ano: number, mes: number) => `${ano}-${pad(mes)}`;
const intervaloMes = (chave: string) => {
  const [a, m] = chave.split("-").map(Number);
  return { from: `${chave}-01`, to: `${chave}-${pad(new Date(a, m, 0).getDate())}` };
};
const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dec = (v: number, casas: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const inteiro = (v: number) => v.toLocaleString("pt-BR");
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const waLink = (phone?: string): string | null => {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") && d.length >= 12 ? d : "55" + d}`;
};
const bate = (v: number | null, meta: number, menorMelhor: boolean): boolean | null => (v === null ? null : menorMelhor ? v <= meta : v >= meta);
const ehAngel = (a: UserAgent) => (a.jobTitle || "").toLowerCase().includes("angel");

const lerArquivo = async (file: File): Promise<Uint8Array> => {
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.onerror = () => reject(new Error("leitura"));
    r.readAsArrayBuffer(file);
  });
};

const PersonAvatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 40 }) => {
  const [quebrada, setQuebrada] = useState(false);
  useEffect(() => setQuebrada(false), [url]);
  const dim = { width: size, height: size };
  if (url && !quebrada) {
    return <img src={url} alt={name} style={dim} onError={() => setQuebrada(true)} className="rounded-full object-cover border-2 border-emerald-300 flex-shrink-0 bg-white" />;
  }
  return (
    <div aria-hidden="true" style={{ ...dim, fontSize: Math.max(9, Math.round(size * 0.34)) }} className="rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center font-black flex-shrink-0">
      {iniciais(name)}
    </div>
  );
};

const FranchiseAvatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 28 }) => {
  const [quebrada, setQuebrada] = useState(false);
  useEffect(() => setQuebrada(false), [url]);
  const dim = { width: size, height: size };
  if (url && !quebrada) {
    return <img src={url} alt={name} style={dim} onError={() => setQuebrada(true)} className="rounded-full object-cover border border-slate-200 bg-white flex-shrink-0" />;
  }
  return (
    <div aria-hidden="true" style={{ ...dim, fontSize: Math.max(8, Math.round(size * 0.34)) }} className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black flex-shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
};

const Posicao: React.FC<{ n: number }> = ({ n }) => (
  <span
    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
      n === 1 ? "bg-amber-400 text-white" : n === 2 ? "bg-slate-200 text-slate-700" : n === 3 ? "bg-orange-300 text-orange-900" : "bg-slate-100 text-slate-500"
    }`}
  >
    {n}º
  </span>
);

export const PerformanceRankings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [equipment, setEquipment] = useState<api.AgentEquipment[]>([]);
  const [settings, setSettings] = useState<api.CompensationSettings | null>(null);
  const [frRows, setFrRows] = useState<api.FranchiseHistoryRow[]>([]);
  const [angelRows, setAngelRows] = useState<api.AngelHistoryRow[]>([]);
  const [leads, setLeads] = useState<api.Camisa10Lead[]>([]);
  const [tab, setTab] = useState<Tab>("X1");
  const [day, setDay] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [todosTecnicos, setTodosTecnicos] = useState(false);
  const [contar, setContar] = useState<{ baixadas: boolean; canceladas: boolean; emTratamento: boolean }>(() => {
    try {
      const p = JSON.parse(window.localStorage.getItem("hermes_x1_status") ?? "null");
      if (p && (p.baixadas || p.canceladas || p.emTratamento)) return { baixadas: !!p.baixadas, canceladas: !!p.canceladas, emTratamento: !!p.emTratamento };
    } catch {
      /* sem escolha salva */
    }
    return { baixadas: true, canceladas: false, emTratamento: false };
  });
  const [c10Acumulado, setC10Acumulado] = useState(false);
  const [daily, setDaily] = useState<Record<string, api.DailyProductionRow[]>>({});
  const pedidos = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [impNome, setImpNome] = useState("");
  const [impErro, setImpErro] = useState<string | null>(null);
  const [impParsed, setImpParsed] = useState<{ records: DailyRecord[]; summary: ImportSummary } | null>(null);
  const [importando, setImportando] = useState(false);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  // ---- carga inicial
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        let admin = false;
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          try {
            admin = (await api.fetchMyProfile(data.user.id)).role === "ADMIN";
          } catch {
            admin = false;
          }
        }
        const [f, a, ph, eq, fr, an, ld, st, ult] = await Promise.all([
          api.fetchFranchises(),
          api.fetchAgents(),
          api.fetchFranchisePhotos().catch(() => ({} as Record<string, string>)),
          api.fetchAgentEquipment().catch(() => [] as api.AgentEquipment[]),
          api.fetchFranchiseHistory().catch(() => [] as api.FranchiseHistoryRow[]),
          api.fetchAngelHistory().catch(() => [] as api.AngelHistoryRow[]),
          api.fetchCamisa10Leads().catch(() => [] as api.Camisa10Lead[]),
          api.fetchCompensationSettings(),
          api.fetchLatestDailyDay().catch(() => null as string | null),
        ]);
        if (cancelado) return;
        setIsAdmin(admin);
        setFranchises(f);
        setAgents(a);
        setPhotos(ph);
        setEquipment(eq);
        setFrRows(fr);
        setAngelRows(an);
        setLeads(ld);
        setSettings(st);
        const base = ult ?? hojeIso();
        setDay(base);
        setAno(Number(base.slice(0, 4)));
        setMes(Number(base.slice(5, 7)));
      } catch (e) {
        console.error(e);
        if (!cancelado) setErro("Não foi possível carregar os rankings.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // ---- produção diária: busca cada mês necessário uma vez
  const garantirMes = (chave: string) => {
    if (daily[chave] || pedidos.current.has(chave)) return;
    pedidos.current.add(chave);
    const { from, to } = intervaloMes(chave);
    api
      .fetchDailyProduction(from, to)
      .then((rows) => setDaily((prev) => ({ ...prev, [chave]: rows })))
      .catch((e) => {
        console.error(e);
        setDaily((prev) => ({ ...prev, [chave]: [] }));
      })
      .finally(() => pedidos.current.delete(chave));
  };
  useEffect(() => {
    if (loading || erro || !day) return;
    garantirMes(day.slice(0, 7));
    garantirMes(chaveMes(ano, mes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, erro, day, ano, mes, daily]);

  // ---- importação do relatório do Workfinity
  const fecharImportacao = () => {
    setShowImport(false);
    setImpNome("");
    setImpErro(null);
    setImpParsed(null);
  };
  const aoEscolherArquivo = async (file: File) => {
    setImpErro(null);
    setImpParsed(null);
    setImpNome(file.name);
    try {
      const texto = decodeWorkfinityBytes(await lerArquivo(file));
      const parsed = parseWorkfinity(texto);
      if (!parsed.ok) {
        setImpErro(parsed.error ?? "Arquivo inválido.");
        return;
      }
      const res = buildDailyRecords(
        parsed,
        franchises.map((f) => ({ id: f.id, name: f.name })),
        agents.map((a) => ({ id: a.id, name: a.name }))
      );
      if (res.records.length === 0) {
        setImpErro("Não encontrei nenhuma OS com data de atendimento e franquia reconhecida neste arquivo.");
        return;
      }
      setImpParsed(res);
    } catch {
      setImpErro("Não consegui ler o arquivo.");
    }
  };
  const gravarImportacao = async () => {
    if (!impParsed) return;
    setImportando(true);
    try {
      const n = await api.replaceDailyProduction(impParsed.records);
      const meses = new Set(impParsed.summary.days.map((d) => d.slice(0, 7)));
      setDaily((prev) => {
        const c = { ...prev };
        meses.forEach((m) => delete c[m]);
        return c;
      });
      const ultimo = impParsed.summary.days[impParsed.summary.days.length - 1];
      setDay(ultimo);
      setAno(Number(ultimo.slice(0, 4)));
      setMes(Number(ultimo.slice(5, 7)));
      setTab("X1");
      fecharImportacao();
      showToast("ok", `Importação concluída: ${n} registros de ${impParsed.summary.days.map(rotuloDia).join(", ")}.`);
    } catch (e) {
      console.error(e);
      showToast("err", "Não foi possível gravar a importação (só Admin pode importar).");
    } finally {
      setImportando(false);
    }
  };

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      showToast("ok", "Comunicado copiado.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        showToast("ok", "Comunicado copiado.");
      } catch {
        showToast("err", "Não foi possível copiar. Selecione o texto e copie manualmente.");
      }
      ta.remove();
    }
  };

  if (loading) return <p className="text-xs text-slate-500">Carregando rankings...</p>;
  if (erro) return <p className="text-xs text-red-600">{erro}</p>;

  // ---------------------------------------------------------------- dados comuns
  const franquiasOrdenadas = [...franchises].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const agentePorId = new Map(agents.map((a) => [a.id, a]));
  const frPorId = new Map(franchises.map((f) => [f.id, f]));
  const fotoDaFranquiaDe = (a: UserAgent) => {
    const f = franchises.find((x) => x.name === a.franchiseName);
    return f ? photos[f.id] : undefined;
  };
  const eqDe = (id: string) => equipment.find((e) => e.agentId === id);
  const kitDe = (id: string) => {
    const e = eqDe(id);
    return e && (e.jaqueta || e.calca) ? `${e.jaqueta ?? "—"}/${e.calca ?? "—"}` : null;
  };
  const metaStone = settings?.tmaStoneTarget ?? 0.9;
  const metaTon = settings?.tmaTonTarget ?? 2.5;
  const metaCiclo = settings?.cicloTarget ?? 0.9;
  const ded = settings?.rebateDeductionPct ?? 10;
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];
  const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

  const nomeAngel = (a: UserAgent) => (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-extrabold text-slate-900">{a.name}</span>
      {waLink(a.phone) && (
        <a href={waLink(a.phone) as string} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${a.name}`} className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200">
          <MessageCircle className="w-3 h-3" />
        </a>
      )}
    </span>
  );

  // ---------------------------------------------------------------- X1 SCL (dia)
  const osContadas = (r: api.DailyProductionRow) =>
    (contar.baixadas ? r.osDone : 0) + (contar.canceladas ? r.osCancelled : 0) + (contar.emTratamento ? r.osPending : 0);
  const soBaixadas = contar.baixadas && !contar.canceladas && !contar.emTratamento;
  const descStatus = [contar.baixadas && "baixados", contar.canceladas && "cancelados", contar.emTratamento && "em tratamento"].filter(Boolean).join(" + ");
  const alternarStatus = (k: "baixadas" | "canceladas" | "emTratamento") => {
    const prox = { ...contar, [k]: !contar[k] };
    if (!prox.baixadas && !prox.canceladas && !prox.emTratamento) {
      showToast("err", "Mantenha pelo menos um status marcado.");
      return;
    }
    setContar(prox);
    try {
      window.localStorage.setItem("hermes_x1_status", JSON.stringify(prox));
    } catch {
      /* sem armazenamento: vale só nesta tela */
    }
  };
  const rowsMes = daily[day.slice(0, 7)] ?? null;
  const rowsDia = (rowsMes ?? []).filter((r) => r.day === day);
  const rowsAteDia = (rowsMes ?? []).filter((r) => r.day <= day);
  const totalDia = sum(rowsDia, osContadas);
  const qtdBaixadasDia = sum(rowsDia, (r) => r.osDone);
  const qtdCanceladasDia = sum(rowsDia, (r) => r.osCancelled);
  const qtdTratamentoDia = sum(rowsDia, (r) => r.osPending);
  const frRank = franquiasOrdenadas
    .map((f) => ({
      f,
      os: sum(rowsDia.filter((r) => r.franchiseId === f.id), osContadas),
      acum: sum(rowsAteDia.filter((r) => r.franchiseId === f.id), osContadas),
    }))
    .sort((a, b) => b.os - a.os || a.f.name.localeCompare(b.f.name, "pt-BR"));
  const maxFr = Math.max(1, ...frRank.map((x) => x.os));
  const osDiaPorAgente = new Map<string, number>();
  rowsDia.forEach((r) => {
    if (r.agentId) osDiaPorAgente.set(r.agentId, (osDiaPorAgente.get(r.agentId) ?? 0) + osContadas(r));
  });
  const diasTrabalhados = (id: string) => new Set(rowsAteDia.filter((r) => r.agentId === id && osContadas(r) > 0).map((r) => r.day)).size;
  const somaAteDia = (id: string) => sum(rowsAteDia.filter((r) => r.agentId === id), osContadas);
  const angelRank = [...osDiaPorAgente.entries()]
    .map(([id, os]) => {
      const a = agentePorId.get(id);
      const dias = diasTrabalhados(id);
      return { a, os, dias, media: dias > 0 ? somaAteDia(id) / dias : null };
    })
    .filter((x): x is { a: UserAgent; os: number; dias: number; media: number | null } => !!x.a && x.os > 0 && (todosTecnicos || ehAngel(x.a)))
    .sort((x, y) => y.os - x.os || x.a.name.localeCompare(y.a.name, "pt-BR"));
  const osForaDoCadastro = sum(rowsDia.filter((r) => !r.agentId), osContadas);
  const campeaFr = frRank[0] && frRank[0].os > 0 ? frRank[0] : null;
  const campeao = angelRank[0] ?? null;
  const xMedia = campeao && campeao.media && campeao.dias >= 2 ? (campeao.os / campeao.media - 1) * 100 : null;

  const medalha = ["🥇", "🥈", "🥉"];
  const comunicado = (() => {
    if (totalDia === 0) return "";
    const linhas: string[] = [`🏆 *X1 SCL — ${rotuloDia(day)}*`, `Total atendido no dia: ${inteiro(totalDia)} OS`];
    if (!soBaixadas) linhas.push(`Contagem: ${descStatus}`);
    linhas.push("");
    if (campeaFr) linhas.push(`🥇 *Franquia campeã do dia:* ${campeaFr.f.name} — ${campeaFr.os} OS`);
    if (campeao) linhas.push(`🏅 *Angel campeão:* ${campeao.a.name} (${campeao.a.franchiseName}) — ${campeao.os} OS`);
    linhas.push("", "*Ranking das franquias*");
    frRank.filter((x) => x.os > 0).forEach((x, i) => linhas.push(`${medalha[i] ?? `${i + 1}º`} ${x.f.name} — ${x.os} OS`));
    linhas.push("", "*Ranking dos Angels (top 10)*");
    angelRank.slice(0, 10).forEach((x, i) => linhas.push(`${medalha[i] ?? `${i + 1}º`} ${x.a.name} (${x.a.franchiseName}) — ${x.os} OS`));
    return linhas.join("\n");
  })();

  // ---------------------------------------------------------------- rankings do mês
  const rowsPeriodo = daily[chaveMes(ano, mes)] ?? null;
  const periodoLabel = `${MESES[mes - 1]}/${ano}`;
  const angelsMes = agents
    .filter(ehAngel)
    .map((a) => {
      const oficial = angelRows.find((r) => r.agentId === a.id && r.year === ano && r.month === mes)?.totalServiceOrders ?? 0;
      const doAgente = (rowsPeriodo ?? []).filter((r) => r.agentId === a.id);
      const somaDiaria = sum(doAgente, (r) => r.osDone);
      const dias = new Set(doAgente.filter((r) => r.osDone > 0).map((r) => r.day)).size;
      return { a, total: oficial > 0 ? oficial : somaDiaria, oficial: oficial > 0, dias, media: dias > 0 ? somaDiaria / dias : null };
    });
  const porVolume = angelsMes.filter((x) => x.total > 0).sort((x, y) => y.total - x.total || x.a.name.localeCompare(y.a.name, "pt-BR")).slice(0, 10);
  const porMedia = angelsMes.filter((x) => x.media !== null).sort((x, y) => (y.media as number) - (x.media as number) || x.a.name.localeCompare(y.a.name, "pt-BR")).slice(0, 10);

  const frMes = franquiasOrdenadas
    .map((f) => {
      const ind = frRows.find((r) => r.franchiseId === f.id && r.year === ano && r.month === mes) ?? null;
      const diaria = sum((rowsPeriodo ?? []).filter((r) => r.franchiseId === f.id), (r) => r.osDone);
      const oficial = !!ind && ind.totalServiceOrders > 0;
      return { f, ind, total: oficial ? (ind as api.FranchiseHistoryRow).totalServiceOrders : diaria, oficial };
    })
    .sort((a, b) => b.total - a.total || a.f.name.localeCompare(b.f.name, "pt-BR"));
  const conformidade = (ind: api.FranchiseHistoryRow | null) => {
    if (!ind) return { texto: "Sem lançamento", cls: "bg-slate-100 text-slate-500 border-slate-200" };
    if (ind.tmaStone === null || ind.tmaTon === null) return { texto: "Pendente TMA", cls: "bg-amber-50 text-amber-700 border-amber-300" };
    const fora: string[] = [];
    if (bate(ind.tmaStone, metaStone, settings?.tmaStoneLowerIsBetter ?? true) === false) fora.push("Stone");
    if (bate(ind.tmaTon, metaTon, settings?.tmaTonLowerIsBetter ?? true) === false) fora.push("TON");
    if (bate(ind.ciclo, metaCiclo, settings?.cicloLowerIsBetter ?? true) === false) fora.push("Ciclo");
    return fora.length === 0
      ? { texto: "100% Ok", cls: "bg-emerald-50 text-emerald-700 border-emerald-300" }
      : { texto: `Fora da meta: ${fora.join(", ")}`, cls: "bg-red-50 text-red-700 border-red-300" };
  };

  const bonusPorCliente = settings?.camisa10BonusAmount ?? 30;
  const chaveC10 = chaveMes(ano, mes);
  // mesmo critério da tela de Remuneração: o mês da aprovação no horário local
  const mesDaAprovacao = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : chaveMes(d.getFullYear(), d.getMonth() + 1);
  };
  const c10Aprovados = leads.filter((l) => l.status === "APROVADO" && (c10Acumulado || mesDaAprovacao(l.approvedAt) === chaveC10));
  const c10Rank = agents
    .map((a) => {
      const ls = c10Aprovados.filter((l) => l.agentId === a.id);
      return { a, n: ls.length, bonus: sum(ls, (l) => l.bonusAmount ?? bonusPorCliente) };
    })
    .filter((x) => x.n > 0 || ehAngel(x.a))
    .sort((x, y) => y.n - x.n || x.a.name.localeCompare(y.a.name, "pt-BR"));

  const seletorPeriodo = (
    <div className="flex items-center gap-2">
      <select aria-label="Mês" value={mes} onChange={(e) => setMes(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white">
        {MESES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select aria-label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white">
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );

  const subTab = (id: Tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold transition-all ${tab === id ? "bg-emerald-500 text-white shadow" : "text-slate-300 hover:bg-white/10"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{toast.text}</div>
      )}

      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
            <Trophy className="w-3.5 h-3.5" /> Hermes Performance • Rankings integrados
          </p>
          <h2 className="text-2xl font-black text-white mt-1.5">Rankings de Alta Performance</h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Classificação oficial com dados cadastrais sincronizados (fotos, contatos WhatsApp e kits de uniforme de cada Green Angel).
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex flex-wrap gap-1">
          {subTab("X1", "X1 SCL")}
          {subTab("ANGELS", "Angels (OS)")}
          {subTab("FRANQUIAS", "Franquias")}
          {subTab("CAMISA10", "Camisa 10")}
        </div>
      </div>

      {/* ------------------------------------------------------------ X1 SCL */}
      {tab === "X1" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> X1 SCL — disputa do dia
              </p>
              <p className="text-[11px] text-slate-500">Quem fez mais OS no dia: franquias e Angels, a partir do relatório diário do Workfinity.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-extrabold text-slate-500 uppercase">Data</span>
                <input aria-label="Data do X1" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="text-xs font-bold bg-transparent outline-none" />
              </label>
              {isAdmin && (
                <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-extrabold">
                  <Upload className="w-3.5 h-3.5" /> Importar Workfinity Diário
                </button>
              )}
            </div>
          </div>

          {rowsMes !== null && (qtdBaixadasDia + qtdCanceladasDia + qtdTratamentoDia) > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-x-5 gap-y-2 flex-wrap">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase">Contar no X1:</span>
              {(
                [
                  ["baixadas", "Baixadas", qtdBaixadasDia, "Contar OS baixadas"],
                  ["canceladas", "Canceladas", qtdCanceladasDia, "Contar OS canceladas"],
                  ["emTratamento", "Em tratamento", qtdTratamentoDia, "Contar OS em tratamento"],
                ] as const
              ).map(([k, rotulo, qtd, aria]) => (
                <label key={k} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" aria-label={aria} checked={contar[k]} onChange={() => alternarStatus(k)} />
                  {rotulo} <span className="font-mono text-[11px] text-slate-400">({inteiro(qtd)})</span>
                </label>
              ))}
            </div>
          )}

          {rowsMes === null && <p className="text-xs text-slate-500">Carregando produção do dia...</p>}

          {rowsMes !== null && totalDia === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
              {qtdBaixadasDia + qtdCanceladasDia + qtdTratamentoDia > 0 ? (
                <p className="text-sm font-extrabold text-slate-800">Nenhuma OS com os status escolhidos em {rotuloDia(day)}.</p>
              ) : (
                <>
                  <p className="text-sm font-extrabold text-slate-800">Nenhum atendimento importado para {rotuloDia(day)}.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAdmin ? "Use “Importar Workfinity Diário” com o relatório do dia (.csv)." : "O relatório do dia ainda não foi importado."}
                  </p>
                </>
              )}
            </div>
          )}

          {rowsMes !== null && totalDia > 0 && (
            <>
              <div className="bg-slate-900 rounded-2xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <p className="text-[11px] text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <b className="text-white">Filtro de Atendimento Ativo:</b> exibindo {soBaixadas ? "apenas " : ""}chamados {descStatus} com Data de Atendimento em{" "}
                  <b className="text-emerald-300">{rotuloDia(day)}</b>.
                </p>
                <span className="text-[11px] font-extrabold text-emerald-300 border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 rounded-full">
                  {soBaixadas ? "Total atendido na data" : `Total na data (${descStatus})`}: {inteiro(totalDia)} OS
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full uppercase">
                    <Trophy className="w-3 h-3" /> Franquia campeã do dia ({day})
                  </span>
                  {campeaFr && (
                    <>
                      <p className="mt-3 text-xl font-black text-slate-900">Franquia {campeaFr.f.name}</p>
                      <p className="text-[11px] text-slate-500">{campeaFr.f.name}/{campeaFr.f.cityRegion}</p>
                      <div className="mt-4 pt-3 border-t border-amber-100 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500">OS atendidas na data</p>
                          <p className="text-2xl font-black text-amber-900">{campeaFr.os} OS</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500">Acumulado no mês</p>
                          <p className="text-2xl font-black text-slate-900">{inteiro(campeaFr.acum)} OS</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full uppercase">
                    <Award className="w-3 h-3" /> Angel campeão de produção ({day})
                  </span>
                  {campeao ? (
                    <>
                      <div className="mt-3 flex items-center gap-3">
                        <PersonAvatar name={campeao.a.name} url={campeao.a.avatarUrl} size={52} />
                        <div>
                          <p className="text-lg font-black text-slate-900">{campeao.a.name}</p>
                          <p className="text-[11px] text-slate-500">{campeao.a.franchiseName} • {campeao.a.jobTitle || "Green Angel"}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-emerald-100 grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500">OS na data</p>
                          <p className="text-2xl font-black text-slate-900">{campeao.os} OS</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500">Média real</p>
                          <p className="text-2xl font-black text-emerald-700">{campeao.media !== null ? `${dec(campeao.media, 1)} OS/d` : "—"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500">x Média</p>
                          <p className="text-2xl font-black text-emerald-700">{xMedia === null ? "—" : `${xMedia >= 0 ? "+" : ""}${Math.round(xMedia)}%`}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">Nenhum Angel com OS baixadas neste dia.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Ranking das Franquias ({day})</p>
                      <p className="text-[11px] text-slate-500">Classificação baseada nos atendimentos realizados na data informada</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 whitespace-nowrap">{frRank.length} Franquias</span>
                  </div>
                  <div className="space-y-2">
                    {frRank.map((x, i) => (
                      <div
                        key={x.f.id}
                        className={`rounded-2xl border px-4 py-3 ${i === 0 ? "bg-amber-50 border-amber-300" : i === 1 ? "bg-slate-50 border-slate-200" : i === 2 ? "bg-orange-50 border-orange-200" : "bg-white border-slate-200"}`}
                      >
                        <div className="flex items-center gap-3">
                          <Posicao n={i + 1} />
                          <FranchiseAvatar name={x.f.name} url={photos[x.f.id]} size={28} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-extrabold text-slate-900">Franquia {x.f.name}</p>
                            <p className="text-[10px] text-slate-500">{x.f.name}/{x.f.cityRegion}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-amber-800">{x.os} OS do Dia</p>
                            <p className="text-[10px] text-slate-500">({inteiro(x.acum)} OS no mês)</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(x.os / maxFr) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> Ranking dos Angels ({day})</p>
                      <p className="text-[11px] text-slate-500">Atendimentos concluídos na data e média diária real</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap">{angelRank.length} {todosTecnicos ? "técnicos" : "Angels"} ativos</span>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-slate-600 mb-3">
                    <input type="checkbox" checked={todosTecnicos} onChange={(e) => setTodosTecnicos(e.target.checked)} />
                    Mostrar também agentes externos e coordenadores
                  </label>
                  <div className="space-y-2 max-h-[34rem] overflow-y-auto pr-1">
                    {angelRank.map((x, i) => (
                      <div
                        key={x.a.id}
                        className={`rounded-2xl border px-3 py-2.5 flex items-center gap-3 ${i === 0 ? "bg-emerald-50 border-emerald-300" : i === 1 ? "bg-slate-50 border-slate-200" : i === 2 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}
                      >
                        <Posicao n={i + 1} />
                        <PersonAvatar name={x.a.name} url={x.a.avatarUrl} size={36} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{nomeAngel(x.a)}</p>
                          <p className="text-[10px] text-slate-500 truncate">{x.a.franchiseName} • {x.a.jobTitle || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Atendidos no dia</p>
                          <p className="text-sm font-black text-slate-900">{x.os} OS</p>
                        </div>
                        <div className="text-right w-20">
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Média real</p>
                          <p className="text-sm font-black text-emerald-700">{x.media !== null ? `${dec(x.media, 1)} OS/d` : "—"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {osForaDoCadastro > 0 && (
                    <p className="text-[10px] text-slate-500 mt-3">
                      {osForaDoCadastro} OS do dia são de técnicos fora do cadastro ou sem técnico: contam para a franquia, mas não aparecem neste ranking.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-600" /> Comunicado para o grupo de WhatsApp</p>
                    <p className="text-[11px] text-slate-500">Texto pronto com o resultado do dia. Copie e cole no grupo.</p>
                  </div>
                  <button onClick={() => copiar(comunicado)} className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-extrabold">
                    <Copy className="w-3.5 h-3.5" /> Copiar comunicado
                  </button>
                </div>
                <pre aria-label="Texto do comunicado" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 whitespace-pre-wrap font-sans">{comunicado}</pre>
              </div>
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ ANGELS */}
      {tab === "ANGELS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate-500">Ranking de {periodoLabel}. O volume usa o total oficial do mês quando já foi lançado; senão, a soma dos relatórios diários importados.</p>
            {seletorPeriodo}
          </div>
          {rowsPeriodo === null && <p className="text-xs text-slate-500">Carregando...</p>}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Award className="w-4 h-4 text-emerald-600" /> Líderes em Volume Total de OS (Mês)</p>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">Fotos & WhatsApp</span>
              </div>
              {porVolume.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">Sem OS em {periodoLabel}.</p>}
              <div className="space-y-2">
                {porVolume.map((x, i) => (
                  <div key={x.a.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 flex items-center gap-3">
                    <Posicao n={i + 1} />
                    <PersonAvatar name={x.a.name} url={x.a.avatarUrl} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{nomeAngel(x.a)}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        {x.a.franchiseName}
                        {kitDe(x.a.id) && <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-bold"><Shirt className="w-2.5 h-2.5" /> Kit: {kitDe(x.a.id)}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-slate-900">{inteiro(x.total)} OS</p>
                      <p className="text-[10px] font-bold text-emerald-700">{x.media !== null ? `${dec(x.media, 2)} OS/dia real` : x.oficial ? "total oficial" : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Trophy className="w-4 h-4 text-emerald-600" /> Líderes em Média Diária Real (OS/dia trabalhado)</p>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">Efetividade</span>
              </div>
              {porMedia.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">Sem relatórios diários importados em {periodoLabel}.</p>}
              <div className="space-y-2">
                {porMedia.map((x, i) => (
                  <div key={x.a.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 flex items-center gap-3">
                    <Posicao n={i + 1} />
                    <PersonAvatar name={x.a.name} url={x.a.avatarUrl} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{nomeAngel(x.a)}</p>
                      <p className="text-[10px] text-slate-500">{x.dias} dias trabalhados • {x.a.franchiseName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-emerald-700">{dec(x.media as number, 2)} OS/dia</p>
                      <p className="text-[10px] text-slate-500">{inteiro(x.total)} OS total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ FRANQUIAS */}
      {tab === "FRANQUIAS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-slate-500">Ranking de {periodoLabel}.</p>
            {seletorPeriodo}
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5">
            <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-emerald-600" /> Ranking Geral de Franquias SCL</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-extrabold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3">Posição</th>
                    <th className="py-2.5 px-3">Franquia</th>
                    <th className="py-2.5 px-3">Cidade</th>
                    <th className="py-2.5 px-3">Total OS mês</th>
                    <th className="py-2.5 px-3">Conformidade KPIs</th>
                    {isAdmin && <th className="py-2.5 px-3">Rebate líquido</th>}
                  </tr>
                </thead>
                <tbody>
                  {frMes.map((x, i) => {
                    const c = conformidade(x.ind);
                    return (
                      <tr key={x.f.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-black text-slate-700">{i + 1}º</td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-2 font-extrabold text-slate-900">
                            <FranchiseAvatar name={x.f.name} url={photos[x.f.id]} size={24} />
                            {x.f.name}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">{x.f.name}/{x.f.cityRegion}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {x.total > 0 ? `${inteiro(x.total)} OS` : "—"}
                          {x.total > 0 && !x.oficial && <span className="ml-1 text-[9px] font-bold text-slate-400">(importado)</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${c.cls}`}>{c.texto}</span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                            {x.ind && x.ind.rebate > 0 ? brl(x.ind.rebate * (1 - ded / 100)) : "—"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ CAMISA 10 */}
      {tab === "CAMISA10" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
              <button onClick={() => setC10Acumulado(false)} className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold ${!c10Acumulado ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>Mês selecionado</button>
              <button onClick={() => setC10Acumulado(true)} className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold ${c10Acumulado ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}>Acumulado</button>
            </div>
            {!c10Acumulado && seletorPeriodo}
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5">
            <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-3"><Award className="w-4 h-4 text-emerald-600" /> Ranking Camisa 10 (Mais Clientes Credenciados)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-extrabold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <th className="py-2.5 px-3">Posição</th>
                    <th className="py-2.5 px-3">Angel comercial</th>
                    <th className="py-2.5 px-3">Franquia</th>
                    <th className="py-2.5 px-3">Clientes credenciados</th>
                    <th className="py-2.5 px-3">Bônus acumulado ({brl(bonusPorCliente)}/cliente)</th>
                  </tr>
                </thead>
                <tbody>
                  {c10Rank.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Nenhum Angel encontrado.</td></tr>
                  )}
                  {c10Rank.map((x, i) => (
                    <tr key={x.a.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="py-3 px-3 font-black text-slate-700">{i + 1}º</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-2">
                          <PersonAvatar name={x.a.name} url={x.a.avatarUrl} size={32} />
                          {nomeAngel(x.a)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{x.a.franchiseName}</td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-700">{x.n} Credenciados</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{brl(x.bonus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ Importação */}
      {showImport && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-label="Importar relatório do Workfinity">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-900">Importar Workfinity Diário</p>
                <p className="text-[11px] text-slate-500">
                  O arquivo é lido só no seu computador. Nenhum dado de cliente é enviado: o sistema guarda apenas o total de OS por técnico e por dia.
                </p>
              </div>
              <button aria-label="Fechar" onClick={fecharImportacao} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <label className="block">
              <span className="block text-[10px] font-bold text-slate-500 mb-1">Relatório do Workfinity (.csv)</span>
              <input aria-label="Arquivo do Workfinity" type="file" accept=".csv,text/csv" onChange={(e) => e.target.files && e.target.files[0] && aoEscolherArquivo(e.target.files[0])} className="block w-full text-xs" />
            </label>
            {impErro && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {impErro}</p>
            )}
            {impParsed && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3"><p className="text-[10px] font-bold text-emerald-700">OS baixadas (contadas)</p><p className="text-xl font-black text-emerald-800">{inteiro(impParsed.summary.done)}</p></div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-500">Canceladas</p><p className="text-xl font-black text-slate-700">{inteiro(impParsed.summary.cancelled)}</p></div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-500">Em tratamento</p><p className="text-xl font-black text-slate-700">{inteiro(impParsed.summary.pending)}</p></div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3"><p className="text-[10px] font-bold text-slate-500">Dia(s) do arquivo</p><p className="text-sm font-black text-slate-700">{impParsed.summary.days.map(rotuloDia).join(", ")}</p></div>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold text-slate-700 mb-1">Baixadas por franquia ({impNome})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {impParsed.summary.porFranquia.map((p) => (
                      <div key={p.franchiseId} className="text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex justify-between"><span className="font-bold text-slate-700">{p.nome}</span><span className="font-mono text-slate-900">{p.done}</span></div>
                    ))}
                  </div>
                </div>
                {impParsed.summary.tecnicosForaDoCadastro.length > 0 && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Técnicos fora do cadastro (contam para a franquia, mas não entram no ranking de Angels):{" "}
                    {impParsed.summary.tecnicosForaDoCadastro.map((t) => `${t.nome} (${t.os})`).join("; ")}.
                  </p>
                )}
                {impParsed.summary.franquiasNaoEncontradas.length > 0 && (
                  <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                    Franquias não reconhecidas (ignoradas): {impParsed.summary.franquiasNaoEncontradas.map((t) => `${t.nome} (${t.linhas})`).join("; ")}.
                  </p>
                )}
                {impParsed.summary.semData > 0 && <p className="text-[11px] text-slate-500">{impParsed.summary.semData} linhas sem data de atendimento foram ignoradas.</p>}
                <p className="text-[11px] text-slate-500">Importar de novo o mesmo dia substitui os números desse dia (não duplica).</p>
                <div className="flex justify-end gap-2">
                  <button onClick={fecharImportacao} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-extrabold text-slate-700">Cancelar</button>
                  <button onClick={gravarImportacao} disabled={importando} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold">
                    {importando ? "Gravando..." : "Gravar no sistema"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
