// Dados do módulo HERMES Performance (metas, KPIs financeiros por franquia,
// remuneração de Green Angels, leads, etc.)
//
// AVISO: este arquivo continha, até esta correção, valores financeiros reais
// por franquia (rebate, remuneração) e por pessoa, embutidos direto no
// código do site e visíveis a qualquer visitante. Foi zerado por segurança,
// exceto as metas globais (não são dado pessoal/sensível).
//
// Próximo passo (Fase 2 do backend): mover estes dados para tabelas próprias
// no Supabase com controle de acesso restrito, e buscar via API.

import {
  WorkfinityOS,
  FranchiseKPI,
  AngelPerformanceSummary,
  Camisa10Lead,
  AIPerformanceInsight,
  PerformanceSettingsData,
  DailyChamadoDeposit,
  MonthlyChamadoDeposit,
  FranchiseMonthlyRebateRecord,
} from "../types/performance";

export const initialPerformanceSettings: PerformanceSettingsData = {
  TMAStoneGlobalTarget: 0.90,
  TMATonGlobalTarget: 2.50,
  CicloGlobalTarget: 0.90,
  camisa10BonusPerCredenciado: 30.0,
  bonusDeductionRate: 0.1,
  monthlyOSGoalGlobal: 1000,
};

export const initialFranchiseKPIs: FranchiseKPI[] = [];
export const initialAngelSummaries: AngelPerformanceSummary[] = [];
export const initialWorkfinityOSList: WorkfinityOS[] = [];
export const initialCamisa10Leads: Camisa10Lead[] = [];
export const initialAIPerformanceInsights: AIPerformanceInsight[] = [];
export const initialDailyDeposits: DailyChamadoDeposit[] = [];
export const initialMonthlyDeposits: MonthlyChamadoDeposit[] = [];
export const initialMonthlyRebateRecords: FranchiseMonthlyRebateRecord[] = [];
