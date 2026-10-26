/**
 * Camada única de acesso a dados do Hermes.
 *
 * Regra do arquivo: nenhum componente da UI deve chamar `supabase` direto.
 * Tudo passa por aqui, para que:
 *  - as conversões de nome de coluna (snake_case no banco -> camelCase no app)
 *    fiquem centralizadas em um só lugar;
 *  - toda ação que "não pode duplicar" (idempotência) tenha um ponto único
 *    de implementação.
 */
import { supabase } from './supabaseClient';
import {
  Franchise,
  UserAgent,
  Machine,
  MachineMovement,
  MachineStatus,
  SLATicket,
  ChecklistRecord,
  FuelLog,
  Vehicle,
} from '../types';

/** Gera uma chave única por ação do usuário (idempotência). */
export const newIdempotencyKey = (): string => crypto.randomUUID();

// ---------------------------------------------------------------------------
// AUTENTICAÇÃO
// ---------------------------------------------------------------------------
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ---------------------------------------------------------------------------
// PERFIS (agentes / líderes / admins)
// ---------------------------------------------------------------------------
function rowToAgent(row: any, franchiseName: string): UserAgent {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    jobTitle: row.job_title ?? undefined,
    phone: row.phone ?? undefined,
    franchiseName,
    avatarUrl: row.avatar_url ?? '',
    status: row.status,
    dailyGoal: { target: row.daily_goal_target, completed: row.daily_goal_completed },
    shiftStart: row.shift_start ?? undefined,
    shiftPauseTotalSeconds: row.shift_pause_total_seconds ?? 0,
    currentTicketId: row.current_ticket_id ?? undefined,
  };
}

export async function fetchMyProfile(userId: string): Promise<UserAgent> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, franchises(name)')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return rowToAgent(data, data.franchises?.name ?? '');
}

export async function fetchAgents(): Promise<UserAgent[]> {
  const { data, error } = await supabase.from('profiles').select('*, franchises(name)');
  if (error) throw error;
  return (data ?? []).map((row: any) => rowToAgent(row, row.franchises?.name ?? ''));
}

export async function updateAgentStatus(
  userId: string,
  status: UserAgent['status'],
  shiftStart?: string
) {
  const { error } = await supabase
    .from('profiles')
    .update({ status, ...(shiftStart ? { shift_start: shiftStart } : {}) })
    .eq('id', userId);
  if (error) throw error;
}

export async function incrementDailyGoalCompleted(userId: string) {
  const { error } = await supabase.rpc('increment_daily_goal_completed', { p_user_id: userId });
  if (error) throw error;
}

/**
 * IMPORTANTE: criar um novo agente exige criar um usuário de login também
 * (tabela auth.users), e isso só pode ser feito com a "service role key" do
 * Supabase — uma chave que NUNCA pode rodar no navegador do usuário, só em
 * um servidor confiável. Por segurança, esta função não faz isso direto;
 * ela chama uma Edge Function (a implementar) que roda no servidor do
 * Supabase com essa chave protegida.
 */
export async function inviteAgent(payload: {
  name: string;
  email: string;
  role: UserAgent['role'];
  franchiseId: string;
  jobTitle?: string;
  phone?: string;
}) {
  const { data, error } = await supabase.functions.invoke('invite-agent', { body: payload });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// FRANQUIAS
// ---------------------------------------------------------------------------
function rowToFranchise(row: any): Franchise {
  return {
    id: row.id,
    name: row.name,
    cityRegion: row.city_region ?? '',
    code: row.code ?? '',
    cnpj: row.cnpj ?? undefined,
    activeAgentsCount: row.active_agents_count ?? 0,
    machinesStockCount: row.machines_stock_count ?? 0,
    status: row.status,
    responsibleLeader: row.responsible_leader ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function fetchFranchises(): Promise<Franchise[]> {
  const { data, error } = await supabase.from('franchises').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(rowToFranchise);
}

export async function createFranchise(
  input: Omit<Franchise, 'id' | 'activeAgentsCount' | 'machinesStockCount'>
): Promise<Franchise> {
  const { data, error } = await supabase
    .from('franchises')
    .insert({
      name: input.name,
      city_region: input.cityRegion,
      code: input.code,
      cnpj: input.cnpj,
      status: input.status,
      responsible_leader: input.responsibleLeader,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToFranchise(data);
}

export async function updateFranchise(franchise: Franchise): Promise<Franchise> {
  const { data, error } = await supabase
    .from('franchises')
    .update({
      name: franchise.name,
      city_region: franchise.cityRegion,
      code: franchise.code,
      cnpj: franchise.cnpj,
      status: franchise.status,
      responsible_leader: franchise.responsibleLeader,
      phone: franchise.phone,
      address: franchise.address,
      notes: franchise.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', franchise.id)
    .select()
    .single();
  if (error) throw error;
  return rowToFranchise(data);
}

export async function deleteFranchise(id: string): Promise<void> {
  const { error } = await supabase.from('franchises').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// MÁQUINAS
// ---------------------------------------------------------------------------
function rowToMachine(row: any): Machine {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    model: row.model,
    status: row.status,
    rawStatus: row.raw_status ?? undefined,
    contratante: row.contratante ?? undefined,
    prestadorServico: row.prestador_servico ?? undefined,
    batteryLevel: row.battery_level ?? 0,
    connectivity: row.connectivity,
    currentCustodyId: row.current_custody_id ?? '',
    currentCustodyName: row.current_custody_name ?? '',
    location: {
      lat: row.location_lat ?? 0,
      lng: row.location_lng ?? 0,
      address: row.location_address ?? '',
    },
    lastCheckIn: row.last_check_in,
    lote: row.lote ?? '',
    notes: row.notes ?? undefined,
  };
}

export async function fetchMachines(): Promise<Machine[]> {
  const { data, error } = await supabase.from('machines').select('*').order('serial_number');
  if (error) throw error;
  return (data ?? []).map(rowToMachine);
}

export async function createMachinesBulk(
  items: Array<Omit<Machine, 'id' | 'lastCheckIn'>>,
  franchiseId?: string
): Promise<Machine[]> {
  const rows = items.map((m) => ({
    serial_number: m.serialNumber,
    model: m.model,
    status: m.status,
    raw_status: m.rawStatus,
    contratante: m.contratante,
    franchise_id: franchiseId,
    prestador_servico: m.prestadorServico,
    battery_level: m.batteryLevel,
    connectivity: m.connectivity,
    current_custody_id: m.currentCustodyId || null,
    current_custody_name: m.currentCustodyName,
    location_lat: m.location?.lat,
    location_lng: m.location?.lng,
    location_address: m.location?.address,
    lote: m.lote,
    notes: m.notes,
  }));
  const { data, error } = await supabase.from('machines').insert(rows).select();
  if (error) throw error;
  return (data ?? []).map(rowToMachine);
}

/**
 * Transfere a custódia de uma máquina e registra o movimento — as duas
 * coisas precisam acontecer juntas. `idempotencyKey` garante que, se o app
 * do agente reenviar a mesma transferência (ex: sem sinal em campo e o
 * usuário aperta "salvar" de novo), o banco recusa a segunda tentativa em
 * vez de duplicar o histórico ou mover a máquina duas vezes.
 */
export async function updateMachineCustody(params: {
  machine: Machine;
  newCustodyId: string;
  newCustodyName: string;
  newStatus: MachineStatus;
  reason: MachineMovement['reason'];
  agentId: string;
  agentName: string;
  signatureUrl?: string;
  idempotencyKey: string;
}): Promise<{ machine: Machine; movement: MachineMovement }> {
  const { machine, newCustodyId, newCustodyName, newStatus, reason, agentId, agentName, signatureUrl, idempotencyKey } =
    params;

  const { data: movRow, error: movError } = await supabase
    .from('machine_movements')
    .insert({
      idempotency_key: idempotencyKey,
      machine_id: machine.id,
      machine_serial: machine.serialNumber,
      from_custody: machine.currentCustodyName,
      to_custody: newCustodyName,
      previous_status: machine.status,
      new_status: newStatus,
      agent_id: agentId,
      agent_name: agentName,
      reason,
      signature_url: signatureUrl,
    })
    .select()
    .single();

  // Código 23505 = violação de restrição "unique" no Postgres.
  // Se a chave de idempotência já existe, a ação já foi processada antes:
  // não é erro, é sucesso silencioso (evita duplicar).
  if (movError && (movError as any).code !== '23505') throw movError;

  const { data: machineRow, error: machineError } = await supabase
    .from('machines')
    .update({
      status: newStatus,
      current_custody_id: newCustodyId || null,
      current_custody_name: newCustodyName,
      last_check_in: new Date().toISOString(),
    })
    .eq('id', machine.id)
    .select()
    .single();
  if (machineError) throw machineError;

  return {
    machine: rowToMachine(machineRow),
    movement: movRow
      ? {
          id: movRow.id,
          machineId: movRow.machine_id,
          machineSerial: movRow.machine_serial,
          timestamp: movRow.created_at,
          fromCustody: movRow.from_custody,
          toCustody: movRow.to_custody,
          previousStatus: movRow.previous_status,
          newStatus: movRow.new_status,
          agentId: movRow.agent_id,
          agentName: movRow.agent_name,
          reason: movRow.reason,
          signatureUrl: movRow.signature_url,
        }
      : ({} as MachineMovement),
  };
}

// ---------------------------------------------------------------------------
// CHAMADOS SLA
// ---------------------------------------------------------------------------
function rowToTicket(row: any): SLATicket {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    cnpjs: row.cnpjs ?? '',
    address: row.address ?? '',
    type: row.type,
    priority: row.priority,
    allocatedSlaMinutes: row.allocated_sla_minutes,
    startedAt: row.started_at,
    estimatedArrivalAt: row.estimated_arrival_at,
    status: row.status,
    assignedAgentId: row.assigned_agent_id ?? '',
    notes: row.notes ?? undefined,
  };
}

export async function fetchSlaTickets(): Promise<SLATicket[]> {
  const { data, error } = await supabase.from('sla_tickets').select('*').order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTicket);
}

/** Conclui um chamado. idempotencyKey evita concluir o mesmo chamado 2x. */
export async function completeSlaTicket(ticketId: string, idempotencyKey: string): Promise<void> {
  const { error } = await supabase
    .from('sla_tickets')
    .update({ status: 'CONCLUIDO', completed_idempotency_key: idempotencyKey, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .is('completed_idempotency_key', null); // só aplica se ainda não tinha sido concluído
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// CHECKLISTS
// ---------------------------------------------------------------------------
export async function fetchChecklists(): Promise<ChecklistRecord[]> {
  const { data, error } = await supabase.from('checklist_records').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    ticketId: row.ticket_id ?? undefined,
    merchantName: row.merchant_name,
    cnpj: row.cnpj ?? '',
    machineSerial: row.machine_serial ?? '',
    machineModel: row.machine_model ?? '',
    agentId: row.agent_id ?? '',
    agentName: row.agent_name ?? '',
    timestamp: row.created_at,
    machineCondition: row.machine_condition,
    damageDetails: row.damage_details ?? undefined,
    installationTests: row.installation_tests ?? undefined,
    signatureUrl: row.signature_url ?? undefined,
    status: row.status,
  }));
}

export async function saveChecklist(record: ChecklistRecord, idempotencyKey: string): Promise<void> {
  const { error } = await supabase.from('checklist_records').insert({
    idempotency_key: idempotencyKey,
    ticket_id: record.ticketId,
    merchant_name: record.merchantName,
    cnpj: record.cnpj,
    machine_serial: record.machineSerial,
    machine_model: record.machineModel,
    agent_id: record.agentId,
    agent_name: record.agentName,
    machine_condition: record.machineCondition,
    damage_details: record.damageDetails,
    installation_tests: record.installationTests,
    signature_url: record.signatureUrl,
    status: record.status,
  });
  if (error && (error as any).code !== '23505') throw error;
}

// ---------------------------------------------------------------------------
// FROTA (veículos e abastecimentos)
// ---------------------------------------------------------------------------
export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('plate');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    plate: row.plate,
    model: row.model,
    assignedAgentId: row.assigned_agent_id ?? '',
    assignedAgentName: '', // resolvido no front, se necessário, via join com profiles
    currentKm: row.current_km,
    averageKmL: row.average_kml ?? 0,
    status: row.status,
  }));
}

export async function fetchFuelLogs(): Promise<FuelLog[]> {
  const { data, error } = await supabase.from('fuel_logs').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    vehiclePlate: row.vehicle_plate,
    vehicleModel: '',
    agentId: row.agent_id ?? '',
    agentName: row.agent_name ?? '',
    timestamp: row.created_at,
    currentKm: row.current_km,
    liters: row.liters,
    totalCostR$: row.total_cost_brl,
    fuelType: row.fuel_type,
    gasStation: row.gas_station ?? '',
    calculatedKmL: row.calculated_kml ?? 0,
    calculatedCostPerKm: row.calculated_cost_per_km ?? 0,
  }));
}

export async function addFuelLog(log: FuelLog, idempotencyKey: string): Promise<void> {
  const { error: insertError } = await supabase.from('fuel_logs').insert({
    idempotency_key: idempotencyKey,
    vehicle_plate: log.vehiclePlate,
    agent_id: log.agentId,
    agent_name: log.agentName,
    current_km: log.currentKm,
    liters: log.liters,
    total_cost_brl: log.totalCostR$,
    fuel_type: log.fuelType,
    gas_station: log.gasStation,
    calculated_kml: log.calculatedKmL,
    calculated_cost_per_km: log.calculatedCostPerKm,
  });
  if (insertError && (insertError as any).code !== '23505') throw insertError;

  const { error: updateError } = await supabase
    .from('vehicles')
    .update({ current_km: log.currentKm, average_kml: log.calculatedKmL, updated_at: new Date().toISOString() })
    .eq('plate', log.vehiclePlate);
  if (updateError) throw updateError;
}

// ---------------------------------------------------------------------------
// REMUNERAÇÃO (Fase 2) — salário, variável dos Green Angels e Camisa 10
// ---------------------------------------------------------------------------
export interface CompensationSettings {
  tmaStoneTarget: number;
  tmaTonTarget: number;
  cicloTarget: number;
  tmaStoneLowerIsBetter: boolean;
  tmaTonLowerIsBetter: boolean;
  cicloLowerIsBetter: boolean;
  pctTmaStoneReversa: number;
  pctTmaTonReversa: number;
  pctCicloReversa: number;
  pctTmaStoneNormal: number;
  pctTmaTonNormal: number;
  rebateDeductionPct: number;
  camisa10BonusAmount: number;
}

export interface FranchiseMonthlyIndicator {
  id?: string;
  franchiseId: string;
  year: number;
  month: number;
  tmaStoneActual: number | null;
  tmaTonActual: number | null;
  cicloActual: number | null;
  rebateAmount: number;
  totalServiceOrders: number;
  notes?: string;
  /** Opcionais (alimentam o Histórico). undefined = "não mexer"; null = "sem valor / apagar". */
  osStone?: number | null;
  osTon?: number | null;
  slaStone?: number | null;
  slaTon?: number | null;
  slaBobina?: number | null;
  tmaBobina?: number | null;
}

function nOuNulo(v: any): number | null {
  return v === null || v === undefined ? null : num(v);
}

export interface AgentCompensationRecord {
  id?: string;
  agentId: string;
  year: number;
  month: number;
  baseSalary: number;
  doesReverseLogistics: boolean;
  variablePct: number;
  variableBonus: number;
  maintenanceAllowance: number;
  foodAllowance: number;
  fuelAllowance: number;
  lodgingAllowance: number;
  notes?: string;
}

export interface Camisa10Lead {
  id: string;
  agentId: string;
  leadDescription: string;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  bonusAmount: number | null;
  createdAt: string;
  approvedAt: string | null;
}

const num = (v: any, fallback = 0): number => (v === null || v === undefined ? fallback : Number(v));

export async function fetchCompensationSettings(): Promise<CompensationSettings> {
  const { data, error } = await supabase.from('compensation_settings').select('*').eq('id', true).single();
  if (error) throw error;
  return {
    tmaStoneTarget: num(data.tma_stone_target),
    tmaTonTarget: num(data.tma_ton_target),
    cicloTarget: num(data.ciclo_target),
    tmaStoneLowerIsBetter: data.tma_stone_lower_is_better,
    tmaTonLowerIsBetter: data.tma_ton_lower_is_better,
    cicloLowerIsBetter: data.ciclo_lower_is_better,
    pctTmaStoneReversa: num(data.pct_tma_stone_reversa),
    pctTmaTonReversa: num(data.pct_tma_ton_reversa),
    pctCicloReversa: num(data.pct_ciclo_reversa),
    pctTmaStoneNormal: num(data.pct_tma_stone_normal),
    pctTmaTonNormal: num(data.pct_tma_ton_normal),
    rebateDeductionPct: num(data.rebate_deduction_pct, 10),
    camisa10BonusAmount: num(data.camisa10_bonus_amount),
  };
}

export async function updateCompensationSettings(s: CompensationSettings): Promise<void> {
  const { error } = await supabase
    .from('compensation_settings')
    .update({
      tma_stone_target: s.tmaStoneTarget,
      tma_ton_target: s.tmaTonTarget,
      ciclo_target: s.cicloTarget,
      tma_stone_lower_is_better: s.tmaStoneLowerIsBetter,
      tma_ton_lower_is_better: s.tmaTonLowerIsBetter,
      ciclo_lower_is_better: s.cicloLowerIsBetter,
      pct_tma_stone_reversa: s.pctTmaStoneReversa,
      pct_tma_ton_reversa: s.pctTmaTonReversa,
      pct_ciclo_reversa: s.pctCicloReversa,
      pct_tma_stone_normal: s.pctTmaStoneNormal,
      pct_tma_ton_normal: s.pctTmaTonNormal,
      rebate_deduction_pct: s.rebateDeductionPct,
      camisa10_bonus_amount: s.camisa10BonusAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);
  if (error) throw error;
}

function rowToIndicator(row: any): FranchiseMonthlyIndicator {
  return {
    id: row.id,
    franchiseId: row.franchise_id,
    year: row.year,
    month: row.month,
    tmaStoneActual: row.tma_stone_actual === null ? null : num(row.tma_stone_actual),
    tmaTonActual: row.tma_ton_actual === null ? null : num(row.tma_ton_actual),
    cicloActual: row.ciclo_actual === null ? null : num(row.ciclo_actual),
    rebateAmount: num(row.rebate_amount),
    totalServiceOrders: num(row.total_service_orders),
    notes: row.notes ?? undefined,
    osStone: nOuNulo(row.os_stone),
    osTon: nOuNulo(row.os_ton),
    slaStone: nOuNulo(row.sla_stone),
    slaTon: nOuNulo(row.sla_ton),
    slaBobina: nOuNulo(row.sla_bobina),
    tmaBobina: nOuNulo(row.tma_bobina),
  };
}

export async function fetchFranchiseIndicators(year: number, month: number): Promise<FranchiseMonthlyIndicator[]> {
  const { data, error } = await supabase
    .from('franchise_monthly_indicators')
    .select('*')
    .eq('year', year)
    .eq('month', month);
  if (error) throw error;
  return (data ?? []).map(rowToIndicator);
}

// ---------------------------------------------------------------------------
// Histórico (aba Histórico 2025/2026): leitura completa, só para consulta
// ---------------------------------------------------------------------------
export interface FranchiseHistoryRow {
  franchiseId: string;
  year: number;
  month: number;
  totalServiceOrders: number;
  osStone: number | null;
  osTon: number | null;
  slaStone: number | null;
  slaTon: number | null;
  slaBobina: number | null;
  tmaStone: number | null;
  tmaTon: number | null;
  tmaBobina: number | null;
  ciclo: number | null;
  rebate: number;
}

const numN = (v: any): number | null => (v === null || v === undefined ? null : Number(v));

export async function fetchFranchiseHistory(): Promise<FranchiseHistoryRow[]> {
  const { data, error } = await supabase
    .from('franchise_monthly_indicators')
    .select(
      'franchise_id,year,month,total_service_orders,os_stone,os_ton,sla_stone,sla_ton,sla_bobina,tma_stone_actual,tma_ton_actual,tma_bobina,ciclo_actual,rebate_amount'
    );
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    franchiseId: r.franchise_id,
    year: r.year,
    month: r.month,
    totalServiceOrders: num(r.total_service_orders),
    osStone: numN(r.os_stone),
    osTon: numN(r.os_ton),
    slaStone: numN(r.sla_stone),
    slaTon: numN(r.sla_ton),
    slaBobina: numN(r.sla_bobina),
    tmaStone: numN(r.tma_stone_actual),
    tmaTon: numN(r.tma_ton_actual),
    tmaBobina: numN(r.tma_bobina),
    ciclo: numN(r.ciclo_actual),
    rebate: num(r.rebate_amount),
  }));
}

export interface AngelHistoryRow {
  agentId: string;
  year: number;
  month: number;
  totalServiceOrders: number;
  osStone: number | null;
  osTon: number | null;
}

export async function fetchAngelHistory(): Promise<AngelHistoryRow[]> {
  const { data, error } = await supabase
    .from('angel_monthly_indicators')
    .select('agent_id,year,month,total_service_orders,os_stone,os_ton');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    agentId: r.agent_id,
    year: r.year,
    month: r.month,
    totalServiceOrders: num(r.total_service_orders),
    osStone: numN(r.os_stone),
    osTon: numN(r.os_ton),
  }));
}

/** Todos os lançamentos de remuneração (só Admin e líder da franquia conseguem ler). */
export async function fetchAllCompensationRecords(): Promise<AgentCompensationRecord[]> {
  const { data, error } = await supabase.from('agent_compensation_records').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToCompensation);
}

// ---------------------------------------------------------------------------
// Produção diária (X1 SCL): contagens por dia, franquia e técnico
// ---------------------------------------------------------------------------
export interface DailyProductionRow {
  day: string; // AAAA-MM-DD
  franchiseId: string;
  techKey: string;
  agentId: string | null;
  technicianName: string;
  osDone: number;
  osCancelled: number;
  osPending: number;
  osStone: number;
  osTon: number;
  byGroup: Record<string, number>;
}

const rowToDaily = (r: any): DailyProductionRow => ({
  day: String(r.day).slice(0, 10),
  franchiseId: r.franchise_id,
  techKey: r.tech_key,
  agentId: r.agent_id ?? null,
  technicianName: r.technician_name,
  osDone: num(r.os_done),
  osCancelled: num(r.os_cancelled),
  osPending: num(r.os_pending),
  osStone: num(r.os_stone),
  osTon: num(r.os_ton),
  byGroup: r.by_group ?? {},
});

/** Lê a produção diária de um intervalo de datas (o banco devolve no máximo 1.000 linhas por vez, por isso pagina). */
export async function fetchDailyProduction(from: string, to: string, franchiseId?: string): Promise<DailyProductionRow[]> {
  const out: DailyProductionRow[] = [];
  const PAGINA = 1000;
  for (let inicio = 0; ; inicio += PAGINA) {
    let consulta = supabase
      .from('daily_production')
      .select('day,franchise_id,tech_key,agent_id,technician_name,os_done,os_cancelled,os_pending,os_stone,os_ton,by_group')
      .gte('day', from)
      .lte('day', to);
    if (franchiseId) consulta = consulta.eq('franchise_id', franchiseId);
    const { data, error } = await consulta
      .order('day', { ascending: true })
      .order('franchise_id', { ascending: true })
      .order('tech_key', { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw error;
    out.push(...(data ?? []).map(rowToDaily));
    if (!data || data.length < PAGINA) break;
  }
  return out;
}

export interface DailyStoneTonSum {
  stone: number;
  ton: number;
  baixadas: number;
  dias: number;
}

/** Soma, das OS baixadas importadas do Workfinity, quantas são Stone e quantas são TON numa franquia e mês. */
export async function sumDailyStoneTon(franchiseId: string, year: number, month: number): Promise<DailyStoneTonSum> {
  const mm = String(month).padStart(2, '0');
  const ultimo = String(new Date(year, month, 0).getDate()).padStart(2, '0');
  const rows = await fetchDailyProduction(`${year}-${mm}-01`, `${year}-${mm}-${ultimo}`, franchiseId);
  return {
    stone: rows.reduce((t, r) => t + r.osStone, 0),
    ton: rows.reduce((t, r) => t + r.osTon, 0),
    baixadas: rows.reduce((t, r) => t + r.osDone, 0),
    dias: new Set(rows.filter((r) => r.osDone > 0).map((r) => r.day)).size,
  };
}

/** Último dia que já tem produção importada (ou null se nunca importou). */
export async function fetchLatestDailyDay(): Promise<string | null> {
  const { data, error } = await supabase.from('daily_production').select('day').order('day', { ascending: false }).limit(1);
  if (error) throw error;
  return data && data.length > 0 ? String(data[0].day).slice(0, 10) : null;
}

/** Grava a importação (só Admin): substitui os números do mesmo dia e da mesma franquia. */
export async function replaceDailyProduction(rows: object[]): Promise<number> {
  const { data, error } = await supabase.rpc('replace_daily_production', { p_rows: rows });
  if (error) throw error;
  return Number(data ?? 0);
}

/**
 * Foto de perfil de cada franquia (id da franquia -> endereço da imagem).
 * Franquia sem foto simplesmente não aparece no resultado.
 */
export async function fetchFranchisePhotos(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('franchises').select('id,photo_url');
  if (error) throw error;
  const out: Record<string, string> = {};
  (data ?? []).forEach((r: any) => {
    if (r.photo_url) out[r.id] = r.photo_url;
  });
  return out;
}

/** Todos os meses de todas as franquias (para a visão "Todas as Competências"). */
export async function fetchAllFranchiseIndicators(): Promise<FranchiseMonthlyIndicator[]> {
  const { data, error } = await supabase.from('franchise_monthly_indicators').select('*');
  if (error) throw error;
  return (data ?? []).map(rowToIndicator);
}

export async function deleteFranchiseIndicator(id: string): Promise<void> {
  const { error } = await supabase.from('franchise_monthly_indicators').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertFranchiseIndicator(ind: FranchiseMonthlyIndicator): Promise<FranchiseMonthlyIndicator> {
  const { data, error } = await supabase
    .from('franchise_monthly_indicators')
    .upsert(
      {
        franchise_id: ind.franchiseId,
        year: ind.year,
        month: ind.month,
        tma_stone_actual: ind.tmaStoneActual,
        tma_ton_actual: ind.tmaTonActual,
        ciclo_actual: ind.cicloActual,
        rebate_amount: ind.rebateAmount,
        total_service_orders: ind.totalServiceOrders,
        notes: ind.notes ?? null,
        updated_at: new Date().toISOString(),
        // só envia o que foi informado: quem não passa o campo não apaga o que já existe
        ...(ind.osStone !== undefined ? { os_stone: ind.osStone } : {}),
        ...(ind.osTon !== undefined ? { os_ton: ind.osTon } : {}),
        ...(ind.slaStone !== undefined ? { sla_stone: ind.slaStone } : {}),
        ...(ind.slaTon !== undefined ? { sla_ton: ind.slaTon } : {}),
        ...(ind.slaBobina !== undefined ? { sla_bobina: ind.slaBobina } : {}),
        ...(ind.tmaBobina !== undefined ? { tma_bobina: ind.tmaBobina } : {}),
      },
      { onConflict: 'franchise_id,year,month' }
    )
    .select()
    .single();
  if (error) throw error;
  return rowToIndicator(data);
}

/** Pede ao banco o % variável sugerido (regra por indicador, reversa x normal). */
export async function calculateAngelVariablePct(
  franchiseId: string,
  year: number,
  month: number,
  doesReverseLogistics: boolean
): Promise<number> {
  const { data, error } = await supabase.rpc('calculate_angel_variable_pct', {
    p_franchise_id: franchiseId,
    p_year: year,
    p_month: month,
    p_does_reverse_logistics: doesReverseLogistics,
  });
  if (error) throw error;
  return num(data);
}

// ---------------------------------------------------------------------------
// Variável do Angel — o cálculo completo é feito pelo banco (passo a passo)
// ---------------------------------------------------------------------------
export interface AngelMonthlyIndicator {
  id?: string;
  agentId: string;
  year: number;
  month: number;
  totalServiceOrders: number;
}

const rowToAngelIndicator = (r: any): AngelMonthlyIndicator => ({
  id: r.id,
  agentId: r.agent_id,
  year: r.year,
  month: r.month,
  totalServiceOrders: num(r.total_service_orders),
});

export async function fetchAngelIndicators(year: number, month: number): Promise<AngelMonthlyIndicator[]> {
  const { data, error } = await supabase
    .from('angel_monthly_indicators')
    .select('id,agent_id,year,month,total_service_orders')
    .eq('year', year)
    .eq('month', month);
  if (error) throw error;
  return (data ?? []).map(rowToAngelIndicator);
}

/** Grava só o total de OS do Angel no mês (não mexe nos demais campos da linha). */
export async function upsertAngelOs(
  agentId: string,
  year: number,
  month: number,
  totalServiceOrders: number
): Promise<AngelMonthlyIndicator> {
  const { data, error } = await supabase
    .from('angel_monthly_indicators')
    .upsert(
      {
        agent_id: agentId,
        year,
        month,
        total_service_orders: totalServiceOrders,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agent_id,year,month' }
    )
    .select('id,agent_id,year,month,total_service_orders')
    .single();
  if (error) throw error;
  return rowToAngelIndicator(data);
}

export interface AngelVariableCalc {
  /** 'OK' ou o motivo de não ter calculado (SEM_REBATE, SEM_OS_ANGEL, ...) */
  status: string;
  doesReverseLogistics: boolean;
  deductionPct: number;
  rebateTotal: number | null;
  rebateBonus: number | null;
  franchiseOs: number | null;
  angelOs: number | null;
  angelRebate: number | null;
  variablePct: number | null;
  variableAmount: number | null;
  hitTmaStone: boolean | null;
  hitTmaTon: boolean | null;
  hitCiclo: boolean | null;
}

const numOrNull = (v: any): number | null => (v === null || v === undefined ? null : Number(v));

/**
 * Pede ao banco o cálculo completo do variável de um Angel no mês:
 * rebate total -> desconto -> parte do Angel (pelas OS) -> % dos indicadores -> R$.
 */
export async function calculateAngelVariable(agentId: string, year: number, month: number): Promise<AngelVariableCalc> {
  const { data, error } = await supabase.rpc('calculate_angel_variable', {
    p_agent_id: agentId,
    p_year: year,
    p_month: month,
  });
  if (error) throw error;
  return {
    status: String(data.status),
    doesReverseLogistics: !!data.does_reverse_logistics,
    deductionPct: num(data.deduction_pct, 10),
    rebateTotal: numOrNull(data.rebate_total),
    rebateBonus: numOrNull(data.rebate_bonus),
    franchiseOs: numOrNull(data.franchise_os),
    angelOs: numOrNull(data.angel_os),
    angelRebate: numOrNull(data.angel_rebate),
    variablePct: numOrNull(data.variable_pct),
    variableAmount: numOrNull(data.variable_amount),
    hitTmaStone: data.hit_tma_stone ?? null,
    hitTmaTon: data.hit_tma_ton ?? null,
    hitCiclo: data.hit_ciclo ?? null,
  };
}

export interface AgentEquipment {
  agentId: string;
  jaqueta: string | null;
  calca: string | null;
  botas: string | null;
  capacete: string | null;
}

/** Tamanhos de uniforme/EPI cadastrados (Admin vê todos; o banco filtra para os demais). */
export async function fetchAgentEquipment(): Promise<AgentEquipment[]> {
  const { data, error } = await supabase.from('agent_equipment').select('agent_id,jaqueta,calca,botas,capacete');
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    agentId: r.agent_id,
    jaqueta: r.jaqueta ?? null,
    calca: r.calca ?? null,
    botas: r.botas ?? null,
    capacete: r.capacete ?? null,
  }));
}

/** Quem faz logística reversa (id da pessoa -> sim/não). Define quanto cada Angel herda dos indicadores da franquia. */
export async function fetchReverseFlags(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from('profiles').select('id,does_reverse_logistics');
  if (error) throw error;
  const out: Record<string, boolean> = {};
  (data ?? []).forEach((r: any) => {
    out[r.id] = !!r.does_reverse_logistics;
  });
  return out;
}

/** Marca se o Angel faz logística reversa (só Admin consegue; o banco confere). */
export async function setReverseLogistics(agentId: string, value: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ does_reverse_logistics: value }).eq('id', agentId);
  if (error) throw error;
}

function rowToCompensation(row: any): AgentCompensationRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    year: row.year,
    month: row.month,
    baseSalary: num(row.base_salary),
    doesReverseLogistics: !!row.does_reverse_logistics,
    variablePct: num(row.variable_pct),
    variableBonus: num(row.variable_bonus),
    maintenanceAllowance: num(row.maintenance_allowance),
    foodAllowance: num(row.food_allowance),
    fuelAllowance: num(row.fuel_allowance),
    lodgingAllowance: num(row.lodging_allowance),
    notes: row.notes ?? undefined,
  };
}

export async function fetchCompensationRecords(year: number, month: number): Promise<AgentCompensationRecord[]> {
  const { data, error } = await supabase
    .from('agent_compensation_records')
    .select('*')
    .eq('year', year)
    .eq('month', month);
  if (error) throw error;
  return (data ?? []).map(rowToCompensation);
}

export async function upsertCompensationRecord(rec: AgentCompensationRecord): Promise<AgentCompensationRecord> {
  const { data, error } = await supabase
    .from('agent_compensation_records')
    .upsert(
      {
        agent_id: rec.agentId,
        year: rec.year,
        month: rec.month,
        base_salary: rec.baseSalary,
        does_reverse_logistics: rec.doesReverseLogistics,
        variable_pct: rec.variablePct,
        variable_bonus: rec.variableBonus,
        maintenance_allowance: rec.maintenanceAllowance,
        food_allowance: rec.foodAllowance,
        fuel_allowance: rec.fuelAllowance,
        lodging_allowance: rec.lodgingAllowance,
        notes: rec.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'agent_id,year,month' }
    )
    .select()
    .single();
  if (error) throw error;
  return rowToCompensation(data);
}

function rowToLead(row: any): Camisa10Lead {
  return {
    id: row.id,
    agentId: row.agent_id,
    leadDescription: row.lead_description,
    status: row.status,
    bonusAmount: row.bonus_amount === null ? null : num(row.bonus_amount),
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

export async function fetchCamisa10Leads(): Promise<Camisa10Lead[]> {
  const { data, error } = await supabase
    .from('camisa10_leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToLead);
}

export async function createCamisa10Lead(agentId: string, leadDescription: string): Promise<Camisa10Lead> {
  const { data, error } = await supabase
    .from('camisa10_leads')
    .insert({ agent_id: agentId, lead_description: leadDescription })
    .select()
    .single();
  if (error) throw error;
  return rowToLead(data);
}

export async function reviewCamisa10Lead(
  id: string,
  decision: 'APROVADO' | 'REJEITADO',
  bonusAmount?: number
): Promise<Camisa10Lead> {
  const { data, error } = await supabase
    .from('camisa10_leads')
    .update({
      status: decision,
      bonus_amount: decision === 'APROVADO' ? bonusAmount ?? null : null,
      approved_at: decision === 'APROVADO' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToLead(data);
}
