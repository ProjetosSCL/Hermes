import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  Users, 
  Package, 
  Plus, 
  Search, 
  CheckCircle2, 
  Building, 
  UserPlus, 
  ShieldCheck, 
  MapPin, 
  Mail, 
  Target, 
  QrCode, 
  Sparkles,
  BarChart3,
  X,
  Trash2,
  Check,
  Smartphone,
  Pencil,
  Phone,
  UserCheck,
  FileText,
  AlertCircle,
  Edit3,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Filter,
  Shirt,
  User,
  PhoneCall,
  MessageSquare
} from 'lucide-react';
import { Franchise, UserAgent, Machine, MachineModel, MachineStatus } from '../types';
import { AngelRegistration, initialAngelRegistrations } from '../data/angelRegistrationData';

interface AdminDashboardProps {
  currentUser?: UserAgent;
  franchises: Franchise[];
  agents: UserAgent[];
  machines: Machine[];
  onAddFranchise: (newFranchise: Omit<Franchise, 'id' | 'activeAgentsCount' | 'machinesStockCount'>) => void;
  onUpdateFranchise?: (updatedFranchise: Franchise) => void;
  onDeleteFranchise?: (id: string) => void;
  onAddAgent: (newAgent: Omit<UserAgent, 'id' | 'status' | 'shiftPauseTotalSeconds'>) => void;
  onAddMachinesBulk: (machinesToCreate: Array<Omit<Machine, 'id' | 'lastCheckIn'>>) => void;
  onSyncSheets?: (url?: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  franchises,
  agents,
  machines,
  onAddFranchise,
  onUpdateFranchise,
  onDeleteFranchise,
  onAddAgent,
  onAddMachinesBulk,
  onSyncSheets,
}) => {
  const [activeTab, setActiveTab] = useState<'FRANQUIAS' | 'AGENTES' | 'ESTOQUE' | 'GREEN_ANGELS'>('FRANQUIAS');
  
  // Green Angels Registration state
  const [angelRegistrations, setAngelRegistrations] = useState<AngelRegistration[]>(initialAngelRegistrations);
  const [isAngelModalOpen, setIsAngelModalOpen] = useState(false);
  const [editingAngel, setEditingAngel] = useState<AngelRegistration | null>(null);
  
  // Angel form state
  const [agName, setAgName] = useState('');
  const [agFranquia, setAgFranquia] = useState('');
  const [agWhatsapp, setAgWhatsapp] = useState('');
  const [agJaqueta, setAgJaqueta] = useState('');
  const [agCalca, setAgCalca] = useState('');
  const [agBotas, setAgBotas] = useState('');
  const [agCapacete, setAgCapacete] = useState('');
  const [agFotoUrl, setAgFotoUrl] = useState('');

  // Search query & Stock Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('TODOS');
  const [stockContractorFilter, setStockContractorFilter] = useState<string>('TODOS');
  const [stockProviderFilter, setStockProviderFilter] = useState<string>('TODOS');

  // Modals state
  const [isAddFranchiseOpen, setIsAddFranchiseOpen] = useState(false);
  const [isEditFranchiseOpen, setIsEditFranchiseOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isSyncSheetsOpen, setIsSyncSheetsOpen] = useState(false);
  const [customSheetUrl, setCustomSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states - Add Franchise
  const [fName, setFName] = useState('');
  const [fCity, setFCity] = useState('');
  const [fCode, setFCode] = useState('');
  const [fCnpj, setFCnpj] = useState('');

  // Form states - Edit Franchise
  const [eName, setEName] = useState('');
  const [eCity, setECity] = useState('');
  const [eCode, setECode] = useState('');
  const [eCnpj, setECnpj] = useState('');
  const [eStatus, setEStatus] = useState<'ATIVA' | 'INATIVA'>('ATIVA');
  const [eLeader, setELeader] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [eNotes, setENotes] = useState('');
  const [eActiveAgentsCount, setEActiveAgentsCount] = useState(0);
  const [eMachinesStockCount, setEMachinesStockCount] = useState(0);

  // Open Edit Franchise Modal
  const handleOpenEditFranchise = (f: Franchise) => {
    setEditingFranchise(f);
    setEName(f.name);
    setECity(f.cityRegion);
    setECode(f.code);
    setECnpj(f.cnpj || '');
    setEStatus(f.status);
    setELeader(f.responsibleLeader || '');
    setEPhone(f.phone || '');
    setEAddress(f.address || '');
    setENotes(f.notes || '');
    setEActiveAgentsCount(f.activeAgentsCount);
    setEMachinesStockCount(f.machinesStockCount);
    setIsEditFranchiseOpen(true);
  };

  // Submit Edit Franchise
  const handleSaveEditedFranchise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFranchise || !eName.trim() || !eCity.trim()) return;

    const updated: Franchise = {
      ...editingFranchise,
      name: eName.trim(),
      cityRegion: eCity.trim(),
      code: eCode.trim() || editingFranchise.code,
      cnpj: eCnpj.trim() || undefined,
      status: eStatus,
      responsibleLeader: eLeader.trim() || undefined,
      phone: ePhone.trim() || undefined,
      address: eAddress.trim() || undefined,
      notes: eNotes.trim() || undefined,
      activeAgentsCount: Number(eActiveAgentsCount) || 0,
      machinesStockCount: Number(eMachinesStockCount) || 0,
    };

    if (onUpdateFranchise) {
      onUpdateFranchise(updated);
    }
    setIsEditFranchiseOpen(false);
    setEditingFranchise(null);
    showToast(`Franquia "${eName}" atualizada com sucesso!`);
  };

  // Form states - Agent
  const [aName, setAName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aRole, setARole] = useState<'AGENTE_CAMPO' | 'LIDER_FRANQUIA' | 'TECNICO'>('AGENTE_CAMPO');
  const [aFranchise, setAFranchise] = useState('');
  const [aGoal, setAGoal] = useState(15);

  // Form states - Stock/Machines
  const [mModel, setMModel] = useState<MachineModel>('Stone Smart S920');
  const [mLote, setMLote] = useState(`LOTE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [mQuantity, setMQuantity] = useState(5);
  const [mCustomSerials, setMCustomSerials] = useState('');
  const [mCustody, setMCustody] = useState('');

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Submit Franchise
  const handleCreateFranchise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !fCity.trim()) return;

    onAddFranchise({
      name: fName.trim(),
      cityRegion: fCity.trim(),
      code: fCode.trim() || `FRAN-${Math.floor(100 + Math.random() * 900)}`,
      cnpj: fCnpj.trim() || '00.000.000/0001-00',
      status: 'ATIVA',
    });

    setFName('');
    setFCity('');
    setFCode('');
    setFCnpj('');
    setIsAddFranchiseOpen(false);
    showToast('Franquia cadastrada com sucesso!');
  };

  // Submit Agent
  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aName.trim() || !aEmail.trim()) return;

    const selectedFranchiseName = aFranchise || (franchises[0]?.name ?? 'Sertão, Cerrado e Litoral');

    onAddAgent({
      name: aName.trim(),
      email: aEmail.trim(),
      role: aRole,
      franchiseName: selectedFranchiseName,
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
      dailyGoal: {
        target: Number(aGoal) || 15,
        completed: 0,
      },
    });

    setAName('');
    setAEmail('');
    setIsAddAgentOpen(false);
    showToast(`Agente ${aName} cadastrado com sucesso!`);
  };

  // Submit Bulk Stock
  const handleCreateStock = (e: React.FormEvent) => {
    e.preventDefault();

    const targetCustodyName = mCustody || 'Estoque Central ' + (franchises[0]?.name ?? 'Hermes');
    const serialList: string[] = [];

    if (mCustomSerials.trim()) {
      const splitSerials = mCustomSerials.split('\n').map(s => s.trim()).filter(Boolean);
      serialList.push(...splitSerials);
    } else {
      for (let i = 0; i < mQuantity; i++) {
        const randNum = Math.floor(1000000 + Math.random() * 9000000);
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        serialList.push(`STN-${randNum}-${letter}`);
      }
    }

    const createdMachines = serialList.map((sn) => ({
      serialNumber: sn,
      model: mModel,
      status: 'ESTOQUE' as MachineStatus,
      batteryLevel: 100,
      connectivity: '4G + Wi-Fi' as const,
      currentCustodyId: 'STOCK-CENTRAL',
      currentCustodyName: targetCustodyName,
      location: {
        lat: -15.7938,
        lng: -47.8827,
        address: 'Centro de Distribuição Hermes Logística',
      },
      lote: mLote,
    }));

    onAddMachinesBulk(createdMachines);

    setIsAddStockOpen(false);
    setMCustomSerials('');
    showToast(`${createdMachines.length} maquininhas adicionadas ao estoque!`);
  };

  // Drive thumbnail helper
  const driveToDirectUrl = (url?: string) => {
    if (!url) return '';
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w500`;
    }
    return url;
  };

  // Sincronização via Google Sheets foi desativada: os dados de Angels agora
  // devem vir do banco de dados (Fase 2 do backend), não de uma planilha
  // pública. Mantido como não-operação para não quebrar o botão existente.
  const handleSyncAngelRegistrations = async () => {
    alert('A sincronização por planilha foi desativada por segurança. Em breve isso virá do banco de dados.');
  };
  const handleOpenAddAngel = () => {
    setEditingAngel(null);
    setAgName('');
    setAgFranquia('CE - Limoeiro do Norte');
    setAgWhatsapp('');
    setAgJaqueta('G');
    setAgCalca('42');
    setAgBotas('41');
    setAgCapacete('60');
    setAgFotoUrl('');
    setIsAngelModalOpen(true);
  };

  const handleOpenEditAngel = (angel: AngelRegistration) => {
    setEditingAngel(angel);
    setAgName(angel.nome);
    setAgFranquia(angel.franquia);
    setAgWhatsapp(angel.whatsapp || '');
    setAgJaqueta(angel.jaqueta || '');
    setAgCalca(angel.calca || '');
    setAgBotas(angel.botas || '');
    setAgCapacete(angel.capacete || '');
    setAgFotoUrl(angel.fotoUrl || '');
    setIsAngelModalOpen(true);
  };

  const handleSaveAngel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agName.trim() || !agFranquia.trim()) return;

    let franKey = agFranquia.toUpperCase();
    if (franKey.includes('CAMARA') || franKey.includes('CÂMARA')) franKey = 'JOÃO CAMARA';
    else if (franKey.includes('LIMOEIRO')) franKey = 'LIMOEIRO DO NORTE';
    else if (franKey.includes('TRAIRI')) franKey = 'TRAIRI';
    else if (franKey.includes('APODI')) franKey = 'APODI';
    else if (franKey.includes('PARACATU')) franKey = 'PARACATU';
    else if (franKey.includes('MACAU')) franKey = 'MACAU';
    else if (franKey.includes('PATOS')) franKey = 'PATOS';
    else if (franKey.includes('PARELHAS')) franKey = 'PARELHAS';

    if (editingAngel) {
      setAngelRegistrations(prev => prev.map(a => a.id === editingAngel.id ? {
        ...a,
        nome: agName.trim(),
        franquia: agFranquia.trim(),
        franquiaKey: franKey,
        whatsapp: agWhatsapp.trim(),
        jaqueta: agJaqueta.trim(),
        calca: agCalca.trim(),
        botas: agBotas.trim(),
        capacete: agCapacete.trim(),
        fotoUrl: agFotoUrl.trim(),
      } : a));
      showToast(`Angel "${agName}" atualizado com sucesso!`);
    } else {
      const newAngel: AngelRegistration = {
        id: `ANGEL-REG-${Date.now()}`,
        nome: agName.trim(),
        franquia: agFranquia.trim(),
        franquiaKey: franKey,
        whatsapp: agWhatsapp.trim(),
        jaqueta: agJaqueta.trim(),
        calca: agCalca.trim(),
        botas: agBotas.trim(),
        capacete: agCapacete.trim(),
        fotoUrl: agFotoUrl.trim(),
      };
      setAngelRegistrations(prev => [newAngel, ...prev]);
      showToast(`Angel "${agName}" cadastrado com sucesso!`);
    }

    setIsAngelModalOpen(false);
  };

  const handleDeleteAngel = (id: string, name: string) => {
    if (confirm(`Deseja realmente remover o cadastro de "${name}"?`)) {
      setAngelRegistrations(prev => prev.filter(a => a.id !== id));
      showToast(`Angel "${name}" removido.`);
    }
  };

  // Filtered lists
  const filteredFranchises = franchises.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.cityRegion.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.franchiseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic options for Stock filters
  const uniqueContractors = React.useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.contratante) set.add(m.contratante);
    });
    return Array.from(set).sort();
  }, [machines]);

  const uniqueProviders = React.useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      if (m.prestadorServico) set.add(m.prestadorServico);
      else if (m.notes && m.notes.startsWith('Prestador: ')) {
        set.add(m.notes.replace('Prestador: ', ''));
      }
    });
    return Array.from(set).sort();
  }, [machines]);

  const filteredStock = machines.filter((m) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      !query ||
      m.serialNumber.toLowerCase().includes(query) ||
      m.model.toLowerCase().includes(query) ||
      m.currentCustodyName.toLowerCase().includes(query) ||
      m.lote.toLowerCase().includes(query) ||
      (m.prestadorServico && m.prestadorServico.toLowerCase().includes(query)) ||
      (m.contratante && m.contratante.toLowerCase().includes(query));

    const matchesStatus =
      stockStatusFilter === 'TODOS' ||
      m.status === stockStatusFilter ||
      m.rawStatus === stockStatusFilter;

    const matchesContractor =
      stockContractorFilter === 'TODOS' ||
      m.contratante === stockContractorFilter;

    const matchesProvider =
      stockProviderFilter === 'TODOS' ||
      m.prestadorServico === stockProviderFilter ||
      (m.notes && m.notes.includes(stockProviderFilter));

    return matchesQuery && matchesStatus && matchesContractor && matchesProvider;
  });

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1.5">
              <Sparkles className="w-4 h-4" />
              <span>Painel do Administrador Geral • Hermes</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestão Global de Franquias & Inventário
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Controle centralizado para cadastrar franquias, criar novos acessos de agentes e alimentar estoques de maquininhas POS em tempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentUser && (
              <div className="hidden lg:flex items-center gap-3 bg-white/10 backdrop-blur-md p-2.5 px-3.5 rounded-2xl border border-white/15">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-400/50 flex-shrink-0"
                />
                <div className="text-left">
                  <div className="text-xs font-black text-white">{currentUser.name}</div>
                  <div className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider">
                    {currentUser.jobTitle || (currentUser.role === 'ADMIN' ? 'Administrador Geral' : currentUser.role === 'LIDER_FRANQUIA' ? 'Líder Regional' : 'Agente de Campo')}
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium">{currentUser.franchiseName}</div>
                </div>
              </div>
            )}

            <button
              onClick={() => setIsSyncSheetsOpen(true)}
              className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Sincronizar Google Sheets</span>
            </button>
            <button
              onClick={() => setIsAddFranchiseOpen(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md"
            >
              <Building className="w-4 h-4" />
              <span>+ Nova Franquia</span>
            </button>
            <button
              onClick={() => setIsAddAgentOpen(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>+ Novo Agente</span>
            </button>
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
            >
              <Package className="w-4 h-4 text-emerald-400" />
              <span>+ Carga de Estoque</span>
            </button>
          </div>
        </div>

        {/* Global Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block">Total de Franquias</span>
            <span className="text-xl font-black text-white mt-0.5 block">{franchises.length} Ativas</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block">Agentes Cadastrados</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">{agents.length} Agentes</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block">Total Maquininhas</span>
            <span className="text-xl font-black text-white mt-0.5 block">{machines.length} Unidades</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <span className="text-slate-400 font-semibold block">Em Estoque Central</span>
            <span className="text-xl font-black text-emerald-400 mt-0.5 block">
              {machines.filter(m => m.status === 'ESTOQUE').length} Disponíveis
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('FRANQUIAS')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'FRANQUIAS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Minhas Franquias ({franchises.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('AGENTES')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'AGENTES'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Meus Agentes ({agents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('ESTOQUE')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'ESTOQUE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Estoque de Máquinas ({machines.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('GREEN_ANGELS')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'GREEN_ANGELS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shirt className="w-4 h-4" />
            <span>Green Angels ({angelRegistrations.length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, região, NS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* TAB 1: FRANQUIAS */}
      {activeTab === 'FRANQUIAS' && (
        <div className="space-y-4">
          {/* Google Sheets Live Sync Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-800 flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-950 text-sm">
                    Franquias
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase">
                    Banco de Dados
                  </span>
                </div>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Dados carregados diretamente do banco de dados do sistema.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">
              Rede de Franquias Cadastradas ({franchises.length})
            </h3>
            <button
              onClick={() => setIsAddFranchiseOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Franquia</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFranchises.map((f) => (
              <div
                key={f.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-50 rounded-xl text-emerald-700 border border-emerald-100 flex-shrink-0">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider block">
                          {f.code}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 leading-tight">{f.name}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        f.status === 'ATIVA' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {f.status}
                      </span>
                      <button
                        onClick={() => handleOpenEditFranchise(f)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                        title="Editar Franquia"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-medium text-slate-800">{f.cityRegion}</span>
                    </div>

                    {f.cnpj && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        CNPJ: {f.cnpj}
                      </div>
                    )}

                    {f.responsibleLeader && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-700">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Líder: <strong>{f.responsibleLeader}</strong></span>
                      </div>
                    )}

                    {f.phone && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Contato: <strong>{f.phone}</strong></span>
                      </div>
                    )}

                    {f.address && (
                      <div className="text-[11px] text-slate-600">
                        Sede: {f.address}
                      </div>
                    )}

                    {f.notes && (
                      <div className="p-2 bg-slate-50 rounded-xl text-[11px] text-slate-600 italic border border-slate-100">
                        "{f.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-slate-100">
                    <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">AGENTES</span>
                      <span className="text-sm font-extrabold text-slate-900">{f.activeAgentsCount} Ativos</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">ESTOQUE POS</span>
                      <span className="text-sm font-extrabold text-emerald-700">{f.machinesStockCount} Máqs</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditFranchise(f)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 py-1.5 rounded-xl font-bold text-xs transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Dados</span>
                    </button>
                    {onDeleteFranchise && (
                      <button
                        onClick={() => {
                          if (confirm(`Deseja remover a franquia "${f.name}"?`)) {
                            onDeleteFranchise(f.id);
                            showToast(`Franquia "${f.name}" removida.`);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-200"
                        title="Remover Franquia"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: AGENTES */}
      {activeTab === 'AGENTES' && (
        <div className="space-y-4">
          {/* Google Sheets Live Sync Banner for Agentes */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-800 flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-950 text-sm">
                    Aba 'Agentes' do Google Sheets Integrada ({agents.length} Agentes)
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase">
                    Banco de Dados
                  </span>
                </div>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Sócios, líderes e agentes carregados diretamente do banco de dados do sistema.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setIsSyncSheetsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-extrabold transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Re-sincronizar</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">Agentes e Líderes Registrados ({filteredAgents.length})</h3>
            <button
              onClick={() => setIsAddAgentOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Agente</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((ag) => (
              <div
                key={ag.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={ag.avatarUrl}
                    alt={ag.name}
                    onError={(e) => {
                      // Fallback image if drive link requires auth or fails
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                    }}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/20 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border inline-block truncate max-w-full ${
                      ag.role === 'ADMIN'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {ag.role === 'ADMIN' ? '👑 Admin' : ag.jobTitle || (ag.role === 'AGENTE_CAMPO' ? 'Agente de Campo' : ag.role === 'LIDER_FRANQUIA' ? 'Líder / Sócio' : 'Técnico')}
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">{ag.name}</h4>
                    <p className="text-xs text-slate-500 truncate">{ag.email}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                  {ag.jobTitle && (
                    <div className="flex justify-between text-slate-600">
                      <span>Função / Cargo:</span>
                      <span className="font-extrabold text-emerald-800 truncate max-w-[160px]">{ag.jobTitle}</span>
                    </div>
                  )}
                  {ag.phone && (
                    <div className="flex justify-between text-slate-600">
                      <span>WhatsApp:</span>
                      <span className="font-bold text-slate-900">{ag.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Franquia:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[160px]">{ag.franchiseName}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Meta Diária:</span>
                    <span className="font-bold text-emerald-700">{ag.dailyGoal.target} Atendimentos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ESTOQUE DE MÁQUINAS */}
      {activeTab === 'ESTOQUE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Estoque de Máquinas e Custódias</h3>
              <p className="text-xs text-slate-500">
                Mostrando <strong className="text-emerald-700">{filteredStock.length}</strong> de {machines.length} máquinas em estoque
              </p>
            </div>
            <button
              onClick={() => setIsAddStockOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <Package className="w-4 h-4" />
              <span>+ Adicionar Carga de Estoque</span>
            </button>
          </div>

          {/* BARRA DE FILTROS DO ESTOQUE */}
          <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-800">Filtros do Estoque:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* 1. FILTRO DE STATUS */}
              <div className="flex items-center gap-1.5">
                <label className="font-bold text-slate-600">Status:</label>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-xs"
                >
                  <option value="TODOS">Todos os Status ({machines.length})</option>
                  <option value="ESTOQUE">Estoque Disponível</option>
                  <option value="COM_AGENTE">Com Agente</option>
                  <option value="PRODUCAO">Em Produção (Cliente)</option>
                  <option value="MANUTENCAO">Manutenção / Defeito</option>
                </select>
              </div>

              {/* 2. FILTRO DE CONTRATANTE */}
              <div className="flex items-center gap-1.5">
                <label className="font-bold text-slate-600">Contratante:</label>
                <select
                  value={stockContractorFilter}
                  onChange={(e) => setStockContractorFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 max-w-[180px] shadow-xs"
                >
                  <option value="TODOS">Todos Contratantes</option>
                  {uniqueContractors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. FILTRO DE PRESTADOR DE SERVIÇOS */}
              <div className="flex items-center gap-1.5">
                <label className="font-bold text-slate-600">Prestador de Serviços:</label>
                <select
                  value={stockProviderFilter}
                  onChange={(e) => setStockProviderFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 max-w-[220px] shadow-xs"
                >
                  <option value="TODOS">Todos Prestadores ({uniqueProviders.length})</option>
                  {uniqueProviders.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* BOTÃO RESET DE FILTROS */}
              {(stockStatusFilter !== 'TODOS' || stockContractorFilter !== 'TODOS' || stockProviderFilter !== 'TODOS') && (
                <button
                  onClick={() => {
                    setStockStatusFilter('TODOS');
                    setStockContractorFilter('TODOS');
                    setStockProviderFilter('TODOS');
                  }}
                  className="text-red-600 hover:text-red-800 font-bold underline text-[11px] px-2 py-1 transition-all"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Número de Série (NS)</th>
                    <th className="p-3.5">Modelo</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Contratante</th>
                    <th className="p-3.5">Prestador de Serviços</th>
                    <th className="p-3.5">Custodiante Atual</th>
                    <th className="p-3.5">Lote</th>
                    <th className="p-3.5 text-center">Bateria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredStock.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                        Nenhuma máquina encontrada com os filtros de status, contratante e prestador selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredStock.slice(0, 300).map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-emerald-700">{m.serialNumber}</td>
                        <td className="p-3.5 font-bold">{m.model}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                            m.status === 'ESTOQUE' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            m.status === 'COM_AGENTE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            m.status === 'PRODUCAO' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                            'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">{m.contratante || 'STONE PAGAMENTOS'}</td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {m.prestadorServico || m.notes?.replace('Prestador: ', '') || 'Base Franquia'}
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">{m.currentCustodyName}</td>
                        <td className="p-3.5 font-mono text-slate-500">{m.lote}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-600">{m.batteryLevel}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {filteredStock.length > 300 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-bold">
                  Exibindo as primeiras 300 máquinas de {filteredStock.length} encontradas. Use a busca ou filtros acima para refinar sua pesquisa.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CADASTRO GREEN ANGELS */}
      {activeTab === 'GREEN_ANGELS' && (
        <div className="space-y-4">
          {/* Google Sheets Live Sync Banner for Green Angels */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-800 flex-shrink-0">
                <Shirt className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-emerald-950 text-sm">
                    Cadastro Oficial de Green Angels ({angelRegistrations.length} Registrados)
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase">
                    Google Sheets Sync
                  </span>
                </div>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Cadastros de Green Angels (WhatsApp, equipamentos/tamanhos de uniforme e foto de perfil).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSyncAngelRegistrations}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-extrabold transition-all shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar Planilha</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Green Angels Cadastrados</span>
                <span className="text-lg font-black text-slate-900">{angelRegistrations.length}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Franquias Atendidas</span>
                <span className="text-lg font-black text-slate-900">
                  {new Set(angelRegistrations.map(a => a.franquiaKey)).size} Regiões
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Uniformes Mapeados</span>
                <span className="text-lg font-black text-slate-900">
                  {angelRegistrations.filter(a => a.jaqueta || a.calca || a.botas || a.capacete).length} Kits
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold block uppercase">WhatsApp Conectado</span>
                <span className="text-lg font-black text-slate-900">
                  {angelRegistrations.filter(a => a.whatsapp).length} Contatos
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Shirt className="w-4 h-4 text-emerald-600" />
              <span>Lista de Green Angels ({angelRegistrations.length})</span>
            </h3>

            <button
              onClick={handleOpenAddAngel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Green Angel</span>
            </button>
          </div>

          {/* Angels Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {angelRegistrations
              .filter(a =>
                a.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.franquia.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.whatsapp.includes(searchQuery)
              )
              .map((angel) => {
                const directPhoto = driveToDirectUrl(angel.fotoUrl);
                const cleanPhone = angel.whatsapp ? angel.whatsapp.replace(/\D/g, '') : '';
                const waUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

                return (
                  <div
                    key={angel.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <img
                          src={directPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={angel.nome}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                          }}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-500/20 shadow-xs flex-shrink-0 bg-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border inline-block bg-emerald-50 text-emerald-800 border-emerald-200">
                            🟢 Green Angel
                          </span>
                          <h4 className="text-sm font-black text-slate-900 mt-0.5 leading-snug line-clamp-2">
                            {angel.nome}
                          </h4>
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-600 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{angel.franquia}</span>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp contact pill */}
                      {angel.whatsapp && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">WhatsApp:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-slate-800">{angel.whatsapp}</span>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-extrabold"
                                title="Abrir conversa no WhatsApp"
                              >
                                <MessageSquare className="w-3 h-3 text-emerald-700" />
                                <span>Conversar</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Uniform Sizes Grid */}
                      <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-black text-slate-700 border-b border-slate-200 pb-1">
                          <span className="flex items-center gap-1">
                            <Shirt className="w-3.5 h-3.5 text-emerald-600" />
                            Kit Uniforme & Equipamentos
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-0.5">
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Jaqueta:</span>
                            <span className="font-extrabold text-slate-900">{angel.jaqueta || '-'}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Calça:</span>
                            <span className="font-extrabold text-slate-900">{angel.calca || '-'}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Botas:</span>
                            <span className="font-extrabold text-slate-900">{angel.botas || '-'}</span>
                          </div>
                          <div className="bg-white p-1.5 rounded-lg border border-slate-200 flex justify-between">
                            <span className="text-slate-500">Capacete:</span>
                            <span className="font-extrabold text-slate-900">{angel.capacete || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditAngel(angel)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 py-1.5 rounded-xl font-bold text-xs transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar Cadastro</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAngel(angel.id, angel.nome)}
                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors border border-transparent hover:border-red-200"
                        title="Remover Angel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD FRANQUIAS */}
      {isAddFranchiseOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cadastrar Nova Franquia</h3>
                  <p className="text-xs text-slate-500">Expanda a rede Hermes para novas regiões</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddFranchiseOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFranchise} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Franquia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sertão, Cerrado e Litoral"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Região / Cidade de Atuação *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Goiânia, Brasília & Entorno"
                  value={fCity}
                  onChange={(e) => setFCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código da Franquia</label>
                  <input
                    type="text"
                    placeholder="Ex: FRAN-SCL"
                    value={fCode}
                    onChange={(e) => setFCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 12.345.678/0001-90"
                    value={fCnpj}
                    onChange={(e) => setFCnpj(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddFranchiseOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md"
                >
                  Salvar Franquia
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ADD AGENTES */}
      {isAddAgentOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Cadastrar Novo Agente</h3>
                  <p className="text-xs text-slate-500">Crie novos acessos para a equipe de campo ou liderança</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddAgentOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lucas Ferreira"
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: lucas.ferreira@hermeslog.com.br"
                  value={aEmail}
                  onChange={(e) => setAEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo *</label>
                  <select
                    value={aRole}
                    onChange={(e) => setARole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="AGENTE_CAMPO">Agente de Campo</option>
                    <option value="LIDER_FRANQUIA">Líder de Franquia</option>
                    <option value="TECNICO">Técnico em Laboratório</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meta Diária (Serviços)</label>
                  <input
                    type="number"
                    min="1"
                    value={aGoal}
                    onChange={(e) => setAGoal(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Franquia Vinculada *</label>
                <select
                  value={aFranchise}
                  onChange={(e) => setAFranchise(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {franchises.map((fr) => (
                    <option key={fr.id} value={fr.name}>
                      {fr.name} ({fr.cityRegion})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAgentOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: ADD ESTOQUE MÁQUINAS */}
      {isAddStockOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Carga de Estoque de Maquininhas</h3>
                  <p className="text-xs text-slate-500">Adicione lote de novas máquinas POS no inventário Hermes</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddStockOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStock} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Modelo *</label>
                  <select
                    value={mModel}
                    onChange={(e) => setMModel(e.target.value as MachineModel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Stone Smart S920">Stone Smart S920</option>
                    <option value="Stone T3 Pro">Stone T3 Pro</option>
                    <option value="Stone Mini POS">Stone Mini POS</option>
                    <option value="Stone A8 Android">Stone A8 Android</option>
                    <option value="Stone Ton T2">Stone Ton T2</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lote</label>
                  <input
                    type="text"
                    value={mLote}
                    onChange={(e) => setMLote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Franquia / Depósito Inicial</label>
                <select
                  value={mCustody}
                  onChange={(e) => setMCustody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {franchises.map((fr) => (
                    <option key={fr.id} value={`Estoque Central Franquia - ${fr.name}`}>
                      Estoque Central Franquia - {fr.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantidade Automática</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={mQuantity}
                  onChange={(e) => setMQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Gerará números de série automáticos únicos no formato STN-XXXXXXX.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ou Colar NS Personalizados (um por linha)</label>
                <textarea
                  rows={3}
                  placeholder="STN-9900100-A&#10;STN-9900101-B"
                  value={mCustomSerials}
                  onChange={(e) => setMCustomSerials(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStockOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md"
                >
                  Confirmar Entrada no Estoque
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: EDIT FRANQUIAS */}
      {isEditFranchiseOpen && editingFranchise && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Editar Franquia</h3>
                  <p className="text-xs text-slate-500">Atualize dados, contatos, líderes e status da unidade</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditFranchiseOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedFranchise} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome da Franquia *</label>
                <input
                  type="text"
                  required
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Região / Cidade de Atuação *</label>
                <input
                  type="text"
                  required
                  value={eCity}
                  onChange={(e) => setECity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código da Franquia</label>
                  <input
                    type="text"
                    value={eCode}
                    onChange={(e) => setECode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={eCnpj}
                    onChange={(e) => setECnpj(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status de Operação</label>
                  <select
                    value={eStatus}
                    onChange={(e) => setEStatus(e.target.value as 'ATIVA' | 'INATIVA')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="ATIVA">ATIVA (Em Operação)</option>
                    <option value="INATIVA">INATIVA (Suspensa)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Líder / Gerente Responsável</label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Eduardo"
                    value={eLeader}
                    onChange={(e) => setELeader(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone de Contato</label>
                  <input
                    type="text"
                    placeholder="(11) 98888-7777"
                    value={ePhone}
                    onChange={(e) => setEPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Endereço da Sede</label>
                  <input
                    type="text"
                    placeholder="Av. Paulista, 1000 - São Paulo"
                    value={eAddress}
                    onChange={(e) => setEAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qtd. Agentes Ativos</label>
                  <input
                    type="number"
                    min="0"
                    value={eActiveAgentsCount}
                    onChange={(e) => setEActiveAgentsCount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estoque Maquininhas POS</label>
                  <input
                    type="number"
                    min="0"
                    value={eMachinesStockCount}
                    onChange={(e) => setEMachinesStockCount(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 focus:outline-none focus:border-emerald-500 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações Internas / Anotações</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais da regional..."
                  value={eNotes}
                  onChange={(e) => setENotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditFranchiseOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 5: GOOGLE SHEETS SYNC */}
      {isSyncSheetsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Sincronizar com Google Sheets</h3>
                  <p className="text-xs text-slate-500">Importe dados atualizados das suas franquias diretamente do Sheets</p>
                </div>
              </div>
              <button
                onClick={() => setIsSyncSheetsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!onSyncSheets) return;
                setIsSyncing(true);
                try {
                  await onSyncSheets(customSheetUrl);
                  setIsSyncSheetsOpen(false);
                  showToast('Franquias sincronizadas com sucesso da planilha Google Sheets!');
                } catch (err: any) {
                  alert(`Erro ao sincronizar: ${err.message || err}`);
                } finally {
                  setIsSyncing(false);
                }
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">URL da Planilha do Google Sheets *</label>
                <input
                  type="url"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={customSheetUrl}
                  onChange={(e) => setCustomSheetUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Certifique-se de que a planilha possui permissão de leitura pública ou link de visualização ativo.
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sincronização Tripla Ativa: Franquias, Agentes & Estoque de Máquinas</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  • <strong>Aba 1 (Franquias):</strong> Estrutura das 8 Franquias Regionais.<br/>
                  • <strong>Aba 2 (Agentes):</strong> Equipe de Campo, Líderes e Administradores.<br/>
                  • <strong>Aba 3 (Estoque de Máquinas):</strong> Máquinas POS sincronizadas ao vivo.
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                Esta sincronização por planilha foi desativada. Os dados agora vêm diretamente do banco de dados do sistema.
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <a
                  href={customSheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir no navegador</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSyncSheetsOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-extrabold shadow-md flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Confirmar Sincronização'}</span>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: EDIT / ADD GREEN ANGEL */}
      {isAngelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <Shirt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingAngel ? 'Editar Cadastro de Green Angel' : 'Cadastrar Novo Green Angel'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Informações pessoais, WhatsApp e tamanhos de equipamentos de uniforme
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAngelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAngel} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo do Green Angel *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pedro Lucas Aguiar da Silva"
                  value={agName}
                  onChange={(e) => setAgName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Franquia / Estado *</label>
                  <select
                    value={agFranquia}
                    onChange={(e) => setAgFranquia(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="RN - João Câmara">RN - João Câmara</option>
                    <option value="CE - Limoeiro do Norte">CE - Limoeiro do Norte</option>
                    <option value="CE - Trairi">CE - Trairi</option>
                    <option value="RN - Apodi">RN - Apodi</option>
                    <option value="MG - Paracatu">MG - Paracatu</option>
                    <option value="RN - Macau">RN - Macau</option>
                    <option value="PB - Patos">PB - Patos</option>
                    <option value="RN - Parelhas">RN - Parelhas</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    placeholder="Ex: 84 98116-3724"
                    value={agWhatsapp}
                    onChange={(e) => setAgWhatsapp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Uniform Kit Sizes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Shirt className="w-4 h-4 text-emerald-600" />
                  Equipamentos / Tamanho de Uniforme
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Jaqueta</label>
                    <input
                      type="text"
                      placeholder="G"
                      value={agJaqueta}
                      onChange={(e) => setAgJaqueta(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center text-slate-900 font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Calça</label>
                    <input
                      type="text"
                      placeholder="42"
                      value={agCalca}
                      onChange={(e) => setAgCalca(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center text-slate-900 font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Botas</label>
                    <input
                      type="text"
                      placeholder="41"
                      value={agBotas}
                      onChange={(e) => setAgBotas(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center text-slate-900 font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">Capacete</label>
                    <input
                      type="text"
                      placeholder="60"
                      value={agCapacete}
                      onChange={(e) => setAgCapacete(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-center text-slate-900 font-bold uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL da Foto de Perfil (Google Drive / Link)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={agFotoUrl}
                  onChange={(e) => setAgFotoUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAngelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingAngel ? 'Salvar Alterações' : 'Cadastrar Angel'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
