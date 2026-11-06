import React, { useEffect, useState } from "react";
import { Database, Download, MessageCircle, Shirt, Target, TrendingUp, Clock, Users, DollarSign, AlertTriangle } from "lucide-react";
import * as api from "../../../services/api";
import { supabase } from "../../../services/supabaseClient";
import { Franchise, UserAgent } from "../../../types";
import { chartColors } from "../../../design-system/chartColors";

/**
 * Histórico Consolidado das Franquias.
 * Tudo vem do banco do Hermes e esta tela só mostra (não lança nada): para corrigir
 * um valor, use Remuneração Variável → Franquias & Rebate (um único lugar de lançamento).
 */

/** O cadastro às vezes guarda "RN - JOÃO CÂMARA" no campo da UF: aqui sempre sai só "RN". */
const ufDe = (regiao?: string): string => {
  const m = /^\s*([A-Za-z]{2})(?=\s*[-–/]|\s*$)/.exec(regiao ?? "");
  return m ? m[1].toUpperCase() : regiao ?? "";
};
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MES_ABR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PALETA = chartColors.palette;
const COR_SEM_DIVISAO = chartColors.neutral;

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dec = (v: number | null, casas: number) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const horas = (v: number | null) => (v === null ? "—" : `${dec(v, 2)}h`);
const pct = (v: number | null) => (v === null ? "—" : `${dec(v, 1)}%`);
const inteiro = (v: number) => v.toLocaleString("pt-BR");
const media = (xs: (number | null)[]): number | null => {
  const ok = xs.filter((x): x is number => x !== null);
  return ok.length === 0 ? null : ok.reduce((s, x) => s + x, 0) / ok.length;
};
const anoCurto = (y: number) => String(y).slice(2);
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const waLink = (phone?: string): string | null => {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.startsWith("55") && d.length >= 12 ? d : "55" + d}`;
};

/** Escala "redonda" para os eixos dos gráficos. */
function escala(max: number, divisoes = 4): { teto: number; passo: number } {
  if (max <= 0) return { teto: 1, passo: 1 };
  const bruto = max / divisoes;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / mag;
  const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  return { teto: passo * Math.ceil(max / passo), passo };
}

export interface HistTecnico {
  id: string;
  name: string;
}

/** Monta o CSV do histórico (separador ";" e vírgula decimal, para abrir direto no Excel em português). */
export function buildHistoryCsv(
  franquia: string,
  rows: api.FranchiseHistoryRow[],
  tecnicos: HistTecnico[],
  osPorTecnicoMes: Map<string, number>
): string {
  const texto = (t: string) => {
    const limpo = /^[=+\-@]/.test(t) ? `'${t}` : t;
    return /[;"\n]/.test(limpo) ? `"${limpo.replace(/"/g, '""')}"` : limpo;
  };
  const num = (v: number | null, casas?: number) =>
    v === null ? "" : casas === undefined ? String(v).replace(".", ",") : v.toFixed(casas).replace(".", ",");
  const cab = [
    "Franquia", "Ano", "Mês",
    ...tecnicos.map((t) => `OS ${t.name}`),
    "Total OS", "OS Stone", "OS TON", "SLA Stone (%)", "SLA TON (%)", "SLA Bobina (%)",
    "TMA Stone (h)", "TMA TON (h)", "TMA Bobina (h)", "Ciclo (h)", "Rebate bruto (R$)",
  ];
  const linhas = rows.map((r) => [
    franquia, String(r.year), MESES[r.month - 1],
    ...tecnicos.map((t) => String(osPorTecnicoMes.get(`${t.id}|${r.year}-${r.month}`) ?? "")),
    String(r.totalServiceOrders), num(r.osStone), num(r.osTon),
    num(r.slaStone, 1), num(r.slaTon, 1), num(r.slaBobina, 1),
    num(r.tmaStone, 2), num(r.tmaTon, 2), num(r.tmaBobina, 2), num(r.ciclo, 2),
    r.rebate > 0 ? num(r.rebate, 2) : "",
  ]);
  return [cab, ...linhas].map((l) => l.map(texto).join(";")).join("\r\n");
}

/** Foto da franquia; sem foto (ou foto que não abre) mostra as iniciais. */
const FranchiseAvatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 20 }) => {
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

export const PerformanceHistory2025: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [equipment, setEquipment] = useState<api.AgentEquipment[]>([]);
  const [frRows, setFrRows] = useState<api.FranchiseHistoryRow[]>([]);
  const [angelRows, setAngelRows] = useState<api.AngelHistoryRow[]>([]);
  const [records, setRecords] = useState<api.AgentCompensationRecord[]>([]);
  const [settings, setSettings] = useState<api.CompensationSettings | null>(null);
  const [franchiseId, setFranchiseId] = useState("");
  const [periodo, setPeriodo] = useState("TODOS");
  const [calcs, setCalcs] = useState<Record<string, api.AngelVariableCalc | null>>({});

  // ---- carga única dos dados
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
        const [f, a, ph, eq, fr, an, st] = await Promise.all([
          api.fetchFranchises(),
          api.fetchAgents(),
          api.fetchFranchisePhotos().catch(() => ({} as Record<string, string>)),
          api.fetchAgentEquipment().catch(() => [] as api.AgentEquipment[]),
          api.fetchFranchiseHistory(),
          api.fetchAngelHistory().catch(() => [] as api.AngelHistoryRow[]),
          api.fetchCompensationSettings(),
        ]);
        const recs = admin ? await api.fetchAllCompensationRecords().catch(() => [] as api.AgentCompensationRecord[]) : [];
        if (cancelado) return;
        setIsAdmin(admin);
        setFranchises(f);
        setAgents(a);
        setPhotos(ph);
        setEquipment(eq);
        setFrRows(fr);
        setAngelRows(an);
        setRecords(recs);
        setSettings(st);
        const primeira = [...f].sort((x, y) => x.name.localeCompare(y.name, "pt-BR"))[0];
        if (primeira) setFranchiseId(primeira.id);
      } catch (e) {
        console.error(e);
        if (!cancelado) setErro("Não foi possível carregar o histórico.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  // ---- dados da franquia escolhida
  const franquiasOrdenadas = [...franchises].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const franchise = franchises.find((f) => f.id === franchiseId) ?? null;
  const ordem = (a: { year: number; month: number }, b: { year: number; month: number }) => a.year - b.year || a.month - b.month;
  const todasDaFranquia = frRows.filter((r) => r.franchiseId === franchiseId).sort(ordem);
  const anos = Array.from(new Set(todasDaFranquia.map((r) => r.year))).sort();
  const noPeriodo = (y: number) => periodo === "TODOS" || String(y) === periodo;
  const rows = todasDaFranquia.filter((r) => noPeriodo(r.year));

  const agentesDaFranquia = agents.filter((a) => franchise && a.franchiseName === franchise.name);
  const ehAngel = (a: UserAgent) => (a.jobTitle || "").toLowerCase().includes("angel");
  const angelsCad = agentesDaFranquia.filter(ehAngel).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const tecnicos: HistTecnico[] = agentesDaFranquia
    .filter((a) => angelRows.some((r) => r.agentId === a.id && r.totalServiceOrders > 0))
    .sort((a, b) => Number(ehAngel(b)) - Number(ehAngel(a)) || a.name.localeCompare(b.name, "pt-BR"))
    .map((a) => ({ id: a.id, name: a.name }));
  const osPorTecnicoMes = new Map<string, number>();
  angelRows.forEach((r) => osPorTecnicoMes.set(`${r.agentId}|${r.year}-${r.month}`, r.totalServiceOrders));
  const recPorChave = new Map<string, api.AgentCompensationRecord>();
  records.forEach((r) => recPorChave.set(`${r.agentId}|${r.year}-${r.month}`, r));

  // ---- cartões de resumo
  const mesesComOs = rows.filter((r) => r.totalServiceOrders > 0);
  const totalOs = mesesComOs.reduce((s, r) => s + r.totalServiceOrders, 0);
  const mediaMensal = mesesComOs.length > 0 ? totalOs / mesesComOs.length : null;
  const tmaStoneMedio = media(rows.map((r) => r.tmaStone));
  const tmaTonMedio = media(rows.map((r) => r.tmaTon));
  const cicloMedio = media(rows.map((r) => r.ciclo));
  const slaStoneMedio = media(rows.map((r) => r.slaStone));
  const slaTonMedio = media(rows.map((r) => r.slaTon));
  const osDoTecnico = (id: string) => rows.reduce((s, r) => s + (osPorTecnicoMes.get(`${id}|${r.year}-${r.month}`) ?? 0), 0);
  const metaStone = settings?.tmaStoneTarget ?? 0.9;
  const metaTon = settings?.tmaTonTarget ?? 2.5;

  // ---- variável calculado pelo banco nos meses com rebate e ainda sem lançamento salvo (só Admin)
  useEffect(() => {
    if (!isAdmin || !franchise) return;
    let cancelado = false;
    const tarefas: { chave: string; agentId: string; y: number; m: number }[] = [];
    angelsCad.forEach((a) =>
      rows.forEach((r) => {
        const chave = `${a.id}|${r.year}-${r.month}`;
        if (r.rebate > 0 && !recPorChave.has(chave)) tarefas.push({ chave, agentId: a.id, y: r.year, m: r.month });
      })
    );
    if (tarefas.length === 0) return;
    Promise.all(
      tarefas.map(async (t) => {
        try {
          return [t.chave, await api.calculateAngelVariable(t.agentId, t.y, t.m)] as const;
        } catch {
          return [t.chave, null] as const;
        }
      })
    ).then((entradas) => {
      if (!cancelado) setCalcs((prev) => ({ ...prev, ...Object.fromEntries(entradas) }));
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, franchiseId, periodo, frRows, records, agents]);

  const variavelDoMes = (agentId: string, y: number, m: number): { valor: number; calculado: boolean } | null => {
    const rec = recPorChave.get(`${agentId}|${y}-${m}`);
    if (rec) return { valor: rec.variableBonus, calculado: false };
    const c = calcs[`${agentId}|${y}-${m}`];
    if (c && c.status === "OK") return { valor: c.variableAmount ?? 0, calculado: true };
    return null;
  };

  // ---- gráfico de barras (OS por mês, empilhado por técnico)
  const barras = rows
    .map((r) => {
      const segs = tecnicos.map((t, i) => ({ nome: t.name, cor: PALETA[i % PALETA.length], v: osPorTecnicoMes.get(`${t.id}|${r.year}-${r.month}`) ?? 0 }));
      const somaT = segs.reduce((s, x) => s + x.v, 0);
      const resto = Math.max(0, r.totalServiceOrders - somaT);
      return { r, segs, resto, total: Math.max(r.totalServiceOrders, somaT) };
    })
    .filter((b) => b.total > 0);
  const temResto = barras.some((b) => b.resto > 0);

  const renderBarras = () => {
    const W = 620, H = 270, L = 44, R = 12, T = 12, B = 44;
    const pw = W - L - R, ph = H - T - B;
    const { teto, passo } = escala(Math.max(...barras.map((b) => b.total), 0));
    const y = (v: number) => T + ph - (v / teto) * ph;
    const slot = barras.length > 0 ? pw / barras.length : pw;
    const bw = Math.min(26, slot * 0.7);
    const salto = Math.ceil(barras.length / 10);
    const ticks: number[] = [];
    for (let v = 0; v <= teto + 0.0001; v += passo) ticks.push(v);
    return (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução mensal de chamados (OS)" className="w-full h-auto">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{v}</text>
          </g>
        ))}
        {barras.map((b, i) => {
          const x = L + slot * i + (slot - bw) / 2;
          let base = 0;
          const rotulo = `${MES_ABR[b.r.month - 1]}/${anoCurto(b.r.year)}`;
          const partes = [...b.segs.map((s) => ({ nome: s.nome, cor: s.cor, v: s.v })), { nome: "Demais OS da franquia", cor: COR_SEM_DIVISAO, v: b.resto }].filter((p) => p.v > 0);
          return (
            <g key={`${b.r.year}-${b.r.month}`}>
              {partes.map((p) => {
                const yTopo = y(base + p.v);
                const alt = y(base) - yTopo;
                base += p.v;
                return (
                  <rect key={p.nome} x={x} y={yTopo} width={bw} height={alt} fill={p.cor}>
                    <title>{`${rotulo} — ${p.nome}: ${p.v} OS`}</title>
                  </rect>
                );
              })}
              {i % salto === 0 && <text x={x + bw / 2} y={H - T - 14} textAnchor="middle" fontSize="9" fill="#64748b">{rotulo}</text>}
            </g>
          );
        })}
      </svg>
    );
  };

  // ---- gráfico de linhas (TMA e Ciclo)
  const renderLinhas = () => {
    const W = 620, H = 270, L = 40, R = 12, T = 12, B = 44;
    const pw = W - L - R, ph = H - T - B;
    const todos = rows.flatMap((r) => [r.tmaStone, r.tmaTon, r.ciclo]).filter((v): v is number => v !== null);
    const { teto, passo } = escala(Math.max(...todos, metaStone, 0.5), 4);
    const y = (v: number) => T + ph - (v / teto) * ph;
    const n = rows.length;
    const x = (i: number) => L + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
    const salto = Math.ceil(n / 8);
    const ticks: number[] = [];
    for (let v = 0; v <= teto + 0.0001; v += passo) ticks.push(Number(v.toFixed(4)));
    const series = [
      { nome: "Ciclo Triagem (h)", cor: chartColors.palette[3], valores: rows.map((r) => r.ciclo) },
      { nome: "TMA Stone (h)", cor: chartColors.palette[0], valores: rows.map((r) => r.tmaStone) },
      { nome: "TMA Ton (h)", cor: chartColors.palette[2], valores: rows.map((r) => r.tmaTon) },
    ];
    return (
      <>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tendência de TMA e Ciclo de Triagem" className="w-full h-auto">
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{dec(v, 1)}</text>
            </g>
          ))}
          <line x1={L} x2={W - R} y1={y(metaStone)} y2={y(metaStone)} stroke={chartColors.palette[0]} strokeDasharray="5 4" strokeWidth="1" opacity="0.7" />
          <text x={W - R} y={y(metaStone) - 3} textAnchor="end" fontSize="8" fill={chartColors.meta}>Meta {dec(metaStone, 2)}h</text>
          {series.map((s) => {
            const segmentos: string[][] = [];
            s.valores.forEach((v, i) => {
              if (v === null) {
                segmentos.push([]);
              } else {
                if (segmentos.length === 0) segmentos.push([]);
                segmentos[segmentos.length - 1].push(`${x(i)},${y(v)}`);
              }
            });
            return (
              <g key={s.nome}>
                {segmentos.filter((p) => p.length > 1).map((p, i) => (
                  <polyline key={i} points={p.join(" ")} fill="none" stroke={s.cor} strokeWidth="1.8" />
                ))}
                {s.valores.map((v, i) =>
                  v === null ? null : (
                    <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill="#fff" stroke={s.cor} strokeWidth="1.6">
                      <title>{`${MES_ABR[rows[i].month - 1]}/${anoCurto(rows[i].year)} — ${s.nome.replace(" (h)", "")}: ${horas(v)}`}</title>
                    </circle>
                  )
                )}
              </g>
            );
          })}
          {rows.map((r, i) =>
            i % salto === 0 ? (
              <text key={`${r.year}-${r.month}`} x={x(i)} y={H - T - 14} textAnchor="middle" fontSize="9" fill="#64748b">
                {MES_ABR[r.month - 1]}/{anoCurto(r.year)}
              </text>
            ) : null
          )}
        </svg>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
          {series.map((s) => (
            <span key={s.nome} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: s.cor }} /> {s.nome}
            </span>
          ))}
        </div>
      </>
    );
  };

  const chipTma = (v: number | null, meta: number) => {
    if (v === null) return <span className="text-slate-300">—</span>;
    const cls = v <= meta ? "bg-emerald-100 text-emerald-700" : v <= meta * 1.15 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
    return <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${cls}`}>{horas(v)}</span>;
  };

  const exportarCsv = () => {
    if (!franchise) return;
    const csv = "\uFEFF" + buildHistoryCsv(franchise.name, rows, tecnicos, osPorTecnicoMes);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historico-${franchise.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}-${periodo.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-xs text-slate-500">Carregando histórico...</p>;
  if (erro) return <p className="text-xs text-red-600">{erro}</p>;
  if (franquiasOrdenadas.length === 0) return <p className="text-xs text-slate-500">Nenhuma franquia disponível para o seu perfil.</p>;

  const anoIni = frRows.length ? Math.min(...frRows.map((r) => r.year)) : null;
  const anoFim = frRows.length ? Math.max(...frRows.map((r) => r.year)) : null;
  const variavelTotal = angelsCad.reduce(
    (s, a) => s + rows.reduce((ss, r) => ss + (variavelDoMes(a.id, r.year, r.month)?.valor ?? 0), 0),
    0
  );
  const linhasRemuneracao = rows
    .flatMap((r) =>
      tecnicos.map((t) => ({ r, t, os: osPorTecnicoMes.get(`${t.id}|${r.year}-${r.month}`) ?? 0, rec: recPorChave.get(`${t.id}|${r.year}-${r.month}`) }))
    )
    .filter((l) => l.os > 0 || l.rec);

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase">
              <Database className="w-3 h-3" /> Dados do sistema Hermes
            </span>
            <span className="text-[11px] text-slate-400">Histórico Operacional ({anoIni ?? "—"} - {anoFim ?? "—"})</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-2">Histórico Consolidado das Franquias</h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Acompanhamento de séries temporais de chamados, prazos de atendimento (SLA/TMA) e produtividade por técnico,
            direto do banco de dados do Hermes.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[11px] text-slate-300 max-w-xs">
          Esta tela é só de consulta. Para corrigir um valor, use <b className="text-white">Remuneração Variável → Franquias & Rebate</b>.
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1.5 uppercase">
            <Users className="w-3.5 h-3.5" /> Franquia:
          </span>
          {franquiasOrdenadas.map((f) => (
            <button
              key={f.id}
              onClick={() => setFranchiseId(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold border ${
                f.id === franchiseId ? "bg-emerald-600 text-white border-emerald-600" : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <FranchiseAvatar name={f.name} url={photos[f.id]} size={16} />
              {f.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
            {["TODOS", ...anos.map(String)].map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold ${periodo === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={exportarCsv} className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-extrabold">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      </div>

      {franchise && (
        <>
          {/* Green Angels alocados */}
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <p className="text-xs font-extrabold text-slate-800 uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" /> Green Angels alocados na franquia {franchise.name} (cadastro oficial)
              </p>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                {angelsCad.length} Green Angel(s) cadastrado(s)
              </span>
            </div>
            {angelsCad.length === 0 && <p className="text-xs text-slate-500">Nenhum Green Angel cadastrado nesta franquia.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {angelsCad.map((a) => {
                const eq = equipment.find((e) => e.agentId === a.id);
                const wa = waLink(a.phone);
                const epis = eq && (eq.jaqueta || eq.calca || eq.botas || eq.capacete)
                  ? `Jq ${eq.jaqueta ?? "—"} | Cç ${eq.calca ?? "—"} | Bt ${eq.botas ?? "—"} | Cap ${eq.capacete ?? "—"}`
                  : "EPIs não cadastrados";
                return (
                  <div key={a.id} className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
                    {a.avatarUrl ? (
                      <img src={a.avatarUrl} alt={a.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-400 flex items-center justify-center font-black">{iniciais(a.name)}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-slate-900 truncate">{a.name}</p>
                      <p className="text-[10px] text-slate-500">{ufDe(franchise.cityRegion)} · {franchise.name}</p>
                      <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <Shirt className="w-3 h-3" /> {epis}
                      </p>
                    </div>
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold">
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cartões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase">Total de atendimentos</p>
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><TrendingUp className="w-4 h-4" /></span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {inteiro(totalOs)} <span className="text-xs font-bold text-slate-500">OS Concluídas</span>
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>Média Mensal: <b className="text-slate-700">{mediaMensal === null ? "—" : `${inteiro(Math.round(mediaMensal))} OS/mês`}</b></span>
                <span className="font-bold">{periodo}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase">TMA médio Stone</p>
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Target className="w-4 h-4" /></span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {horas(tmaStoneMedio)}{" "}
                <span className={`text-[11px] font-bold ${tmaStoneMedio !== null && tmaStoneMedio <= metaStone ? "text-emerald-600" : "text-red-600"}`}>Meta ≤ {dec(metaStone, 2)}h</span>
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                <span>TMA Ton: <b className="text-slate-700">{horas(tmaTonMedio)}</b></span>
                <span>Ciclo: <b className="text-slate-700">{horas(cicloMedio)}</b></span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase">SLA médio Stone</p>
                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Clock className="w-4 h-4" /></span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{pct(slaStoneMedio)}</p>
              <div className="mt-2 text-[10px] text-slate-500">SLA Ton: <b className="text-slate-700">{pct(slaTonMedio)}</b></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-500 uppercase">Produção por técnico</p>
                <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center"><Users className="w-4 h-4" /></span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {tecnicos.length} {tecnicos.length === 1 ? "Técnico" : "Técnicos"} <span className="text-xs font-bold text-slate-500">em campo</span>
              </p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 text-[10px] text-slate-500">
                {tecnicos.map((t) => (
                  <span key={t.id} className="truncate">
                    {t.name}: <b className="text-slate-700">{inteiro(osDoTecnico(t.id))} OS</b>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {rows.length === 0 && (
            <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">Esta franquia ainda não tem histórico no período escolhido.</p>
          )}

          {rows.length > 0 && (
            <>
              {/* Gráficos */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Evolução Mensal de Chamados (OS)</p>
                      <p className="text-[11px] text-slate-500">Volume acumulado e divisão por técnico na franquia {franchise.name}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">{barras.length} meses</span>
                  </div>
                  <div className="mt-3">{barras.length > 0 ? renderBarras() : <p className="text-xs text-slate-400 py-10 text-center">Sem OS no período.</p>}</div>
                  <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
                    {tecnicos.map((t, i) => (
                      <span key={t.id} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PALETA[i % PALETA.length] }} /> {t.name}
                      </span>
                    ))}
                    {temResto && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_SEM_DIVISAO }} /> Demais OS da franquia
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" /> Tendência de TMA e Ciclo de Triagem</p>
                      <p className="text-[11px] text-slate-500">Comparativo dos prazos com a meta (Meta ≤ {dec(metaStone, 2)}h Stone)</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap">Meta ≤ {dec(metaStone, 2)}h</span>
                  </div>
                  <div className="mt-3">{renderLinhas()}</div>
                </div>
              </div>

              {/* Desempenho dos Angels */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> Desempenho dos Angels — {franchise.name} ({periodo})</p>
                    <p className="text-[11px] text-slate-500">
                      Ordens de serviço{isAdmin ? ", salário base lançado e variável a receber" : ""} por técnico no período
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">{angelsCad.length} Angels em operação</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {angelsCad.map((a, i) => {
                    const os = osDoTecnico(a.id);
                    const meses = rows.filter((r) => (osPorTecnicoMes.get(`${a.id}|${r.year}-${r.month}`) ?? 0) > 0).length;
                    const salario = rows.reduce((s, r) => s + (recPorChave.get(`${a.id}|${r.year}-${r.month}`)?.baseSalary ?? 0), 0);
                    const variavel = rows.reduce((s, r) => s + (variavelDoMes(a.id, r.year, r.month)?.valor ?? 0), 0);
                    return (
                      <div key={a.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-7 h-7 rounded-lg text-white text-[11px] font-black flex items-center justify-center" style={{ background: PALETA[i % PALETA.length] }}>A{i + 1}</span>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{a.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Green Angel</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">OSs atendidas</p>
                            <p className="text-lg font-black text-slate-900">{inteiro(os)} <span className="text-[10px] font-bold text-slate-500">OS</span></p>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Média por mês</p>
                            <p className="text-lg font-black text-slate-900">{meses > 0 ? inteiro(Math.round(os / meses)) : "—"} <span className="text-[10px] font-bold text-slate-500">OS</span></p>
                          </div>
                          {isAdmin && (
                            <>
                              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2">
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Salário base lançado</p>
                                <p className="text-sm font-black text-slate-900">{salario > 0 ? brl(salario) : "—"}</p>
                              </div>
                              <div className="bg-emerald-600 rounded-xl px-3 py-2 text-white">
                                <p className="text-[9px] font-bold uppercase opacity-90 flex items-center justify-between">Variável a receber <DollarSign className="w-3 h-3" /></p>
                                <p className="text-sm font-black">{brl(variavel)}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela mês a mês */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">Tabela Detalhada Mês a Mês — {franchise.name}</p>
                    <p className="text-[11px] text-slate-500">Registros históricos de atendimentos, SLA, TMA e rebate</p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-900 text-white">{rows.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                        <th className="py-2.5 px-2 text-left">Mês / Ano</th>
                        {tecnicos.map((t) => (
                          <th key={t.id} className="py-2.5 px-2 text-center">OS {t.name}</th>
                        ))}
                        <th className="py-2.5 px-2 text-center">Total OS</th>
                        <th className="py-2.5 px-2 text-center">OS Stone</th>
                        <th className="py-2.5 px-2 text-center">OS Ton</th>
                        <th className="py-2.5 px-2 text-center">SLA Stone</th>
                        <th className="py-2.5 px-2 text-center">SLA Ton</th>
                        <th className="py-2.5 px-2 text-center">TMA Stone</th>
                        <th className="py-2.5 px-2 text-center">TMA Ton</th>
                        <th className="py-2.5 px-2 text-center">Ciclo triagem</th>
                        <th className="py-2.5 px-2 text-right">Rebate bruto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={`${r.year}-${r.month}`} className="border-b border-slate-100 hover:bg-slate-50/70">
                          <td className="py-2.5 px-2 font-bold text-slate-800 whitespace-nowrap">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                            {MESES[r.month - 1]} / {r.year}
                          </td>
                          {tecnicos.map((t) => {
                            const v = osPorTecnicoMes.get(`${t.id}|${r.year}-${r.month}`);
                            return <td key={t.id} className="py-2.5 px-2 text-center font-mono text-slate-600">{v ? `${inteiro(v)} OS` : "-"}</td>;
                          })}
                          <td className="py-2.5 px-2 text-center">
                            <span className="inline-block min-w-[2.5rem] text-[11px] font-black px-2 py-0.5 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800">
                              {r.totalServiceOrders > 0 ? inteiro(r.totalServiceOrders) : "-"}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-600">{r.osStone !== null ? inteiro(r.osStone) : "—"}</td>
                          <td className="py-2.5 px-2 text-center font-mono text-slate-600">{r.osTon !== null ? inteiro(r.osTon) : "—"}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">{pct(r.slaStone)}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">{pct(r.slaTon)}</td>
                          <td className="py-2.5 px-2 text-center">{chipTma(r.tmaStone, metaStone)}</td>
                          <td className="py-2.5 px-2 text-center">{chipTma(r.tmaTon, metaTon)}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">{horas(r.ciclo)}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">{r.rebate > 0 ? brl(r.rebate) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remuneração por Angel (só Admin) */}
              {isAdmin && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-600" /> Detalhamento de Remuneração Variável por Angel — {franchise.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Valores dos lançamentos salvos; nos meses sem lançamento, o variável é o calculado pelo sistema (marcado com *).
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">Variável total: {brl(variavelTotal)}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                          <th className="py-2.5 px-2 text-left">Mês / Ano</th>
                          <th className="py-2.5 px-2 text-left">Angel / Técnico</th>
                          <th className="py-2.5 px-2 text-right">OS atendidas</th>
                          <th className="py-2.5 px-2 text-right">Salário base</th>
                          <th className="py-2.5 px-2 text-right">Variável a receber</th>
                          <th className="py-2.5 px-2 text-right">Combustível</th>
                          <th className="py-2.5 px-2 text-right">Alimentação</th>
                          <th className="py-2.5 px-2 text-right">Manutenção</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasRemuneracao.length === 0 && (
                          <tr><td colSpan={8} className="py-6 text-center text-slate-400">Sem registros no período.</td></tr>
                        )}
                        {linhasRemuneracao.map(({ r, t, os, rec }) => {
                          const idx = tecnicos.findIndex((x) => x.id === t.id);
                          const v = variavelDoMes(t.id, r.year, r.month);
                          return (
                            <tr key={`${r.year}-${r.month}-${t.id}`} className="border-b border-slate-100">
                              <td className="py-2 px-2 font-bold text-slate-800 whitespace-nowrap">{MESES[r.month - 1]} / {r.year}</td>
                              <td className="py-2 px-2">
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md border" style={{ color: PALETA[idx % PALETA.length], borderColor: PALETA[idx % PALETA.length] }}>{t.name}</span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold">{os > 0 ? `${inteiro(os)} OS` : "-"}</td>
                              <td className="py-2 px-2 text-right font-mono">{rec && rec.baseSalary > 0 ? brl(rec.baseSalary) : "—"}</td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700">{v ? `${brl(v.valor)}${v.calculado ? " *" : ""}` : "—"}</td>
                              <td className="py-2 px-2 text-right font-mono">{rec && rec.fuelAllowance > 0 ? brl(rec.fuelAllowance) : "—"}</td>
                              <td className="py-2 px-2 text-right font-mono">{rec && rec.foodAllowance > 0 ? brl(rec.foodAllowance) : "—"}</td>
                              <td className="py-2 px-2 text-right font-mono">{rec && rec.maintenanceAllowance > 0 ? brl(rec.maintenanceAllowance) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!settings && (
        <p className="text-[11px] text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Metas não carregadas: usando 0,90h (Stone) e 2,50h (TON).</p>
      )}
    </div>
  );
};
