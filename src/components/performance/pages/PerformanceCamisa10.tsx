import React, { useState } from "react";
import { Camisa10Lead, AngelPerformanceSummary } from "../../../types/performance";
import {
  Award,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  DollarSign,
  TrendingUp,
  User,
  Phone,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PerformanceCamisa10Props {
  camisa10Leads: Camisa10Lead[];
  angelSummaries: AngelPerformanceSummary[];
  onAddCamisa10Lead: (newLead: Omit<Camisa10Lead, "id" | "bonusAmount">) => void;
  onUpdateLeadStatus: (id: string, newStatus: Camisa10Lead["status"]) => void;
}

export const PerformanceCamisa10: React.FC<PerformanceCamisa10Props> = ({
  camisa10Leads,
  angelSummaries,
  onAddCamisa10Lead,
  onUpdateLeadStatus,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("TODOS");

  // Form State for new Camisa 10 Lead
  const [formData, setFormData] = useState({
    stoneCode: "",
    clientName: "",
    city: "Patos/PB",
    phone: "",
    agentName: angelSummaries[0]?.angelName || "Carlos Silva",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    status: "Aguardando" as Camisa10Lead["status"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.stoneCode || !formData.clientName || !formData.phone) {
      alert("Por favor, preencha os campos obrigatórios (Stone Code, Cliente e Telefone).");
      return;
    }

    onAddCamisa10Lead({
      stoneCode: formData.stoneCode,
      clientName: formData.clientName,
      city: formData.city,
      phone: formData.phone,
      agentName: formData.agentName,
      date: formData.date,
      notes: formData.notes,
      status: formData.status,
    });

    setIsModalOpen(false);
    setFormData({
      stoneCode: "",
      clientName: "",
      city: "Patos/PB",
      phone: "",
      agentName: angelSummaries[0]?.angelName || "Carlos Silva",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      status: "Aguardando",
    });
  };

  // Aggregated Stats
  const totalCredenciados = camisa10Leads.filter((l) => l.status === "Credenciado").length;
  const totalBonusGerado = totalCredenciados * 30.0;
  const totalEmNegociacao = camisa10Leads.filter((l) => l.status === "Em negociação").length;
  const totalAguardando = camisa10Leads.filter((l) => l.status === "Aguardando").length;

  // Camisa 10 Ranking per Angel
  const angelRanking = angelSummaries.map((ag) => {
    const credenciados = camisa10Leads.filter((l) => l.agentName === ag.angelName && l.status === "Credenciado").length;
    return {
      angelName: ag.angelName,
      franchiseName: ag.franchiseName,
      credenciados,
      bonus: credenciados * 30.0,
    };
  }).sort((a, b) => b.credenciados - a.credenciados);

  // Filtered Leads
  const filteredLeads = camisa10Leads.filter((lead) => {
    if (selectedStatusFilter !== "TODOS" && lead.status !== selectedStatusFilter) return false;
    if (
      searchQuery &&
      !lead.clientName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !lead.stoneCode.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !lead.agentName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !lead.city.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-emerald-400" />
            HERMES PERFORMANCE • PROGRAMA CAMISA 10
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Programa Camisa 10 (Substituto do Google Forms)
          </h2>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Indicação e credenciamento de novos clientes Stone. Cada cliente credenciado gera R$ 30,00 de bônus imediato para o Angel Comercial.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Indicação Camisa 10
        </button>
      </div>

      {/* Camisa 10 Dashboard Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Total Credenciados</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{totalCredenciados} Clientes</div>
          <div className="text-[10px] text-emerald-800 font-bold mt-1">Bônus Liberado: R$ {totalBonusGerado.toFixed(2)}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Em Negociação</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalEmNegociacao} Leads</div>
          <div className="text-[10px] text-slate-400 mt-1">Aguardando fechamento</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Aguardando Análise</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{totalAguardando} Leads</div>
          <div className="text-[10px] text-slate-400 mt-1">Na mesa de crédito Stone</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-slate-500 text-xs font-semibold">Valor do Bônus por Credenciamento</div>
          <div className="text-2xl font-black font-mono text-slate-900 mt-1">R$ 30,00</div>
          <div className="text-[10px] text-slate-400 mt-1">Pagamento automatizado no repasse</div>
        </div>
      </div>

      {/* Main Grid: Leads Table & Camisa 10 Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads History Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Histórico de Indicações Camisa 10</h3>
              <p className="text-xs text-slate-500">Mude o status para Credenciado e libere o bônus de R$ 30,00</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar Stone Code, Cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TODOS">Todos Status</option>
                <option value="Aguardando">Aguardando</option>
                <option value="Em negociação">Em negociação</option>
                <option value="Credenciado">Credenciado (Bônus R$30)</option>
                <option value="Recusado">Recusado</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Stone Code</th>
                  <th className="p-3">Nome do Cliente</th>
                  <th className="p-3">Cidade / Tel</th>
                  <th className="p-3">Agente Comercial</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Bônus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{lead.stoneCode}</td>
                    <td className="p-3 font-bold text-slate-800">
                      <div>{lead.clientName}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate max-w-[160px]">{lead.notes}</div>
                    </td>
                    <td className="p-3 text-slate-600">
                      <div>{lead.city}</div>
                      <div className="text-[10px] text-slate-400">{lead.phone}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{lead.agentName}</td>
                    <td className="p-3">
                      <select
                        value={lead.status}
                        onChange={(e) => onUpdateLeadStatus(lead.id, e.target.value as any)}
                        className={`text-[10px] font-bold px-2 py-1 rounded border cursor-pointer ${
                          lead.status === "Credenciado"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : lead.status === "Em negociação"
                            ? "bg-sky-100 text-sky-800 border-sky-300"
                            : lead.status === "Aguardando"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-red-100 text-red-800 border-red-300"
                        }`}
                      >
                        <option value="Aguardando">Aguardando</option>
                        <option value="Em negociação">Em negociação</option>
                        <option value="Credenciado">Credenciado (Liberar Bônus)</option>
                        <option value="Recusado">Recusado</option>
                      </select>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      {lead.status === "Credenciado" ? (
                        <span className="text-emerald-700 font-black">+ R$ 30,00</span>
                      ) : (
                        <span className="text-slate-400">R$ 0,00</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Camisa 10 Angel Ranking */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Ranking Camisa 10 (Credenciamentos)
            </h3>
            <p className="text-xs text-slate-500">Bônus acumulado por Angel comercial</p>
          </div>

          <div className="space-y-2.5">
            {angelRanking.map((rank, idx) => (
              <div
                key={rank.angelName}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 font-black text-xs flex items-center justify-center">
                    {idx + 1}º
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{rank.angelName}</div>
                    <div className="text-[10px] text-slate-500">{rank.franchiseName}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-emerald-700">{rank.credenciados} Credenciados</div>
                  <div className="text-[10px] font-mono text-slate-500">R$ {rank.bonus.toFixed(2)} bônus</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: New Camisa 10 Lead Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-emerald-600" />
                  Nova Indicação Camisa 10
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Stone Code do Cliente *</label>
                  <input
                    type="text"
                    placeholder="Ex: ST-881290"
                    value={formData.stoneCode}
                    onChange={(e) => setFormData({ ...formData, stoneCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nome do Cliente / Razão Social *</label>
                  <input
                    type="text"
                    placeholder="Ex: Mercado Central Ltda"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Telefone *</label>
                    <input
                      type="text"
                      placeholder="(83) 99881-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Agente Comercial (Angel)</label>
                  <select
                    value={formData.agentName}
                    onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    {angelSummaries.map((ag) => (
                      <option key={ag.angelId} value={ag.angelName}>
                        {ag.angelName} ({ag.franchiseName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Status Inicial</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                  >
                    <option value="Aguardando">Aguardando Análise</option>
                    <option value="Em negociação">Em negociação</option>
                    <option value="Credenciado">Credenciado (Bônus R$30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Detalhes comerciais ou modelo de maquininha..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs"
                  >
                    Salvar Indicação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
