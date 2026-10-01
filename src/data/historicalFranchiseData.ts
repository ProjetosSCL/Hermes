// Histórico de dados operacionais e financeiros por franquia.
//
// AVISO: este arquivo continha, até esta correção, dados financeiros e
// salariais reais de pessoas por nome (salário, remuneração variável),
// embutidos direto no código do site e visíveis a qualquer visitante,
// além do link de uma planilha do Google Sheets aberta ao público. Foi
// zerado por segurança.
//
// Próximo passo (Fase 2 do backend): mover este histórico para tabelas
// próprias no Supabase com controle de acesso restrito (só Admin e a
// pessoa titular do dado devem enxergar valores de remuneração), e buscar
// os dados via API em vez de tê-los fixos no código.

export interface FranchiseHistoryRecord {
  id: string;
  franchiseKey: string; // e.g. "JOÃO CAMARA", "LIMOEIRO DO NORTE", "TRAIRI", etc.
  prestador: string;
  mes: string;
  ano: string;
  kmRodadosPL?: number;
  kmAtualPL?: number;
  kmRodadosRivan?: number;
  kmAtualRivan?: number;
  qtdOsPL?: number;
  qtdOsRivan?: number;
  totalOS?: number;
  slaStone?: string;
  slaTon?: string;
  slaBobina?: string;
  tmaStone?: number;
  tmaTon?: number;
  tmaBobina?: number;
  cicloTriagem?: number;
  custosTotais?: string;
  salarioPL?: string;
  variavelPL?: string;
  salarioRivan?: string;
  variavelRivan?: string;
  manutencaoPL?: string;
  manutencaoRivan?: string;
  alimentacaoPL?: string;
  alimentacaoRivan?: string;
  combustivelPL?: string;
  combustivelRivan?: string;
  hospedagemPL?: string;
  hospedagemRivan?: string;
}

export const DEFAULT_SHEET_URL = '';

export const initialHistoricalData: Record<string, FranchiseHistoryRecord[]> = {};
