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
