/**
 * Leitura do relatório diário do Workfinity (.csv) para o X1 SCL.
 *
 * O arquivo traz dados de cliente (nome, CPF/CNPJ, telefone, endereço). Este código
 * lê SÓ as colunas necessárias para contar OS e devolve apenas contagens por
 * dia, franquia e técnico. Nada de cliente sai daqui nem vai para o banco.
 */

export interface FranchiseLite {
  id: string;
  name: string;
}
export interface ProfileLite {
  id: string;
  name: string;
}

export interface DailyRecord {
  day: string; // AAAA-MM-DD (Data de Atendimento)
  franchise_id: string;
  tech_key: string; // id do agente, ou "nome:..." quando o técnico não está no cadastro
  agent_id: string | null;
  technician_name: string;
  os_done: number; // BAIXADA
  os_cancelled: number; // CANCELADA
  os_pending: number; // demais status
  os_stone: number;
  os_ton: number;
  by_group: Record<string, number>;
}

export interface ImportSummary {
  totalRows: number;
  days: string[];
  done: number;
  cancelled: number;
  pending: number;
  semData: number;
  statusesOutros: string[];
  franquiasNaoEncontradas: { nome: string; linhas: number }[];
  tecnicosForaDoCadastro: { nome: string; os: number }[];
  porFranquia: { franchiseId: string; nome: string; done: number }[];
  porDia: { day: string; done: number }[];
}

const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e"]);
const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const norm = (s: string) => semAcento(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
export const normNome = (s: string) =>
  norm(s)
    .split(" ")
    .filter((t) => t && !PARTICULAS.has(t))
    .join(" ");

/** Decodifica os bytes do arquivo: UTF-8 se for válido, senão Windows-1252 (o formato do Workfinity). */
export function decodeWorkfinityBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export function parseCsv(text: string, delimiter = ";"): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let entreAspas = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (entreAspas) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else entreAspas = false;
      } else field += c;
    } else if (c === '"') entreAspas = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const chaveColuna = (h: string) => norm(h).replace(/[^a-z0-9]/g, "");

export interface WorkfinityParsed {
  ok: boolean;
  error?: string;
  rows: Record<string, string>[];
}

/** Lê o texto do relatório e devolve só as colunas que usamos. */
export function parseWorkfinity(text: string): WorkfinityParsed {
  const primeira = text.split("\n")[0] ?? "";
  const delimiter = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas = parseCsv(text, delimiter);
  if (linhas.length < 2) return { ok: false, error: "O arquivo está vazio ou não parece um relatório do Workfinity.", rows: [] };
  const idx: Record<string, number> = {};
  linhas[0].forEach((h, i) => {
    idx[chaveColuna(h)] = i;
  });
  const necessarias: [string, string][] = [
    ["chamado", "Chamado"],
    ["status", "Status"],
    ["prestador", "Prestador"],
    ["tecnico", "Técnico"],
    ["dataatendimento", "Data Atendimento"],
  ];
  const faltando = necessarias.filter(([k]) => idx[k] === undefined).map(([, nome]) => nome);
  if (faltando.length > 0) {
    return { ok: false, error: `Não encontrei no arquivo as colunas: ${faltando.join(", ")}. Confira se é o relatório certo do Workfinity.`, rows: [] };
  }
  const pega = (r: string[], k: string) => (idx[k] === undefined ? "" : (r[idx[k]] ?? "").trim());
  const rows = linhas.slice(1).map((r) => ({
    chamado: pega(r, "chamado"),
    status: pega(r, "status"),
    prestador: pega(r, "prestador"),
    tecnico: pega(r, "tecnico"),
    dataAtendimento: pega(r, "dataatendimento"),
    contratante: pega(r, "contratante"),
    grupoServico: pega(r, "gruposervico"),
  }));
  return { ok: true, rows };
}

/** "19/10/2026 10:40:16" ou "2026-10-19" -> "2026-10-19" (ou null se não for data). */
export function parseDia(s: string): string | null {
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [y, m, d] = br ? [br[3], br[2], br[1]] : iso ? [iso[1], iso[2], iso[3]] : [null, null, null];
  if (!y || !m || !d) return null;
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (dt.getUTCFullYear() !== Number(y) || dt.getUTCMonth() !== Number(m) - 1 || dt.getUTCDate() !== Number(d)) return null;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export const rotuloDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const chaveFranquia = (prestador: string) =>
  norm(prestador)
    .replace(/^[a-z]{2} - /, "")
    .replace(/ franquia$/, "")
    .trim();

/** Acha a pessoa do cadastro pelo nome: igual (sem acento/maiúscula/"de/da/do") ou com inicial no lugar de um sobrenome. */
export function acharPerfil(nome: string, perfis: ProfileLite[]): ProfileLite | null {
  const alvo = normNome(nome);
  if (!alvo) return null;
  const exatos = perfis.filter((p) => normNome(p.name) === alvo);
  if (exatos.length === 1) return exatos[0];
  if (exatos.length > 1) return null;
  const t = alvo.split(" ");
  const parecidos = perfis.filter((p) => {
    const u = normNome(p.name).split(" ");
    if (u.length !== t.length) return false;
    return t.every((a, i) => a === u[i] || (a.length === 1 && u[i].startsWith(a)) || (u[i].length === 1 && a.startsWith(u[i])));
  });
  return parecidos.length === 1 ? parecidos[0] : null;
}

export function buildDailyRecords(
  parsed: WorkfinityParsed,
  franchises: FranchiseLite[],
  profiles: ProfileLite[]
): { records: DailyRecord[]; summary: ImportSummary } {
  const frPorNome = new Map(franchises.map((f) => [norm(f.name), f]));
  const acharFranquia = (prestador: string): FranchiseLite | null => {
    const k = chaveFranquia(prestador);
    if (frPorNome.has(k)) return frPorNome.get(k)!;
    const c = franchises.filter((f) => norm(f.name).startsWith(k + " "));
    return c.length === 1 ? c[0] : null;
  };
  const cachePerfil = new Map<string, ProfileLite | null>();
  const perfilDe = (nome: string) => {
    if (!cachePerfil.has(nome)) cachePerfil.set(nome, acharPerfil(nome, profiles));
    return cachePerfil.get(nome)!;
  };

  const registros = new Map<string, DailyRecord>();
  const dias = new Set<string>();
  const outrosStatus = new Set<string>();
  const frNao = new Map<string, number>();
  const tecFora = new Map<string, number>();
  const porFranquia = new Map<string, number>();
  const porDia = new Map<string, number>();
  let done = 0;
  let cancelled = 0;
  let pending = 0;
  let semData = 0;

  for (const r of parsed.rows) {
    const dia = parseDia(r.dataAtendimento);
    if (!dia) {
      semData++;
      continue;
    }
    const fr = acharFranquia(r.prestador);
    if (!fr) {
      frNao.set(r.prestador || "(sem prestador)", (frNao.get(r.prestador || "(sem prestador)") ?? 0) + 1);
      continue;
    }
    dias.add(dia);
    const status = norm(r.status);
    const perfil = r.tecnico ? perfilDe(r.tecnico) : null;
    const techKey = perfil ? perfil.id : r.tecnico ? `nome:${normNome(r.tecnico)}` : "sem-tecnico";
    const chave = `${dia}|${fr.id}|${techKey}`;
    let rec = registros.get(chave);
    if (!rec) {
      rec = {
        day: dia,
        franchise_id: fr.id,
        tech_key: techKey,
        agent_id: perfil ? perfil.id : null,
        technician_name: perfil ? perfil.name : r.tecnico || "(sem técnico)",
        os_done: 0,
        os_cancelled: 0,
        os_pending: 0,
        os_stone: 0,
        os_ton: 0,
        by_group: {},
      };
      registros.set(chave, rec);
    }
    if (status === "baixada") {
      rec.os_done++;
      done++;
      porFranquia.set(fr.id, (porFranquia.get(fr.id) ?? 0) + 1);
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
      const palavras = norm(r.contratante).split(/[^a-z0-9]+/);
      if (palavras.includes("ton")) rec.os_ton++;
      else if (palavras.includes("stone")) rec.os_stone++;
      const grupo = (r.grupoServico || "OUTROS").toUpperCase();
      rec.by_group[grupo] = (rec.by_group[grupo] ?? 0) + 1;
      if (r.tecnico && !perfil) tecFora.set(r.tecnico, (tecFora.get(r.tecnico) ?? 0) + 1);
    } else if (status === "cancelada") {
      rec.os_cancelled++;
      cancelled++;
    } else {
      rec.os_pending++;
      pending++;
      if (status !== "em tratamento n1") outrosStatus.add(r.status);
    }
  }

  const nomeFr = new Map(franchises.map((f) => [f.id, f.name]));
  return {
    records: [...registros.values()],
    summary: {
      totalRows: parsed.rows.length,
      days: [...dias].sort(),
      done,
      cancelled,
      pending,
      semData,
      statusesOutros: [...outrosStatus],
      franquiasNaoEncontradas: [...frNao].map(([nome, linhas]) => ({ nome, linhas })),
      tecnicosForaDoCadastro: [...tecFora].map(([nome, os]) => ({ nome, os })).sort((a, b) => b.os - a.os),
      porFranquia: [...porFranquia]
        .map(([franchiseId, d]) => ({ franchiseId, nome: nomeFr.get(franchiseId) ?? "", done: d }))
        .sort((a, b) => b.done - a.done),
      porDia: [...porDia].map(([day, d]) => ({ day, done: d })).sort((a, b) => a.day.localeCompare(b.day)),
    },
  };
}
