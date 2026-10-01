import React, { useState } from "react";
import { AngelPerformanceSummary, FranchiseKPI, AIPerformanceInsight } from "../../../types/performance";
import { Sparkles, Send, Bot, User, Copy, Check, MessageSquare, Zap, Lightbulb, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface PerformanceAIAssistantProps {
  angelSummaries: AngelPerformanceSummary[];
  franchisesKPIs: FranchiseKPI[];
  insights: AIPerformanceInsight[];
}

interface ChatMessage {
  id: string;
  sender: "USER" | "AI";
  text: string;
  timestamp: string;
}

export const PerformanceAIAssistant: React.FC<PerformanceAIAssistantProps> = ({
  angelSummaries,
  franchisesKPIs,
  insights,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      sender: "AI",
      text: "Olá! Sou o Assistente de Inteligência Artificial do **HERMES PERFORMANCE**. Posso responder dúvidas sobre as regras de remuneração, analisar a produção dos Angels, gerar resumos formatados para o WhatsApp ou realizar comparativos de KPIs entre as Franquias SCL.\n\nComo posso ajudar você hoje?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "USER",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/performance/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          systemInstruction: `Você é o especialista e gestor de IA do HERMES PERFORMANCE. 
Analise os dados reais fornecidos da operação e responda de forma profissional, direta e motivadora.
Quando solicitado para gerar mensagens de WhatsApp, formate com emojis e asteriscos.`,
          contextData: {
            totalFranquias: franchisesKPIs.length,
            totalAngels: angelSummaries.length,
            franquiasData: franchisesKPIs,
            angelsData: angelSummaries,
          },
        }),
      });

      const data = await res.json();
      const aiText = data.text || "Desculpe, ocorreu um erro ao consultar o assistente.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "AI",
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "AI",
        text: "Desculpe, houve uma falha de comunicação com o servidor Gemini. Por favor tente novamente.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPills = [
    "Gere o Resumo do Final da Rota para o WhatsApp",
    "Quais Angels estão com a melhor média diária real?",
    "Explique a regra de rebate de 10% e remuneração variável",
    "Compare a performance da Franquia Patos com as outras",
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            HERMES IA PERFORMANCE ASSISTANT
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Inteligência Operacional Gemini 2.5 Flash
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Assistente conectado em tempo real à base de dados do HERMES para análise de KPIs, simulação de repasse e geração de comunicados.
          </p>
        </div>
      </div>

      {/* Quick Prompts Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          Sugestões de Análise:
        </span>
        {quickPills.map((pill) => (
          <button
            key={pill}
            onClick={() => handleSendMessage(pill)}
            disabled={isLoading}
            className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-emerald-900 transition-all shadow-2xs"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Main Chat Box */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-[520px]">
        {/* Chat Messages Container */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 ${m.sender === "USER" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                  m.sender === "USER"
                    ? "bg-slate-900 text-white"
                    : "bg-emerald-600 text-white shadow-xs"
                }`}
              >
                {m.sender === "USER" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-2 relative group ${
                  m.sender === "USER"
                    ? "bg-slate-900 text-white font-medium"
                    : "bg-slate-50 border border-slate-200 text-slate-800"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{m.text}</div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/40">
                  <span>{m.timestamp}</span>
                  {m.sender === "AI" && (
                    <button
                      onClick={() => handleCopyText(m.id, m.text)}
                      className="text-emerald-700 hover:underline font-bold flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar Resposta
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-100 p-3 rounded-2xl text-xs text-slate-500 font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-spin" />
                IA Analisando dados da operação e gerando resposta...
              </div>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Digite sua dúvida, peça um comparativo ou solucione regras do HERMES..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Send className="w-4 h-4" />
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
