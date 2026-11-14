import React, { useEffect, useState } from "react";
import { Award, Plus, X, Pencil, Search, Check, RotateCcw, AlertTriangle, Users, Clock, XCircle, DollarSign } from "lucide-react";
import * as api from "../../../services/api";
import { supabase } from "../../../services/supabaseClient";
import { Franchise, UserAgent } from "../../../types";

/**
 * Programa Camisa 10: indicação e credenciamento de novos clientes.
 * É o ÚNICO lugar de cadastro e aprovação das indicações; tudo é lido e gravado no banco.
 * O Angel cadastra a dele (fica em análise); o Admin cadastra para qualquer agente, aprova, rejeita e corrige.
 */

/** O cadastro às vezes guarda "RN - JOÃO CÂMARA" no campo da UF: aqui sempre sai só "RN". */
const ufDe = (regiao?: string): string => {
  const m = /^\s*([A-Za-z]{2})(?=\s*[-–/]|\s*$)/.exec(regiao ?? "");
  return m ? m[1].toUpperCase() : regiao ?? "";
};

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const semAcento = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const iniciais = (nome: string) => nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const dataBR = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

// ---------------------------------------------------------------- regras da ficha (exportadas para teste)
export const normalizarStoneCode = (s: string) => s.trim().replace(/\s+/g, "").toUpperCase();
export const stoneCodeValido = (s: string) => /^[A-Z0-9._-]{3,30}$/.test(s);
/** "(83) 99881-0000", "83998810000" ou "+55 83 99881-0000" -> "83998810000"; inválido -> null. */
export function normalizarTelefone(s: string): string | null {
  let d = (s ?? "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}
export function formatarTelefone(d: string): string {
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export interface FormIndicacao {
  id: string | null; // preenchido quando é edição
  agentId: string;
  stoneCode: string;
  clientName: string;
  clientCity: string;
  clientPhone: string;
  notes: string;
  status: "PENDENTE" | "APROVADO";
  incluirTodos: boolean; // mostrar também coordenadores, sócios e demais na lista de agentes
  cidadeEditada: boolean;
  erro: string | null;
}

/** Confere a ficha antes de gravar. Devolve a mensagem do primeiro problema, ou null se está tudo certo. */
export function validarFicha(f: FormIndicacao, leads: api.Camisa10Lead[], agentes: UserAgent[]): string | null {
  if (!f.agentId) return "Selecione o agente que indicou o cliente.";
  const code = normalizarStoneCode(f.stoneCode);
  if (!code) return "Informe o Stone Code do cliente.";
  if (!stoneCodeValido(code)) return "Stone Code inválido: use de 3 a 30 letras, números, ponto, hífen ou sublinhado (sem espaços).";
  if (f.clientName.trim().length < 2) return "Informe o nome do cliente ou a razão social.";
  if (!f.clientPhone.trim()) return "Informe o telefone do cliente.";
  if (!normalizarTelefone(f.clientPhone)) return "Telefone inválido: informe DDD + número (ex.: (83) 99881-0000).";
  const repetida = leads.find((l) => l.id !== f.id && l.status !== "REJEITADO" && l.stoneCode && normalizarStoneCode(l.stoneCode) === code);
  if (repetida) {
    const quem = agentes.find((a) => a.id === repetida.agentId)?.name;
    const situacao = repetida.status === "APROVADO" ? "já credenciada" : "em análise";
    return `Este Stone Code já foi indicado${quem ? ` por ${quem}` : ""} em ${dataBR(repetida.createdAt)} (${situacao}).`;
  }
  return null;
}

const PersonAvatar: React.FC<{ name: string; url?: string; size?: number }> = ({ name, url, size = 28 }) => {
  const [quebrada, setQuebrada] = useState(false);
  useEffect(() => setQuebrada(false), [url]);
  const dim = { width: size, height: size };
  if (url && !quebrada) return <img src={url} alt={name} style={dim} onError={() => setQuebrada(true)} className="rounded-full object-cover border-2 border-emerald-300 bg-white flex-shrink-0" />;
  return (
    <div aria-hidden="true" style={{ ...dim, fontSize: Math.max(8, Math.round(size * 0.36)) }} className="rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center font-black flex-shrink-0">
      {iniciais(name)}
    </div>
  );
};

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300";

type FiltroStatus = "TODAS" | "PENDENTE" | "APROVADO" | "REJEITADO";

export const PerformanceCamisa10: React.FC = () => {
  const agora = new Date();
  const [loading, setLoading] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [meId, setMeId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [agents, setAgents] = useState<UserAgent[]>([]);
  const [settings, setSettings] = useState<api.CompensationSettings | null>(null);
  const [leads, setLeads] = useState<api.Camisa10Lead[]>([]);
  const [filtro, setFiltro] = useState<FiltroStatus>("TODAS");
  const [mes, setMes] = useState(0); // 0 = todos os meses
  const [ano, setAno] = useState(agora.getFullYear());
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormIndicacao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const showToast = (type: "ok" | "err", text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        let admin = false;
        let id = "";
        if (data.user) {
          id = data.user.id;
          try {
            admin = String((await api.fetchMyProfile(data.user.id)).role) === "ADMIN";
          } catch {
            admin = false;
          }
        }
        const [f, a, st, ls] = await Promise.all([api.fetchFranchises(), api.fetchAgents(), api.fetchCompensationSettings(), api.fetchCamisa10Leads()]);
        if (cancelado) return;
        setMeId(id);
        setIsAdmin(admin);
        setFranchises(f);
        setAgents(a);
        setSettings(st);
        setLeads(ls);
      } catch (e) {
        console.error(e);
        if (!cancelado) setErroCarga("Não foi possível carregar as indicações.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  if (loading) return <p className="text-xs text-slate-500">Carregando indicações...</p>;
  if (erroCarga || !settings) return <p className="text-xs text-red-600">{erroCarga ?? "Não foi possível carregar as regras."}</p>;

  const bonus = settings.camisa10BonusAmount;
  const agentePorId = new Map(agents.map((a) => [a.id, a]));
  const franquiaDe = (a?: UserAgent) => (a ? franchises.find((f) => f.name === a.franchiseName) : undefined);
  const cidadeDoAgente = (a?: UserAgent) => {
    const f = franquiaDe(a);
    return f ? `${f.name}/${ufDe(f.cityRegion)}` : "";
  };

  // ---- filtros e resumo
  const noPeriodo = (l: api.Camisa10Lead) => {
    if (mes === 0) return true;
    const d = new Date(l.createdAt);
    return !isNaN(d.getTime()) && d.getFullYear() === ano && d.getMonth() + 1 === mes;
  };
  const doPeriodo = leads.filter(noPeriodo);
  const aprovadas = doPeriodo.filter((l) => l.status === "APROVADO");
  const emAnalise = doPeriodo.filter((l) => l.status === "PENDENTE");
  const rejeitadas = doPeriodo.filter((l) => l.status === "REJEITADO");
  const bonusLiberado = aprovadas.reduce((s, l) => s + (l.bonusAmount ?? bonus), 0);
  const buscaN = semAcento(busca.trim());
  const buscaDigitos = busca.replace(/\D/g, "");
  const visiveis = doPeriodo
    .filter((l) => filtro === "TODAS" || l.status === filtro)
    .filter((l) => {
      if (!buscaN) return true;
      const alvo = semAcento(`${l.stoneCode ?? ""} ${l.clientName ?? l.leadDescription} ${l.clientCity ?? ""} ${agentePorId.get(l.agentId)?.name ?? ""}`);
      return alvo.includes(buscaN) || (buscaDigitos.length >= 4 && (l.clientPhone ?? "").includes(buscaDigitos));
    });
  const ranking = agents
    .map((a) => {
      const ls = aprovadas.filter((l) => l.agentId === a.id);
      return { a, n: ls.length, total: ls.reduce((s, l) => s + (l.bonusAmount ?? bonus), 0) };
    })
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n || x.a.name.localeCompare(y.a.name, "pt-BR"))
    .slice(0, 10);

  // ---- ficha: abrir, editar, salvar
  const abrirNovo = () => {
    const eu = agentePorId.get(meId);
    setForm({
      id: null,
      agentId: isAdmin ? "" : meId,
      stoneCode: "",
      clientName: "",
      clientCity: isAdmin ? "" : cidadeDoAgente(eu),
      clientPhone: "",
      notes: "",
      status: "PENDENTE",
      incluirTodos: false,
      cidadeEditada: false,
      erro: null,
    });
  };
  const abrirEdicao = (l: api.Camisa10Lead) =>
    setForm({
      id: l.id,
      agentId: l.agentId,
      stoneCode: l.stoneCode ?? "",
      clientName: l.clientName ?? l.leadDescription,
      clientCity: l.clientCity ?? "",
      clientPhone: l.clientPhone ? formatarTelefone(l.clientPhone) : "",
      notes: l.notes ?? "",
      status: l.status === "APROVADO" ? "APROVADO" : "PENDENTE",
      incluirTodos: true,
      cidadeEditada: true,
      erro: null,
    });
  const mudarAgente = (id: string) => {
    if (!form) return;
    setForm({ ...form, agentId: id, clientCity: form.cidadeEditada ? form.clientCity : cidadeDoAgente(agentePorId.get(id)), erro: null });
  };
  const salvar = async () => {
    if (!form) return;
    const erro = validarFicha(form, leads, agents);
    if (erro) {
      setForm({ ...form, erro });
      return;
    }
    const ficha: api.FichaCamisa10 = {
      agentId: form.agentId,
      stoneCode: normalizarStoneCode(form.stoneCode),
      clientName: form.clientName.trim(),
      clientCity: form.clientCity.trim(),
      clientPhone: normalizarTelefone(form.clientPhone) as string,
      notes: form.notes.trim(),
    };
    setSalvando(true);
    try {
      if (form.id) {
        const atualizada = await api.updateCamisa10Indication(form.id, ficha);
        setLeads((prev) => prev.map((l) => (l.id === atualizada.id ? atualizada : l)));
        showToast("ok", "Indicação atualizada.");
      } else {
        const nova = await api.createCamisa10Indication(ficha, isAdmin ? form.status : "PENDENTE", bonus);
        setLeads((prev) => [nova, ...prev]);
        showToast("ok", nova.status === "APROVADO" ? "Indicação cadastrada e já credenciada." : "Indicação cadastrada e enviada para análise.");
      }
      setForm(null);
    } catch (e: any) {
      console.error(e);
      const texto =
        e?.code === "23505"
          ? "Este Stone Code já tem uma indicação em análise ou credenciada."
          : e?.code === "42501" || /row-level security/i.test(e?.message ?? "")
          ? "Você não tem permissão para cadastrar esta indicação."
          : "Não foi possível salvar a indicação.";
      setForm({ ...form, erro: texto });
    } finally {
      setSalvando(false);
    }
  };

  // ---- decisões do Admin
  const decidir = async (l: api.Camisa10Lead, acao: "APROVADO" | "REJEITADO" | "PENDENTE") => {
    try {
      const nova = acao === "PENDENTE" ? await api.setCamisa10Pending(l.id) : await api.reviewCamisa10Lead(l.id, acao, acao === "APROVADO" ? bonus : undefined);
      setLeads((prev) => prev.map((x) => (x.id === nova.id ? nova : x)));
      showToast("ok", acao === "APROVADO" ? "Indicação credenciada." : acao === "REJEITADO" ? "Indicação rejeitada." : "Indicação voltou para análise.");
    } catch (e) {
      console.error(e);
      showToast("err", "Não foi possível alterar a indicação.");
    }
  };

  // ---- lista de agentes agrupada por franquia
  const opcoesAgentes = (() => {
    if (!form) return [] as { franquia: string; itens: UserAgent[] }[];
    const base = isAdmin
      ? agents.filter((a) => form.incluirTodos || String(a.role) === "AGENTE_CAMPO" || a.id === form.agentId)
      : agents.filter((a) => a.id === meId);
    const grupos = new Map<string, UserAgent[]>();
    base.forEach((a) => grupos.set(a.franchiseName || "Sem franquia", [...(grupos.get(a.franchiseName || "Sem franquia") ?? []), a]));
    return [...grupos.entries()]
      .sort((x, y) => x[0].localeCompare(y[0], "pt-BR"))
      .map(([franquia, itens]) => ({ franquia, itens: itens.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) }));
  })();

  const statusChip = (s: api.Camisa10Lead["status"]) =>
    s === "APROVADO" ? (
      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">Credenciado</span>
    ) : s === "REJEITADO" ? (
      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">Rejeitada</span>
    ) : (
      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">Em análise</span>
    );

  const kpi = (rotulo: string, icone: React.ReactNode, valor: React.ReactNode, sub: string, destaque = false) => (
    <div className={`rounded-2xl border p-4 ${destaque ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">{rotulo}</p>
        <span className={destaque ? "text-emerald-600" : "text-slate-400"}>{icone}</span>
      </div>
      <p className={`mt-2 text-xl font-black ${destaque ? "text-emerald-700" : "text-slate-900"}`}>{valor}</p>
      <p className="mt-0.5 text-[10px] font-bold text-slate-500">{sub}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {toast && <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>{toast.text}</div>}

      {/* Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
            <Award className="w-3.5 h-3.5" /> Hermes Performance • Programa Camisa 10
          </p>
          <h2 className="text-2xl font-black text-white mt-1.5">Programa Camisa 10</h2>
          <p className="text-xs text-slate-400 mt-1.5">
            Indicação e credenciamento de novos clientes. Cada indicação credenciada rende {brl(bonus)} ao agente. O Angel cadastra a dele e o Admin aprova.
          </p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold whitespace-nowrap">
          <Plus className="w-4 h-4" /> Cadastrar Indicação Camisa 10
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {kpi("Total credenciados", <Award className="w-4 h-4" />, `${aprovadas.length} ${aprovadas.length === 1 ? "Cliente" : "Clientes"}`, `Bônus liberado: ${brl(bonusLiberado)}`, true)}
        {kpi("Em análise", <Clock className="w-4 h-4" />, `${emAnalise.length} ${emAnalise.length === 1 ? "Lead" : "Leads"}`, "Aguardando aprovação do Admin")}
        {kpi("Rejeitadas", <XCircle className="w-4 h-4" />, `${rejeitadas.length}`, "Não liberam bônus")}
        {kpi("Valor do bônus por credenciamento", <DollarSign className="w-4 h-4" />, brl(bonus), "Altere em Remuneração → Regras e Metas")}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Histórico */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-3xl p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">Histórico de Indicações Camisa 10</p>
              <p className="text-[11px] text-slate-500">Mostrando {visiveis.length} de {doPeriodo.length} indicações</p>
            </div>
            <div className="flex items-center gap-2">
              <select aria-label="Mês" value={mes} onChange={(e) => setMes(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white">
                <option value={0}>Todos os meses</option>
                {MESES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select aria-label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))} disabled={mes === 0} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-white disabled:opacity-50">
                {[agora.getFullYear() - 1, agora.getFullYear(), agora.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["TODAS", `Todas (${doPeriodo.length})`],
                  ["PENDENTE", `Em análise (${emAnalise.length})`],
                  ["APROVADO", `Credenciadas (${aprovadas.length})`],
                  ["REJEITADO", `Rejeitadas (${rejeitadas.length})`],
                ] as const
              ).map(([id, rotulo]) => (
                <button key={id} onClick={() => setFiltro(id)} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold border ${filtro === id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
                  {rotulo}
                </button>
              ))}
            </div>
            <div className="relative md:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input aria-label="Buscar indicação" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Stone Code, cliente ou agente..." className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-xs" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-extrabold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <th className="py-2.5 px-2">Stone Code</th>
                  <th className="py-2.5 px-2">Nome do cliente</th>
                  <th className="py-2.5 px-2">Telefone</th>
                  <th className="py-2.5 px-2">Agente</th>
                  <th className="py-2.5 px-2">Data</th>
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2 text-right">Bônus</th>
                  {isAdmin && <th className="py-2.5 px-2 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400">
                      {leads.length === 0 ? "Nenhuma indicação cadastrada ainda. Use “Cadastrar Indicação Camisa 10”." : "Nenhuma indicação encontrada com esse filtro."}
                    </td>
                  </tr>
                )}
                {visiveis.map((l) => {
                  const ag = agentePorId.get(l.agentId);
                  const nome = l.clientName ?? l.leadDescription;
                  return (
                    <tr key={l.id} data-indicacao={l.stoneCode ?? l.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-800">{l.stoneCode ?? "—"}</td>
                      <td className="py-2.5 px-2">
                        <p className="font-extrabold text-slate-900">{nome}</p>
                        {l.clientCity && <p className="text-[10px] text-slate-500">{l.clientCity}</p>}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-600 whitespace-nowrap">{l.clientPhone ? formatarTelefone(l.clientPhone) : "—"}</td>
                      <td className="py-2.5 px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <PersonAvatar name={ag?.name ?? "?"} url={ag?.avatarUrl} size={24} />
                          <span>
                            <span className="block font-bold text-slate-800">{ag?.name ?? "—"}</span>
                            <span className="block text-[10px] text-slate-500">{ag?.franchiseName ?? ""}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">{dataBR(l.createdAt)}</td>
                      <td className="py-2.5 px-2">{statusChip(l.status)}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-700">{l.status === "APROVADO" ? brl(l.bonusAmount ?? bonus) : "—"}</td>
                      {isAdmin && (
                        <td className="py-2.5 px-2 text-right whitespace-nowrap">
                          {l.status === "PENDENTE" && (
                            <>
                              <button aria-label={`Aprovar indicação de ${nome}`} title="Credenciar" onClick={() => decidir(l, "APROVADO")} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"><Check className="w-4 h-4" /></button>
                              <button aria-label={`Rejeitar indicação de ${nome}`} title="Rejeitar" onClick={() => decidir(l, "REJEITADO")} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"><X className="w-4 h-4" /></button>
                            </>
                          )}
                          {l.status !== "PENDENTE" && (
                            <button aria-label={`Voltar para análise a indicação de ${nome}`} title="Voltar para análise" onClick={() => decidir(l, "PENDENTE")} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><RotateCcw className="w-4 h-4" /></button>
                          )}
                          <button aria-label={`Editar indicação de ${nome}`} title="Editar" onClick={() => abrirEdicao(l)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50"><Pencil className="w-4 h-4" /></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-600" /> Ranking Camisa 10 (credenciamentos)</p>
          <p className="text-[11px] text-slate-500 mb-3">{mes === 0 ? "Todos os meses" : `${MESES[mes - 1]}/${ano}`}</p>
          {ranking.length === 0 && <p className="text-xs text-slate-400 py-6 text-center">Nenhum credenciamento no período.</p>}
          <div className="space-y-2">
            {ranking.map((x, i) => (
              <div key={x.a.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-200 text-slate-700" : i === 2 ? "bg-orange-300 text-orange-900" : "bg-slate-100 text-slate-500"}`}>{i + 1}º</span>
                <PersonAvatar name={x.a.name} url={x.a.avatarUrl} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{x.a.name}</p>
                  <p className="text-[10px] text-slate-500">{x.a.franchiseName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-emerald-700">{x.n} {x.n === 1 ? "credenciado" : "credenciados"}</p>
                  <p className="text-[10px] text-slate-500">{brl(x.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ficha da indicação */}
      {form && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-label="Nova Indicação Camisa 10">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-3.5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" /> {form.id ? "Editar Indicação Camisa 10" : "Nova Indicação Camisa 10"}
              </p>
              <button aria-label="Fechar" onClick={() => setForm(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="border-t border-slate-100" />

            <label className="block">
              <span className="block text-xs font-bold text-slate-700 mb-1">Stone Code do Cliente *</span>
              <input className={`${inputCls} font-mono`} placeholder="Ex: ST-881290" value={form.stoneCode} onChange={(e) => setForm({ ...form, stoneCode: e.target.value, erro: null })} />
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 mb-1">Nome do Cliente / Razão Social *</span>
              <input className={inputCls} placeholder="Ex: Mercado Central Ltda" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value, erro: null })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Cidade</span>
                <input className={inputCls} value={form.clientCity} onChange={(e) => setForm({ ...form, clientCity: e.target.value, cidadeEditada: true, erro: null })} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-700 mb-1">Telefone *</span>
                <input
                  className={inputCls}
                  inputMode="tel"
                  placeholder="(83) 99881-0000"
                  value={form.clientPhone}
                  onChange={(e) => setForm({ ...form, clientPhone: e.target.value, erro: null })}
                  onBlur={() => {
                    const d = normalizarTelefone(form.clientPhone);
                    if (d) setForm({ ...form, clientPhone: formatarTelefone(d) });
                  }}
                />
              </label>
            </div>
            <div className="block">
              <span className="block text-xs font-bold text-slate-700 mb-1">Agente Comercial (Angel)</span>
              <select aria-label="Agente que indicou" className={inputCls} value={form.agentId} disabled={!isAdmin} onChange={(e) => mudarAgente(e.target.value)}>
                <option value="">Selecione o agente que indicou...</option>
                {opcoesAgentes.map((g) => (
                  <optgroup key={g.franquia} label={g.franquia}>
                    {g.itens.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.jobTitle || "Agente"}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {isAdmin && (
                <label className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                  <input type="checkbox" checked={form.incluirTodos} onChange={(e) => setForm({ ...form, incluirTodos: e.target.checked })} />
                  Mostrar também coordenadores, sócios e demais na lista
                </label>
              )}
            </div>
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 mb-1">Status Inicial</span>
              <select aria-label="Status inicial" className={inputCls} value={isAdmin ? form.status : "PENDENTE"} disabled={!isAdmin || !!form.id} onChange={(e) => setForm({ ...form, status: e.target.value as "PENDENTE" | "APROVADO" })}>
                <option value="PENDENTE">Aguardando Análise</option>
                <option value="APROVADO">Credenciado (já aprovado)</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-bold text-slate-700 mb-1">Observações</span>
              <textarea className={inputCls} rows={2} placeholder="Detalhes comerciais ou modelo de maquininha..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>

            {form.erro && (
              <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {form.erro}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setForm(null)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-extrabold text-slate-700">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-extrabold">
                {salvando ? "Salvando..." : form.id ? "Salvar alterações" : "Salvar Indicação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
