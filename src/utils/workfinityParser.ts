import { WorkfinityOS } from "../types/performance";

/**
 * Normalizes string for case-insensitive, accent-insensitive, whitespace-insensitive comparisons.
 */
export function normalizeName(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Parses any date format (YYYY-MM-DD, DD/MM/YYYY, Excel serial numbers, Timestamps) to standard YYYY-MM-DD.
 */
export function parseWorkfinityDate(rawVal: any, defaultDate?: string): string {
  const fallback = defaultDate || new Date().toISOString().split("T")[0];
  if (rawVal === undefined || rawVal === null || rawVal === "") return fallback;

  // Excel numeric date check (e.g. 45502)
  if (typeof rawVal === "number") {
    const jsDate = new Date(Math.round((rawVal - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split("T")[0];
    }
  }

  const str = String(rawVal).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
  const brMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, "0");
    const month = brMatch[2].padStart(2, "0");
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return fallback;
}

/**
 * Searches row object for possible column headers using fuzzy matching.
 */
export function getRowFieldValue(
  row: Record<string, any>,
  possibleKeys: string[],
  defaultValue: string = ""
): string {
  if (!row || typeof row !== "object") return defaultValue;

  const rowKeys = Object.keys(row);

  // 1. Direct exact match
  for (const k of possibleKeys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }

  // 2. Normalized match (case, accent, substring)
  const normPossible = possibleKeys.map((k) => normalizeName(k));
  for (const actualKey of rowKeys) {
    const normActual = normalizeName(actualKey);
    if (normPossible.some((p) => normActual.includes(p) || p.includes(normActual))) {
      const val = row[actualKey];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
  }

  return defaultValue;
}

/**
 * Parses a single raw Excel/CSV row into a WorkfinityOS object.
 */
export function parseWorkfinityExcelRow(
  row: Record<string, any>,
  idx: number,
  defaultDate?: string
): WorkfinityOS {
  const osNum = getRowFieldValue(
    row,
    ["Número OS", "Numero OS", "OS", "osNumber", "Nº OS", "N° OS", "Ordem de Serviço", "ID OS", "Protocolo", "Chamado", "Código OS", "Código"],
    `OS-${Math.floor(100000 + Math.random() * 900000)}`
  );

  const angelName = getRowFieldValue(
    row,
    ["Angel", "Técnico", "Tecnico", "Agente", "Nome", "Responsável", "Responsavel", "Técnico Responsável", "Nome Técnico", "Usuário", "Executor", "Prestador", "Técnico Executante"],
    "Angel Não Identificado"
  );

  const franName = getRowFieldValue(
    row,
    ["Franquia", "Regional", "Filial", "Unidade", "Polo", "Base", "Franquia / Regional", "Empresa"],
    "Patos"
  );

  const city = getRowFieldValue(
    row,
    ["Cidade", "Município", "Municipio", "Cidade/UF", "UF", "Localidade"],
    "Patos/PB"
  );

  const rawOsType = getRowFieldValue(
    row,
    ["Tipo OS", "Tipo", "Serviço", "Servico", "Tipo de Serviço", "Operação", "Operacao", "Modalidade", "Natureza"],
    "INSTALACAO"
  ).toUpperCase();

  const rawDate = getRowFieldValue(
    row,
    [
      "Data Atendimento",
      "Data de Atendimento",
      "Data Atend.",
      "Data Atend",
      "Dt. Atendimento",
      "Dt Atendimento",
      "Dt.Atendimento",
      "Data Conclusão",
      "Data Conclusao",
      "Data Execução",
      "Data Execucao",
      "Data de Fechamento",
      "Data de Conclusão",
      "Data",
      "Fechamento",
      "Data Abertura"
    ],
    defaultDate || new Date().toISOString().split("T")[0]
  );

  const time = getRowFieldValue(
    row,
    ["Hora", "Horário", "Hora Conclusão", "Hora Execução"],
    "09:00"
  );

  const rawStatus = getRowFieldValue(
    row,
    ["Status", "Situação", "Situacao", "Status OS", "Estado", "Fase"],
    "CONCLUIDA"
  ).toUpperCase();

  const parsedDate = parseWorkfinityDate(rawDate, defaultDate);
  const status = rawStatus.includes("CANCEL") ? "CANCELADA" : "CONCLUIDA";

  let osType: WorkfinityOS["osType"] = "INSTALACAO";
  if (rawOsType.includes("TROCA")) osType = "TROCA";
  else if (rawOsType.includes("REVERSA") || rawOsType.includes("RETIRADA")) osType = "REVERSA";
  else if (rawOsType.includes("MANUT") || rawOsType.includes("CONSERTO")) osType = "MANUTENCAO";
  else if (rawOsType.includes("TREINA")) osType = "TREINAMENTO";

  return {
    id: `WF-${Date.now()}-${idx}`,
    osNumber: String(osNum),
    angelName: String(angelName),
    franchiseName: String(franName),
    city: String(city),
    osType,
    date: parsedDate,
    time: String(time),
    status,
  };
}
