import React, { useEffect, useState } from "react";
import { Target, Calendar, CheckCircle2, XCircle, Clock, Filter, Search, Pencil, Building2 } from "lucide-react";
import * as api from "../../../services/api";
import { supabase } from "../../../services/supabaseClient";
import { Franchise, UserAgent } from "../../../types";

/**
 * Indicadores de Performance das Franquias (mês fechado).
 * TMA Stone, TMA TON e Ciclo de cada franquia são herdados por todos os Angels dela no cálculo da
 * remuneração variável. Esta tela só consulta: os números são lançados em
 * Remuneração Variável → Franquias & Rebate (um único lugar de lançamento).
 */

/** O cadastro às vezes guarda "RN - JOÃO CÂMARA" no campo da UF: aqui sempre sai só "RN". */
const ufDe = (regiao?: string): string => {
  const m = /^\s*([A-Za-z]{2})(?=\s*[-–/]|\s*$)/.exec(regiao ?? "");
  return m ? m[1].toUpperCase() : regiao ?? "";
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const dec = (v: number, casas: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const horas = (v: number | null) => (v === null ? "—" : dec(v, 2));
const inteiro = (v: number) => v.toLocaleString("pt-BR");
const bate = (v: number | null, meta: number, menorMelhor: boolean): boolean | null => (v === null ? null : menorMelhor ? v <= meta : v >= meta);
const ehAngel = (a: UserAgent) => (a.jobTitle || "").toLowerCase().includes("angel");
const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type Situacao = "CONFORME" | "RESSALVA" | "PENDENTE";
type Filtro = "TODAS" | Situacao;

const PersonAvatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 18 }) => {
  const [quebrada, setQuebrada] = useState(false);
  useEffect(() => setQuebrada(false), [url]);
  const dim = { width: size, height: size };
  if (url && !quebrada) return <img src={url} alt={name} style={dim} onError={() => setQuebrada(true)} className="rounded-full object-cover border border-emerald-300 bg-white flex-shrink-0" />;
  return (
    <div aria-hidden="true" style={{ ...dim, fontSize: Math.max(7, Math.round(size * 0.4)) }} className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black flex-shrink-0">
      {name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
    </div>
  );
};

const FranchiseAvatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 28 }) => {
  const [quebrada, setQuebrada] = useState(false);
  useEffect(() => setQuebrada(false), [url]);
  const dim = { width: size, height: size };
  if (url && !quebrada) return <img src={url} alt={name} style={dim} onError={() => setQuebrada(true)} className="rounded-full object-cover border border-slate-200 bg-white flex-shrink-0" />;
  return (
    <div aria-hidden="true" style={{ ...dim, fontSize: Math.max(8, Math.round(size * 0.34)) }} className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black flex-shrink-0">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
};

export const PerformanceIndicators: React.FC<{ onEditar?: () => void }> = ({ onEditar }) => {
  const agora = new Date();
  const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<api.FranchiseHistoryRow[]>([]);
  const [settings, setSettings] = useState<api.CompensationSettings | null>(null);
  const [reversa, setReversa] = useState<Record<string, boolean> | null>(null);
  const [ano, setAno] = useState(mesAnterior.getFullYear());
  const [mes, setMes] = useState(mesAnterior.getMonth() + 1);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [busca, setBusca] = useState("");

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
        const [f, a, ph, hist, st, rev] = await Promise.all([
          api.fetchFranchises(),
          api.fetchAgents(),
          api.fetchFranchisePhotos().catch(() => ({} as Record<string, string>)),
          api.fetchFranchiseHistory(),
          api.fetchCompensationSettings(),
          api.fetchReverseFlags().catch(() => null as Record<string, boolean> | null),
        ]);
        if (cancelado) return;
        setIsAdmin(admin);
        setFranchises(f);
        setAgents(a);
        setPhotos(ph);
        setRows(hist);
        setSettings(st);
        setReversa(rev);
      } catch (e) {
        console.error(e);
        if (!cancelado) setErro("Não foi possível carregar os indicadores.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  if (loading) return <p className="text-xs text-slate-500">Carregando indicadores...</p>;
  if (erro || !settings) return <p className="text-xs text-red-600">{erro ?? "Não foi possível carregar as regras e metas."}</p>;

  const s = settings;
  const anos = [agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1];
  const ehMesAnterior = ano === mesAnterior.getFullYear() && mes === mesAnterior.getMonth() + 1;
  const periodo = `${MESES[mes - 1]} de ${ano}`;
  const franquias = [...franchises].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const metaTxt = `≤${dec(s.tmaStoneTarget, 2)}h | ≤${dec(s.tmaTonTarget, 2)}h | ≤${dec(s.cicloTarget, 2)}h`;

  // percentual que cada Angel herda: mesma regra do cálculo oficial (calculate_angel_variable_pct)
  const pctAngel = (h: { s: boolean | null; t: boolean | null; c: boolean | null }, faz: boolean) =>
    faz
      ? (h.s ? s.pctTmaStoneReversa : 0) + (h.t ? s.pctTmaTonReversa : 0) + (h.c ? s.pctCicloReversa : 0)
      : (h.s ? s.pctTmaStoneNormal : 0) + (h.t ? s.pctTmaTonNormal : 0);
  const maxAngel = (faz: boolean) => (faz ? s.pctTmaStoneReversa + s.pctTmaTonReversa + s.pctCicloReversa : s.pctTmaStoneNormal + s.pctTmaTonNormal);

  const cartoes = franquias.map((f) => {
    const ind = rows.find((r) => r.franchiseId === f.id && r.year === ano && r.month === mes) ?? null;
    const angels = agents.filter((a) => a.franchiseName === f.name && ehAngel(a)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const precisaCiclo = reversa ? angels.some((a) => reversa[a.id]) : true;
    const h = {
      s: ind ? bate(ind.tmaStone, s.tmaStoneTarget, s.tmaStoneLowerIsBetter) : null,
      t: ind ? bate(ind.tmaTon, s.tmaTonTarget, s.tmaTonLowerIsBetter) : null,
      c: ind ? bate(ind.ciclo, s.cicloTarget, s.cicloLowerIsBetter) : null,
    };
    const aplicaveis = [h.s, h.t, ...(precisaCiclo || h.c !== null ? [h.c] : [])];
    const faltando = !ind || h.s === null || h.t === null || (precisaCiclo && h.c === null);
    const situacao: Situacao = faltando ? "PENDENTE" : aplicaveis.every((x) => x === true) ? "CONFORME" : "RESSALVA";
    return { f, ind, angels, precisaCiclo, h, situacao, atingidas: aplicaveis.filter((x) => x === true).length, total: aplicaveis.length };
  });

  const nConformes = cartoes.filter((c) => c.situacao === "CONFORME").length;
  const nRessalva = cartoes.filter((c) => c.situacao === "RESSALVA").length;
  const nPendentes = cartoes.filter((c) => c.situacao === "PENDENTE").length;
  const mediaDe = (xs: (number | null)[]) => {
    const ok = xs.filter((x): x is number => x !== null);
    return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  };
  const mStone = mediaDe(cartoes.map((c) => c.ind?.tmaStone ?? null));
  const mTon = mediaDe(cartoes.map((c) => c.ind?.tmaTon ?? null));
  const mCiclo = mediaDe(cartoes.map((c) => c.ind?.ciclo ?? null));
  const buscaN = semAcento(busca.trim());
  const visiveis = cartoes
    .filter((c) => filtro === "TODAS" || c.situacao === filtro)
    .filter((c) => !buscaN || semAcento(`${c.f.name} ${c.f.cityRegion}`).includes(buscaN));

  const corMedia = (v: number | null, meta: number, menor: boolean) => (v === null ? "text-slate-500" : bate(v, meta, menor) ? "text-emerald-600" : "text-red-600");

  const caixa = (rotulo: string, meta: number, menor: boolean, valor: number | null, ok: boolean | null, nota: string, naoSeAplica = false) => (
    <div className={`rounded-xl border px-3 py-2.5 ${naoSeAplica ? "bg-slate-50 border-slate-200" : ok === null ? "bg-slate-50 border-slate-200" : ok ? "bg-emerald-50/70 border-emerald-200" : "bg-red-50/70 border-red-200"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-extrabold text-slate-800">
          {rotulo} <span className="font-medium text-slate-400">(Meta: {menor ? "≤" : "≥"} {dec(meta, 2)}h)</span>
        </p>
        {naoSeAplica ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 whitespace-nowrap">Não se aplica</span>
        ) : ok === null ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 whitespace-nowrap">Sem dado</span>
        ) : ok ? (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 whitespace-nowrap inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Atingido</span>
        ) : (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 whitespace-nowrap inline-flex items-center gap-1"><XCircle className="w-3 h-3" /> Não atingido</span>
        )}
      </div>
      <div className="flex items-end justify-between mt-1">
        <p className="font-mono text-xl font-black text-slate-900">{horas(valor)} <span className="text-[10px] font-bold text-slate-400">h</span></p>
        <p className="text-[9px] text-slate-500 text-right">{nota}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full uppercase">
              <Target className="w-3 h-3" /> Hermes Performance • Módulo Indicadores
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full uppercase">
              <Calendar className="w-3 h-3" /> {ehMesAnterior ? "Mês anterior (competência fechada)" : "Consulta de competência"}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white mt-3">
            Indicadores de Performance das Franquias <span className="text-emerald-400">({periodo})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Aqui ficam consolidados os indicadores do mês fechado de cada franquia. TMA Stone, TMA Ton e Ciclo de Triagem apurados pela unidade são
            herdados por todos os Angels da franquia no cálculo da Remuneração Variável. Tela só de consulta: para lançar ou corrigir, use{" "}
            <b className="text-slate-200">Remuneração Variável → Franquias & Rebate</b>.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[17rem]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-extrabold text-slate-300 uppercase flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Mês de referência</p>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${ehMesAnterior ? "bg-emerald-500 text-white" : "bg-slate-600 text-slate-200"}`}>
              {ehMesAnterior ? "VIGENTE (MÊS ANTERIOR)" : "CONSULTA"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <label className="block">
              <span className="block text-[9px] font-bold text-slate-400 mb-1">Mês fechado</span>
              <select aria-label="Mês" value={mes} onChange={(e) => setMes(Number(e.target.value))} className="w-full bg-slate-800 border border-white/10 text-white text-xs font-bold rounded-lg px-2.5 py-2">
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[9px] font-bold text-slate-400 mb-1">Ano</span>
              <select aria-label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} className="w-full bg-slate-800 border border-white/10 text-white text-xs font-bold rounded-lg px-2.5 py-2">
                {anos.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Metas padrão: <span className="font-mono font-bold text-emerald-300">{metaTxt}</span>
          </p>
        </div>
      </div>

      {/* Cartões de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between"><p className="text-[10px] font-extrabold text-slate-500">Competência</p><Calendar className="w-4 h-4 text-emerald-500" /></div>
          <p className="mt-2 text-lg font-black text-slate-900">{periodo}</p>
          <p className="text-[10px] font-bold text-emerald-600">{ehMesAnterior ? "Mês fechado / Anterior" : "Consulta"}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between"><p className="text-[10px] font-extrabold text-slate-500">100% Conformes</p><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
          <p className="mt-2 text-lg font-black text-emerald-600">
            {nConformes} / {cartoes.length} ({cartoes.length ? Math.round((nConformes / cartoes.length) * 100) : 0}%)
          </p>
          <p className="text-[10px] text-slate-500">Todas as metas da franquia batidas</p>
        </div>
        {(
          [
            ["Média TMA Stone", mStone, s.tmaStoneTarget, s.tmaStoneLowerIsBetter],
            ["Média TMA Ton", mTon, s.tmaTonTarget, s.tmaTonLowerIsBetter],
            ["Média Ciclo Triagem", mCiclo, s.cicloTarget, s.cicloLowerIsBetter],
          ] as const
        ).map(([rotulo, v, meta, menor]) => (
          <div key={rotulo} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between"><p className="text-[10px] font-extrabold text-slate-500">{rotulo}</p><Clock className="w-4 h-4 text-slate-400" /></div>
            <p className={`mt-2 text-lg font-black ${corMedia(v, meta, menor)}`}>{v === null ? "—" : `${dec(v, 2)}h`}</p>
            <p className="text-[10px] text-slate-500">Meta global: {menor ? "≤" : "≥"} {dec(meta, 2)}h</p>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Filtrar status:</span>
          {(
            [
              ["TODAS", `Todas (${cartoes.length})`, "bg-slate-900 text-white border-slate-900", "bg-white text-slate-700 border-slate-200"],
              ["CONFORME", `100% Conformes (${nConformes})`, "bg-emerald-600 text-white border-emerald-600", "bg-emerald-50 text-emerald-700 border-emerald-200"],
              ["RESSALVA", `Com Ressalva (${nRessalva})`, "bg-amber-500 text-white border-amber-500", "bg-amber-50 text-amber-700 border-amber-200"],
              ...(nPendentes > 0 ? [["PENDENTE", `Pendentes (${nPendentes})`, "bg-slate-600 text-white border-slate-600", "bg-slate-50 text-slate-600 border-slate-200"] as const] : []),
            ] as ReadonlyArray<readonly [Filtro, string, string, string]>
          ).map(([id, rotulo, ativo, inativo]) => (
            <button key={id} onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border ${filtro === id ? ativo : inativo}`}>
              {rotulo}
            </button>
          ))}
        </div>
        <div className="relative lg:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input aria-label="Buscar franquia" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar franquia ou cidade..." className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs" />
        </div>
      </div>

      {visiveis.length === 0 && <p className="text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">Nenhuma franquia encontrada com esse filtro.</p>}

      {/* Cartões por franquia */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visiveis.map((c) => {
          const borda = c.situacao === "CONFORME" ? "border-emerald-300" : c.situacao === "RESSALVA" ? "border-amber-300" : "border-slate-200";
          return (
            <div key={c.f.id} data-franquia={c.f.name} className={`bg-white border-2 ${borda} rounded-3xl p-4 space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md uppercase">
                  <Calendar className="w-3 h-3" /> {periodo}{ehMesAnterior ? " (mês anterior)" : ""}
                </span>
                {c.situacao === "CONFORME" && <span className="text-[9px] font-extrabold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Conforme (100%)</span>}
                {c.situacao === "RESSALVA" && <span className="text-[9px] font-extrabold px-2 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300 uppercase">Possui ressalva</span>}
                {c.situacao === "PENDENTE" && <span className="text-[9px] font-extrabold px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-300 uppercase">{c.ind ? "Dados pendentes" : "Sem lançamento"}</span>}
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FranchiseAvatar name={c.f.name} url={photos[c.f.id]} size={34} />
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">Franquia {c.f.name}</p>
                    <p className="text-[10px] text-slate-500">{c.f.name}/{ufDe(c.f.cityRegion)}</p>
                  </div>
                </div>
                {isAdmin && onEditar && (
                  <button aria-label={`Editar indicadores de ${c.f.name}`} title="Editar em Remuneração Variável" onClick={onEditar} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-[11px] font-bold text-slate-600">Metas atingidas:</span>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${c.situacao === "CONFORME" ? "bg-emerald-100 text-emerald-700" : c.situacao === "RESSALVA" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                  {c.ind ? `${c.atingidas} / ${c.total}` : "—"}
                </span>
              </div>

              {caixa("TMA Stone", s.tmaStoneTarget, s.tmaStoneLowerIsBetter, c.ind?.tmaStone ?? null, c.h.s, c.h.s ? `vale ${dec(s.pctTmaStoneReversa, 1)}% (reversa) · ${dec(s.pctTmaStoneNormal, 1)}% (campo)` : c.h.s === false ? "+0,0% de bônus" : "")}
              {caixa("TMA Ton", s.tmaTonTarget, s.tmaTonLowerIsBetter, c.ind?.tmaTon ?? null, c.h.t, c.h.t ? `vale ${dec(s.pctTmaTonReversa, 1)}% (reversa) · ${dec(s.pctTmaTonNormal, 1)}% (campo)` : c.h.t === false ? "+0,0% de bônus" : "")}
              {caixa("Ciclo de Triagem", s.cicloTarget, s.cicloLowerIsBetter, c.ind?.ciclo ?? null, c.h.c, c.h.c ? `vale ${dec(s.pctCicloReversa, 1)}% (só reversa)` : c.h.c === false ? "+0,0% de bônus" : "", !c.precisaCiclo && c.h.c === null)}

              <div>
                <p className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-1.5 mb-1.5">
                  <Building2 className="w-3 h-3" /> Angels que herdaram estes KPIs ({c.angels.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {c.angels.length === 0 && <span className="text-[10px] text-slate-400">Nenhum Green Angel cadastrado nesta franquia.</span>}
                  {c.angels.map((a) => {
                    const faz = reversa ? !!reversa[a.id] : null;
                    const pct = c.ind && faz !== null && c.h.s !== null && c.h.t !== null ? pctAngel(c.h, faz) : null;
                    return (
                      <span key={a.id} title={faz === null ? a.name : `${a.name}: ${faz ? "faz" : "não faz"} logística reversa (máximo ${dec(maxAngel(faz), 1)}%)`} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full pl-1 pr-2 py-0.5 text-[10px] font-bold text-slate-700">
                        <PersonAvatar name={a.name} url={a.avatarUrl} size={18} />
                        {a.name}
                        <span className={pct === null ? "text-slate-400" : "text-emerald-700"}>{pct === null ? "—" : `+${dec(pct, 1)}%`}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Base {MESES[mes - 1]} de {ano}</span>
                <span className="font-extrabold text-slate-700">Total OS: {c.ind && c.ind.totalServiceOrders > 0 ? inteiro(c.ind.totalServiceOrders) : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
