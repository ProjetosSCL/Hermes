/**
 * Leitura de números digitados no padrão brasileiro.
 *
 *  "R$ 23.922,56" -> 23922.56      "23.922,56" -> 23922.56      "1.001" (OS) -> 1001
 *  "97,8%" -> 97.8                 "0,82" ou "0.82" -> 0.82     "" -> null (vazio)
 *  "abc" ou "12x" -> NaN (inválido: o formulário recusa em vez de gravar 0)
 *
 * indicador = true: campos como TMA, SLA e Ciclo, que nunca passam de mil. Nesses o ponto é sempre
 * decimal ("1.500" vale 1,5). Nos demais (dinheiro e contagem de OS) um ponto seguido de exatamente
 * três dígitos é separador de milhar ("1.500" vale 1500).
 */
export interface OpcoesNumero {
  indicador?: boolean;
}

export function lerNumeroBR(entrada: string | number | null | undefined, op: OpcoesNumero = {}): number | null {
  if (typeof entrada === "number") return Number.isFinite(entrada) ? entrada : NaN;
  let s = String(entrada ?? "")
    .replace(/R\$/gi, "")
    .replace(/%/g, "")
    .replace(/[\s\u00a0]/g, "");
  if (s === "") return null;
  if (!/^-?[\d.,]+$/.test(s)) return NaN;
  const negativo = s.startsWith("-");
  if (negativo) s = s.slice(1);
  if (s === "") return NaN;

  const temPonto = s.includes(".");
  const temVirgula = s.includes(",");
  let inteira = s;
  let fracao = "";

  if (temPonto && temVirgula) {
    // o último separador é o decimal; o outro é o de milhar
    const ultimo = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const decimal = s[ultimo];
    const milhar = decimal === "," ? "." : ",";
    const parteInteira = s.slice(0, ultimo);
    if (parteInteira.includes(decimal)) return NaN;
    inteira = parteInteira.split(milhar).join("");
    fracao = s.slice(ultimo + 1);
    if (fracao.includes(milhar)) return NaN;
  } else if (temVirgula) {
    const partes = s.split(",");
    if (partes.length === 2) {
      inteira = partes[0];
      fracao = partes[1];
    } else if (partes.slice(1).every((p) => p.length === 3) && partes[0] !== "") {
      inteira = partes.join(""); // 1,234,567
    } else {
      return NaN;
    }
  } else if (temPonto) {
    const partes = s.split(".");
    if (!op.indicador && /^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
      inteira = partes.join(""); // 1.500 / 23.922 / 1.234.567
    } else if (partes.length === 2) {
      inteira = partes[0];
      fracao = partes[1];
    } else {
      return NaN;
    }
  }

  if (!/^\d*$/.test(inteira) || !/^\d*$/.test(fracao)) return NaN;
  if (inteira === "" && fracao === "") return NaN;
  const n = parseFloat(`${inteira || "0"}.${fracao || "0"}`);
  return negativo ? -n : n;
}
