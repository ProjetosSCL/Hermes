import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Initialize Gemini GenAI client lazily or safely
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is missing.");
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // IA Performance Gemini endpoint
  app.post("/api/performance/ai", async (req, res) => {
    try {
      const { prompt, systemInstruction, contextData } = req.body;

      const ai = getAiClient();
      if (!ai) {
        return res.status(500).json({
          error: "Chave da API do Gemini não configurada no servidor.",
        });
      }

      const defaultSystemPrompt = `Você é o HERMES IA Performance, o assistente executivo e operacional de inteligência logística das franquias Stone/SCL.
Sua missão é analisar dados de produtividade de Ordens de Serviço (OS), remuneração variável, cumprimento de metas de TMA Stone (≤ 0,90), TMA Ton (≤ 2,50), Ciclo (≤ 0,90), logística reversa, programa Camisa 10 e rankings de Angels e Franquias.
Responda de forma direta, executiva, em Português do Brasil, trazendo insights numéricos acionáveis, resumos para WhatsApp, comparações de melhoria e orientações táticas para gerentes de logística e Angels em campo.`;

      const contents = contextData
        ? `Contexto dos Dados do Sistema HERMES:\n${JSON.stringify(contextData, null, 2)}\n\nPergunta do Usuário:\n${prompt}`
        : prompt;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config: {
          systemInstruction: systemInstruction || defaultSystemPrompt,
          temperature: 0.7,
        },
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Erro na rota /api/performance/ai:", error);
      res.status(500).json({
        error: error?.message || "Falha ao processar solicitação de IA",
      });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HERMES] Servidor rodando na porta ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro fatal ao iniciar servidor:", err);
});
