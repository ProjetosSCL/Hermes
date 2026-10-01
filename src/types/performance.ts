/**
 * Type definitions for HERMES PERFORMANCE Module
 */

export interface WorkfinityOS {
  id: string;
  osNumber: string;
  angelName: string;
  angelId?: string;
  franchiseName: string;
  city: string;
  osType: 'INSTALACAO' | 'TROCA' | 'RETIRADA' | 'MANUTENCAO' | 'TREINAMENTO' | 'REVERSA' | 'OUTROS';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'CONCLUIDA' | 'EM_ANDAMENTO' | 'CANCELADA';
  address?: string;
  merchantName?: string;
}

export interface FranchiseKPI {
  franchiseId: string;
  franchiseName: string;
  city: string;
  totalRebateGross: number; // Rebate Total (ex: R$ 23.922,56)
  bonusDeduction: number;   // 10% do valor destinado ao bônus
  netRebateBase: number;    // Rebate Menos Bônus (base para todos os cálculos)
  TMAStone: number;         // Valor real (ex: 0.85)
  TMATon: number;           // Valor real (ex: 2.10)
  Ciclo: number;            // Valor real (ex: 0.78)
  TMAStoneTarget: number;   // Meta (padrão ≤ 0.90)
  TMATonTarget: number;     // Meta (padrão ≤ 2.50)
  CicloTarget: number;      // Meta (padrão ≤ 0.90)
  totalOSMonth: number;
  dailyGoalTarget: number;
  monthlyGoalTarget: number;
}

export interface AngelPerformanceSummary {
  angelId: string;
  angelName: string;
  franchiseName: string;
  city: string;
  jobTitle: string;
  isReverseLogisticsResp: boolean; // Sim / Não (Logística Reversa)
  dailyOsCount: number;
  weeklyOsCount: number;
  monthlyOsCount: number;
  yearlyOsCount: number;
  workedDaysCount: number;         // Dias efetivamente trabalhados
  realDailyAverage: number;        // monthlyOsCount / workedDaysCount (NUNCA por 30)
  individualRebateShare: number;   // Rebate proporcional individual
  TMAStoneMet: boolean;
  TMATonMet: boolean;
  CicloMet: boolean;
  earnedPercentage: number;        // Total % conquistado (até 3%)
  predictedValue: number;          // Valor previsto se atingir 3%
  finalValue: number;              // Valor final real (individualRebateShare * earnedPercentage)
  projectedClosingValue: number;   // Projeção para o fim do mês
  missingForMaxRemuneration: number; // Quanto falta para remuneração máxima
  whatsapp?: string;
  jaqueta?: string;
  calca?: string;
  botas?: string;
  capacete?: string;
  fotoUrl?: string;
  registrationId?: string;
}

export interface Camisa10Lead {
  id: string;
  stoneCode: string;
  clientName: string;
  city: string;
  phone: string;
  agentName: string; // Agente Comercial (Angel)
  agentId?: string;
  date: string;
  notes: string;
  status: 'Aguardando' | 'Em negociação' | 'Credenciado' | 'Recusado';
  bonusAmount: number; // R$ 30,00 quando Credenciado
}

export interface PerformanceAIPrompt {
  id: string;
  category: 'PERFORMANCE' | 'REMUNERACAO' | 'INDICADORES' | 'CAMISA10' | 'WHATSAPP';
  promptText: string;
  iconName: string;
}

export interface AIPerformanceInsight {
  id: string;
  title: string;
  type: 'BEST_PERFORMER' | 'REBATE_LOSS' | 'KPI_ALERT' | 'TREND' | 'SUGGESTION';
  message: string;
  timestamp: string;
  targetEntity?: string;
}

export interface DailyChamadoDeposit {
  id: string;
  date: string; // YYYY-MM-DD
  angelName: string;
  angelId?: string;
  franchiseName: string;
  city: string;
  totalChamados: number;
  osType?: 'INSTALACAO' | 'TROCA' | 'RETIRADA' | 'MANUTENCAO' | 'TREINAMENTO' | 'REVERSA' | 'OUTROS';
  shift?: 'MANHA' | 'TARDE' | 'INTEGRAL';
  notes?: string;
  depositedBy: string;
  timestamp: string;
  osNumbers?: string[];
}

export interface MonthlyChamadoDeposit {
  id: string;
  monthYear: string; // YYYY-MM (e.g. "2026-07")
  angelName: string;
  angelId?: string;
  franchiseName: string;
  city: string;
  totalChamados: number;
  workedDays: number;
  dailyAverage: number; // totalChamados / workedDays
  monthlyGoal: number;
  goalMetPercentage: number;
  notes?: string;
  depositedBy: string;
  timestamp: string;
  status: 'CONSOLIDADO' | 'EM_ANALISE' | 'APROVADO';
}

export interface PerformanceSettingsData {
  TMAStoneGlobalTarget: number;    // default 0.90
  TMATonGlobalTarget: number;      // default 2.50
  CicloGlobalTarget: number;       // default 0.90
  camisa10BonusPerCredenciado: number; // default 30.00
  bonusDeductionRate: number;      // default 0.10 (10%)
  monthlyOSGoalGlobal: number;     // default 1000
}

export interface FranchiseMonthlyRebateRecord {
  id: string;
  franchiseId: string;
  franchiseName: string;
  city: string;
  mes: string; // "Julho", "Junho", "Maio", etc.
  ano: string; // "2026", "2025"
  monthYear: string; // "Julho/2026"
  totalRebateGross: number;
  bonusDeductionRate: number; // 0.10
  bonusDeduction: number;
  netRebateBase: number;
  totalOSMonth: number;
  isVigente?: boolean;
  notes?: string;
  updatedAt?: string;
}
