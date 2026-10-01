/**
 * Data Structures for Stone Franchise Logistics System
 */

export type MachineStatus = 'ESTOQUE' | 'COM_AGENTE' | 'PRODUCAO' | 'MANUTENCAO';

export type MachineModel = string;

export interface Machine {
  id: string;
  serialNumber: string; // NS (Número de Série)
  model: MachineModel;
  status: MachineStatus;
  rawStatus?: string;
  contratante?: string;
  prestadorServico?: string;
  batteryLevel: number; // 0-100
  connectivity: '4G + Wi-Fi' | '4G' | 'Wi-Fi' | 'Off-line';
  currentCustodyId: string; // Agent ID or Merchant Name
  currentCustodyName: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  lastCheckIn: string;
  lote: string;
  notes?: string;
}

export interface MachineMovement {
  id: string;
  machineId: string;
  machineSerial: string;
  timestamp: string;
  fromCustody: string;
  toCustody: string;
  previousStatus: MachineStatus;
  newStatus: MachineStatus;
  agentId: string;
  agentName: string;
  reason: 'Entrega Cliente' | 'Retirada Manutenção' | 'Carga de Estoque' | 'Transferência Agente' | 'Devolução';
  signatureUrl?: string;
}

export interface Franchise {
  id: string;
  name: string;
  cityRegion: string;
  code: string;
  cnpj?: string;
  activeAgentsCount: number;
  machinesStockCount: number;
  status: 'ATIVA' | 'INATIVA';
  responsibleLeader?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export type AgentStatus = 'EM_JORNADA' | 'PAUSADO' | 'FORA_DE_SERVICO' | 'EM_PAUSA' | 'FORA_JORNADA';

export interface UserAgent {
  id: string;
  name: string;
  email: string;
  role: 'AGENTE_CAMPO' | 'LIDER_FRANQUIA' | 'TECNICO' | 'ADMIN';
  jobTitle?: string;
  phone?: string;
  franchiseName: string;
  avatarUrl: string;
  status: AgentStatus;
  dailyGoal: {
    target: number;
    completed: number;
  };
  shiftStart?: string;
  shiftPauseTotalSeconds?: number;
  currentTicketId?: string;
}

export interface SLATicket {
  id: string;
  merchantName: string;
  cnpjs: string;
  address: string;
  type: 'INSTALACAO' | 'TROCA_DE_MAQUINA' | 'MANUTENCAO_URGENTE' | 'TREINAMENTO';
  priority: 'ALTA' | 'MEDIA' | 'BAIXA';
  allocatedSlaMinutes: number;
  startedAt: string;
  estimatedArrivalAt: string;
  status: 'A_CAMINHO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO';
  assignedAgentId: string;
  notes?: string;
}

export interface ChecklistRecord {
  id: string;
  ticketId?: string;
  merchantName: string;
  cnpj: string;
  machineSerial: string;
  machineModel: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  machineCondition: 'NOVO' | 'BOM_ESTADO' | 'DANIFICADO' | 'IRREGULAR';
  damageDetails?: {
    type: 'TELA_QUEBRADA' | 'BOBINA_PRESA' | 'DEFEITO_CABO' | 'TAMPER_VIOLADO' | 'OUTROS';
    severity: 'ALTA' | 'MEDIA' | 'BAIXA';
    description: string;
    photoUrl?: string;
  };
  installationTests?: {
    testTransactionPassed: boolean;
    coilCheckPassed: boolean;
    signalStrengthPercent: number;
  };
  signatureUrl?: string;
  status: 'APROVADO' | 'COM_RESSALVAS' | 'REJEITADO';
}

export interface FuelLog {
  id: string;
  vehiclePlate: string;
  vehicleModel: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  currentKm: number;
  liters: number;
  totalCostR$: number;
  fuelType: 'GASOLINA' | 'ETANOL' | 'DIESEL';
  gasStation: string;
  calculatedKmL: number;
  calculatedCostPerKm: number;
}

export interface Vehicle {
  plate: string;
  model: string;
  assignedAgentId: string;
  assignedAgentName: string;
  currentKm: number;
  averageKmL: number;
  status: 'EM_USO' | 'DISPONIVEL' | 'MANUTENCAO';
}

export interface SystemDataExport {
  franchises: Franchise[];
  users: UserAgent[];
  machines: Machine[];
  movements: MachineMovement[];
  slaTickets: SLATicket[];
  checklists: ChecklistRecord[];
  fleetLogs: FuelLog[];
  vehicles: Vehicle[];
}
