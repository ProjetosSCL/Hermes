/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AgentJourneyCard } from './components/AgentJourneyCard';
import { QuickActionsGrid } from './components/QuickActionsGrid';
import { MachineScannerModal } from './components/MachineScannerModal';
import { MachineManagementModal } from './components/MachineManagementModal';
import { SLATrackerModal } from './components/SLATrackerModal';
import { ChecklistModal } from './components/ChecklistModal';
import { FleetModal } from './components/FleetModal';
import { LeaderDashboard } from './components/LeaderDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { JsonViewerModal } from './components/JsonViewerModal';
import { LoginScreen } from './components/LoginScreen';
import { HermesPerformanceModule } from './components/performance/HermesPerformanceModule';

import {
  Machine,
  MachineMovement,
  MachineStatus,
  UserAgent,
  Franchise,
  SLATicket,
  ChecklistRecord,
  FuelLog,
  Vehicle,
  SystemDataExport,
} from './types';
import { supabase } from './services/supabaseClient';
import * as api from './services/api';

import { ShieldCheck, ArrowRightLeft, Clock, MapPin, Fuel, FileCheck, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Authentication & User State — agora baseado na sessão real do Supabase Auth,
  // não mais em localStorage/lista local. `authChecked` evita mostrar a tela
  // de login por um instante antes de sabermos se já existe sessão salva.
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAgent | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'AGENTE' | 'LIDER' | 'ADMIN' | 'PERFORMANCE'>('AGENTE');

  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [agentsList, setAgentsList] = useState<UserAgent[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [movements, setMovements] = useState<MachineMovement[]>([]);
  const [slaTickets, setSlaTickets] = useState<SLATicket[]>([]);
  const [checklists, setChecklists] = useState<ChecklistRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Carrega o perfil + todos os dados do banco assim que há uma sessão válida.
  const loadAllData = async (userId: string) => {
    setIsDataLoading(true);
    setLoadError(null);
    try {
      const profile = await api.fetchMyProfile(userId);
      setCurrentUser(profile);
      setViewMode(profile.role === 'ADMIN' ? 'ADMIN' : profile.role === 'LIDER_FRANQUIA' ? 'LIDER' : 'AGENTE');

      const [franchisesData, agentsData, machinesData, ticketsData, checklistsData, vehiclesData, fuelLogsData] =
        await Promise.all([
          api.fetchFranchises(),
          api.fetchAgents(),
          api.fetchMachines(),
          api.fetchSlaTickets(),
          api.fetchChecklists(),
          api.fetchVehicles(),
          api.fetchFuelLogs(),
        ]);

      setFranchises(franchisesData);
      setAgentsList(agentsData);
      setMachines(machinesData);
      setSlaTickets(ticketsData);
      setChecklists(checklistsData);
      setVehicles(vehiclesData);
      setFuelLogs(fuelLogsData);
    } catch (err: any) {
      console.error(err);
      setLoadError('Não foi possível carregar os dados do sistema. Verifique sua conexão e tente novamente.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // Observa mudanças de sessão (login, logout, expiração de token).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setIsAuthenticated(!!session);
      setAuthChecked(true);
      if (session) loadAllData(session.user.id);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) {
        loadAllData(session.user.id);
      } else {
        setCurrentUser(null);
        setFranchises([]);
        setAgentsList([]);
        setMachines([]);
        setSlaTickets([]);
        setChecklists([]);
        setVehicles([]);
        setFuelLogs([]);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await api.signOut();
  };

  // Admin Handlers — cada um grava direto no Supabase e só atualiza a tela
  // com o que o banco confirmou ter salvo (evita a UI "mentir" se a
  // gravação falhar).
  const handleAddFranchise = async (
    newFranchiseData: Omit<Franchise, 'id' | 'activeAgentsCount' | 'machinesStockCount'>
  ) => {
    try {
      const created = await api.createFranchise(newFranchiseData);
      setFranchises((prev) => [created, ...prev]);
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar a franquia. Tente novamente.');
    }
  };

  const handleUpdateFranchise = async (updatedFranchise: Franchise) => {
    try {
      const saved = await api.updateFranchise(updatedFranchise);
      setFranchises((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
    } catch (err) {
      console.error(err);
      alert('Não foi possível atualizar a franquia. Tente novamente.');
    }
  };

  const handleDeleteFranchise = async (id: string) => {
    try {
      await api.deleteFranchise(id);
      setFranchises((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir a franquia. Tente novamente.');
    }
  };

  // Criar um agente novo cria também um login dele — isso passa por uma
  // Edge Function no servidor (ver comentário em services/api.ts).
  const handleAddAgent = async (newAgentData: Omit<UserAgent, 'id' | 'status' | 'shiftPauseTotalSeconds'>) => {
    const franchise = franchises.find((f) => f.name === newAgentData.franchiseName);
    if (!franchise) {
      alert('Selecione uma franquia válida para o agente.');
      return;
    }
    try {
      const resultado = await api.inviteAgent({
        name: newAgentData.name,
        email: newAgentData.email,
        role: newAgentData.role,
        franchiseId: franchise.id,
        jobTitle: newAgentData.jobTitle,
        phone: newAgentData.phone,
      });
      const refreshed = await api.fetchAgents();
      setAgentsList(refreshed);
      alert(
        `Agente criado!\n\nE-mail: ${resultado.email}\nSenha provisória: ${resultado.temporaryPassword}\n\nEnvie essa senha para a pessoa por um canal seguro (ex: WhatsApp direto). Ela pode trocar a senha depois de entrar.`
      );
    } catch (err) {
      console.error(err);
      alert('Não foi possível criar o agente. Tente novamente.');
    }
  };

  const handleAddMachinesBulk = async (
    machinesToCreate: Array<Omit<Machine, 'id' | 'lastCheckIn'>>,
    franchiseId?: string
  ) => {
    try {
      const created = await api.createMachinesBulk(machinesToCreate, franchiseId);
      setMachines((prev) => [...created, ...prev]);
    } catch (err) {
      console.error(err);
      alert('Não foi possível cadastrar as máquinas. Tente novamente.');
    }
  };

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMachineListOpen, setIsMachineListOpen] = useState(false);
  const [isSLATrackerOpen, setIsSLATrackerOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isFleetOpen, setIsFleetOpen] = useState(false);
  const [isJsonInspectorOpen, setIsJsonInspectorOpen] = useState(false);

  // Active SLA Ticket for Agent
  const activeTicket = currentUser
    ? slaTickets.find((t) => t.id === currentUser.currentTicketId && t.status !== 'CONCLUIDO') || slaTickets[1]
    : undefined;

  // Update Agent Journey Status — grava no banco para o Líder/Admin verem em tempo real.
  const handleUpdateAgentStatus = async (newStatus: 'EM_JORNADA' | 'PAUSADO' | 'FORA_DE_SERVICO') => {
    if (!currentUser) return;
    const shiftStart = newStatus === 'EM_JORNADA' && !currentUser.shiftStart ? new Date().toISOString() : currentUser.shiftStart;
    try {
      await api.updateAgentStatus(currentUser.id, newStatus, shiftStart);
      setCurrentUser((prev) => (prev ? { ...prev, status: newStatus, shiftStart } : prev));
    } catch (err) {
      console.error(err);
      alert('Não foi possível atualizar seu status. Tente novamente.');
    }
  };

  // Update Machine Custody and add Movement Log — agora grava no banco.
  // Cada clique gera UMA chave de idempotência; se o app reenviar a mesma
  // ação (ex: perda de sinal em campo), o banco recusa a duplicata sozinho.
  const handleUpdateMachineCustody = async (
    machineId: string,
    newCustodyId: string,
    newCustodyName: string,
    newStatus: MachineStatus,
    reason: MachineMovement['reason'],
    signatureUrl?: string
  ) => {
    if (!currentUser) return;
    const targetMachine = machines.find((m) => m.id === machineId);
    if (!targetMachine) return;

    const idempotencyKey = api.newIdempotencyKey();
    try {
      const { machine: updatedMachine, movement } = await api.updateMachineCustody({
        machine: targetMachine,
        newCustodyId,
        newCustodyName,
        newStatus,
        reason,
        agentId: currentUser.id,
        agentName: currentUser.name,
        signatureUrl,
        idempotencyKey,
      });

      setMachines((prev) => prev.map((m) => (m.id === machineId ? updatedMachine : m)));
      setMovements((prev) => [movement, ...prev]);

      if (reason === 'Entrega Cliente') {
        await api.incrementDailyGoalCompleted(currentUser.id);
        setCurrentUser((prev) =>
          prev ? { ...prev, dailyGoal: { ...prev.dailyGoal, completed: prev.dailyGoal.completed + 1 } } : prev
        );
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível registrar a transferência da máquina. Tente novamente.');
    }
  };

  // Complete SLA Ticket — idempotencyKey evita concluir o mesmo chamado 2x.
  const handleCompleteSLATicket = async (ticketId: string) => {
    if (!currentUser) return;
    try {
      await api.completeSlaTicket(ticketId, api.newIdempotencyKey());
      setSlaTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: 'CONCLUIDO' as const } : t)));
      await api.incrementDailyGoalCompleted(currentUser.id);
      setCurrentUser((prev) =>
        prev ? { ...prev, dailyGoal: { ...prev.dailyGoal, completed: prev.dailyGoal.completed + 1 } } : prev
      );
    } catch (err) {
      console.error(err);
      alert('Não foi possível concluir o chamado. Tente novamente.');
    }
  };

  // Save Checklist
  const handleSaveChecklist = async (record: ChecklistRecord) => {
    try {
      await api.saveChecklist(record, api.newIdempotencyKey());
      setChecklists((prev) => [record, ...prev]);
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar o checklist. Tente novamente.');
    }
  };

  // Save Fuel Log
  const handleAddFuelLog = async (log: FuelLog) => {
    try {
      await api.addFuelLog(log, api.newIdempotencyKey());
      setFuelLogs((prev) => [log, ...prev]);
      setVehicles((prev) =>
        prev.map((v) => (v.plate === log.vehiclePlate ? { ...v, currentKm: log.currentKm, averageKmL: log.calculatedKmL } : v))
      );
    } catch (err) {
      console.error(err);
      alert('Não foi possível registrar o abastecimento. Tente novamente.');
    }
  };

  // Raw JSON Export Data Structure
  const fullSystemData: SystemDataExport = {
    franchises,
    users: agentsList,
    machines,
    movements,
    slaTickets,
    checklists,
    fleetLogs: fuelLogs,
    vehicles,
  };

  // Ainda não sabemos se há sessão salva — evita "piscar" a tela de login.
  if (!authChecked) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  if (isDataLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-500">
          {loadError ?? 'Carregando seus dados...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white pb-10">
      {/* Header Bar */}
      <Header
        currentUser={currentUser}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        onOpenJsonInspector={() => setIsJsonInspectorOpen(true)}
        onOpenMachineList={() => setIsMachineListOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {viewMode === 'AGENTE' ? (
          /* Visão Agente de Campo */
          <motion.div
            key="agente"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Jornada do Agente Hero Card */}
            <AgentJourneyCard
              agent={currentUser}
              activeTicket={activeTicket}
              onUpdateStatus={handleUpdateAgentStatus}
              onOpenSLATracker={() => setIsSLATrackerOpen(true)}
            />

            {/* Quick Actions Grid */}
            <QuickActionsGrid
              onOpenScanner={() => setIsScannerOpen(true)}
              onOpenSLATracker={() => setIsSLATrackerOpen(true)}
              onOpenFleetFuel={() => setIsFleetOpen(true)}
              onOpenChecklist={() => setIsChecklistOpen(true)}
            />

            {/* Active Inventory with Agent */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Terminais POS Sob Sua Custódia (Em Campo)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Máquinas alocadas no seu veículo de atendimento.
                  </p>
                </div>
                <button
                  onClick={() => setIsMachineListOpen(true)}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Ver Todos ({machines.length})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {machines
                  .filter((m) => m.currentCustodyId === currentUser.id)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 hover:border-emerald-500 rounded-xl transition-all flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          {m.model}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{m.lote}</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">NS: {m.serialNumber}</div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                        <span>Bateria: {m.batteryLevel}%</span>
                        <button
                          onClick={() => setIsScannerOpen(true)}
                          className="text-emerald-700 font-bold hover:underline"
                        >
                          Transferir
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        ) : viewMode === 'LIDER' ? (
          /* Visão Líder de Franquia */
          <motion.div
            key="lider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <LeaderDashboard
              currentUser={currentUser}
              machines={machines}
              agents={agentsList}
              slaTickets={slaTickets}
              fuelLogs={fuelLogs}
              vehicles={vehicles}
              onOpenMachineList={() => setIsMachineListOpen(true)}
            />
          </motion.div>
        ) : viewMode === 'ADMIN' ? (
          /* Visão Administrador Geral */
          <motion.div
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminDashboard
              currentUser={currentUser}
              franchises={franchises}
              agents={agentsList}
              machines={machines}
              onAddFranchise={handleAddFranchise}
              onUpdateFranchise={handleUpdateFranchise}
              onDeleteFranchise={handleDeleteFranchise}
              onAddAgent={handleAddAgent}
              onAddMachinesBulk={handleAddMachinesBulk}
            />
          </motion.div>
        ) : (
          /* Módulo HERMES PERFORMANCE */
          <motion.div
            key="performance"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <HermesPerformanceModule />
          </motion.div>
        )}
      </main>

      {/* All System Modals */}
      <MachineScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        machines={machines}
        onUpdateMachineCustody={handleUpdateMachineCustody}
      />

      <MachineManagementModal
        isOpen={isMachineListOpen}
        onClose={() => setIsMachineListOpen(false)}
        machines={machines}
        movements={movements}
        onOpenScanner={() => {
          setIsMachineListOpen(false);
          setIsScannerOpen(true);
        }}
      />

      <SLATrackerModal
        isOpen={isSLATrackerOpen}
        onClose={() => setIsSLATrackerOpen(false)}
        activeTicket={activeTicket}
        onCompleteTicket={handleCompleteSLATicket}
      />

      <ChecklistModal
        isOpen={isChecklistOpen}
        onClose={() => setIsChecklistOpen(false)}
        machines={machines}
        onSaveChecklist={handleSaveChecklist}
      />

      <FleetModal
        isOpen={isFleetOpen}
        onClose={() => setIsFleetOpen(false)}
        vehicles={vehicles}
        fuelLogs={fuelLogs}
        onAddFuelLog={handleAddFuelLog}
      />

      <JsonViewerModal
        isOpen={isJsonInspectorOpen}
        onClose={() => setIsJsonInspectorOpen(false)}
        data={fullSystemData}
      />
    </div>
  );
}
