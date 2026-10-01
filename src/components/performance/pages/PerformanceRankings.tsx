import React, { useState } from "react";
import { AngelPerformanceSummary, FranchiseKPI, Camisa10Lead } from "../../../types/performance";
import { Award, Building2, Trophy, MessageSquare, Shirt, PhoneCall } from "lucide-react";
import { driveToDirectUrl, getWhatsAppUrl } from "../../../utils/angelRegistrationHelper";

interface PerformanceRankingsProps {
  angelSummaries: AngelPerformanceSummary[];
  franchisesKPIs: FranchiseKPI[];
  camisa10Leads: Camisa10Lead[];
}

export const PerformanceRankings: React.FC<PerformanceRankingsProps> = ({
  angelSummaries,
  franchisesKPIs,
  camisa10Leads,
}) => {
  const [rankingCategory, setRankingCategory] = useState<"ANGELS" | "FRANQUIAS" | "CAMISA10">("ANGELS");

  // Sorted Lists
  const angelsByOS = [...angelSummaries].sort((a, b) => b.monthlyOsCount - a.monthlyOsCount);
  const angelsByDailyAvg = [...angelSummaries].sort((a, b) => b.realDailyAverage - a.realDailyAverage);
  const franchisesByOS = [...franchisesKPIs].sort((a, b) => b.totalOSMonth - a.totalOSMonth);

  const camisa10Ranking = angelSummaries.map((ag) => {
    const credenciados = camisa10Leads.filter((l) => l.agentName === ag.angelName && l.status === "Credenciado").length;
    return {
      angelName: ag.angelName,
      franchiseName: ag.franchiseName,
      fotoUrl: ag.fotoUrl,
      whatsapp: ag.whatsapp,
      credenciados,
      bonus: credenciados * 30.0,
    };
  }).sort((a, b) => b.credenciados - a.credenciados);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4 text-emerald-400" />
            HERMES PERFORMANCE • RANKINGS INTEGRADOS
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Rankings de Alta Performance
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Classificação oficial com dados cadastrais sincronizados (Fotos, Contatos WhatsApp e Kits de Uniforme de cada Green Angel).
          </p>
        </div>

        {/* Category Switches */}
        <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-700">
          <button
            onClick={() => setRankingCategory("ANGELS")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              rankingCategory === "ANGELS" ? "bg-emerald-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            Angels (OS)
          </button>
          <button
            onClick={() => setRankingCategory("FRANQUIAS")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              rankingCategory === "FRANQUIAS" ? "bg-emerald-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            Franquias
          </button>
          <button
            onClick={() => setRankingCategory("CAMISA10")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              rankingCategory === "CAMISA10" ? "bg-emerald-500 text-slate-950 font-black shadow-xs" : "text-slate-300 hover:text-white"
            }`}
          >
            Camisa 10
          </button>
        </div>
      </div>

      {/* CATEGORY 1: ANGELS RANKING */}
      {rankingCategory === "ANGELS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ranking por Volume Total OS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Líderes em Volume Total de OS (Mês)
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                Fotos & WhatsApp
              </span>
            </div>

            <div className="space-y-2.5">
              {angelsByOS.map((ag, idx) => {
                const photo = driveToDirectUrl(ag.fotoUrl);
                const waUrl = getWhatsAppUrl(ag.whatsapp);

                return (
                  <div key={ag.angelId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-300 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                        idx === 0 ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300" : "bg-slate-200 text-slate-700"
                      }`}>
                        {idx + 1}º
                      </div>

                      <img
                        src={photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                        alt={ag.angelName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                        }}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20 shrink-0 bg-slate-200"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">{ag.angelName}</span>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded transition-colors shrink-0"
                              title="WhatsApp do Angel"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-700" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                          <span>{ag.franchiseName}</span>
                          {(ag.jaqueta || ag.calca) && (
                            <span className="text-emerald-800 font-bold bg-emerald-100/80 px-1.5 py-0.2 rounded">
                              Kit: {ag.jaqueta || '-'}/{ag.calca || '-'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900">{ag.monthlyOsCount} OS</div>
                      <div className="text-[10px] text-emerald-700 font-bold">{ag.realDailyAverage} OS/dia real</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ranking por Média Diária Real */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-600" />
                Líderes em Média Diária Real (OS/dia trabalhado)
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                Efetividade
              </span>
            </div>

            <div className="space-y-2.5">
              {angelsByDailyAvg.map((ag, idx) => {
                const photo = driveToDirectUrl(ag.fotoUrl);
                const waUrl = getWhatsAppUrl(ag.whatsapp);

                return (
                  <div key={ag.angelId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-300 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                        idx === 0 ? "bg-amber-400 text-amber-950 ring-2 ring-amber-300" : "bg-slate-200 text-slate-700"
                      }`}>
                        {idx + 1}º
                      </div>

                      <img
                        src={photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                        alt={ag.angelName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                        }}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/20 shrink-0 bg-slate-200"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 truncate">{ag.angelName}</span>
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded transition-colors shrink-0"
                              title="WhatsApp do Angel"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-700" />
                            </a>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          {ag.workedDaysCount} dias trabalhados • {ag.franchiseName}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-emerald-700">{ag.realDailyAverage} OS/dia</div>
                      <div className="text-[10px] text-slate-500">{ag.monthlyOsCount} OS total</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY 2: FRANQUIAS RANKING */}
      {rankingCategory === "FRANQUIAS" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Ranking Geral de Franquias SCL
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Posição</th>
                  <th className="p-3">Franquia</th>
                  <th className="p-3">Cidade</th>
                  <th className="p-3">Total OS Mês</th>
                  <th className="p-3">Conformidade KPIs</th>
                  <th className="p-3">Rebate Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {franchisesByOS.map((f, idx) => {
                  const allMet = f.TMAStone <= f.TMAStoneTarget && f.TMATon <= f.TMATonTarget && f.Ciclo <= f.CicloTarget;

                  return (
                    <tr key={f.franchiseId} className="hover:bg-slate-50">
                      <td className="p-3 font-black text-slate-900">{idx + 1}º</td>
                      <td className="p-3 font-bold text-slate-900">{f.franchiseName}</td>
                      <td className="p-3 text-slate-600">{f.city}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{f.totalOSMonth} OS</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          allMet ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}>
                          {allMet ? "100% Ok" : "Pendente TMA"}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        R$ {f.netRebateBase.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATEGORY 3: CAMISA 10 RANKING */}
      {rankingCategory === "CAMISA10" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              Ranking Camisa 10 (Mais Clientes Credenciados)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Posição</th>
                  <th className="p-3">Angel Comercial</th>
                  <th className="p-3">Franquia</th>
                  <th className="p-3">Clientes Credenciados</th>
                  <th className="p-3">Bônus Acumulado (R$ 30/cliente)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {camisa10Ranking.map((rank, idx) => {
                  const photo = driveToDirectUrl(rank.fotoUrl);
                  const waUrl = getWhatsAppUrl(rank.whatsapp);

                  return (
                    <tr key={rank.angelName} className="hover:bg-slate-50">
                      <td className="p-3 font-black text-slate-900">{idx + 1}º</td>
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                            alt={rank.angelName}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
                            }}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/20 bg-slate-200 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{rank.angelName}</span>
                              {waUrl && (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200 transition-colors"
                                  title="Enviar mensagem WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-700" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{rank.franchiseName}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{rank.credenciados} Credenciados</td>
                      <td className="p-3 font-mono font-black text-slate-900">R$ {(rank.bonus || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

