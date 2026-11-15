# Hermes - Remix Logística SCL (Gestão de Franquias)

Sistema integrado de gestão logística e performance operacional para franquias, focado em rastreabilidade de máquinas POS, controle de frota, auditorias em campo (checklists), cumprimento de SLA e inteligência de produtividade para Angels e liderança.

---

## 🚀 Visão Geral

O **Hermes** foi desenvolvido para centralizar toda a esteira logística de franquias com alta demanda operacional. A plataforma unifica a operação diária dos agentes em campo (Angels), o monitoramento tático de líderes de equipe e a visão estratégica dos administradores e analistas de performance.

Além dos módulos operacionais tradicionais, a plataforma conta com um módulo robusto de **Performance**, integrando cálculo de remuneração variável, rankings, programa "Camisa 10" e um **Assistente de Inteligência Artificial** motorizado pelo Google Gemini para diagnósticos e geração de insights rápidos.

---

## ✨ Funcionalidades Principais

### 1. Operação Logística e Campo
- **Scanner & Gestão de POS:** Rastreamento ponta a ponta de terminais por número de série (NS), com histórico de custódia (estoque, em trânsito com agente, produção ou manutenção), assinatura digital e geração de comprovantes.
- **Rastreamento de SLA:** Acompanhamento em tempo real de chamados técnicos (instalação, troca, manutenção urgente) com cronômetros de tempo de resposta e prioridades.
- **Jornada do Agente (Angels):** Acompanhamento de turnos, metas diárias de OS, pausas e status operacional.
- **Gestão de Frota & Combustível:** Registro e acompanhamento de abastecimento, odômetro, consumo médio e controle de veículos vinculados aos agentes.
- **Auditorias & Checklists:** Checklists dinâmicos de atendimento, conformidade de POS e validação técnica em campo.

### 2. Módulo Hermes Performance
- **Dashboard de Produtividade:** Acompanhamento de Ordens de Serviço (OS) concluídas, canceladas e em andamento.
- **Indicadores Chave (KPIs):** TMA Stone ($\le 0,90$), TMA Ton ($\le 2,50$), Tempo de Ciclo ($\le 0,90$), taxa de logística reversa e retenção.
- **Programa Camisa 10:** Reconhecimento e ranqueamento de excelência operacional com regras gamificadas e badges de destaque.
- **Remuneração Variável & Simulador:** Motor de regras de bonificação financeira baseado no atingimento de metas e tiers de produtividade.
- **Duelos & Cartões X1:** Geração de cartões visuais para comparações táticas e disputas saudáveis de metas entre agentes.
- **Parsers & Importadores:** Suporte à importação e leitura de dados diários de sistemas legados (Workfinity, planilhas Excel via `.xlsx`).

### 3. Assistente de IA com Google Gemini
- Endpoint dedicado (`/api/performance/ai`) alimentado pelo **Google Gemini 3.6 Flash** (`@google/genai`).
- Análise contextual de indicadores, produtividade e métricas de franquias e agentes.
- Geração automática de resumos executivos prontos para envio via WhatsApp ou relatórios de liderança.

### 4. Perfis de Visualização
- **`AGENTE`:** Foco na execução diária, scanner, abertura de checklists e acompanhamento da jornada individual.
- **`LIDER`:** Visão consolidada da equipe da franquia, acompanhamento de SLA e gestão de frota e máquinas.
- **`ADMIN`:** Administração global do sistema, parâmetros de franquias, usuários e auditoria.
- **`PERFORMANCE`:** Central de dados analíticos, rankings, remuneração, indicadores históricos e assistente de IA.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS v4 |
| **UI & Visualização** | Lucide React, Recharts, Motion (Framer Motion), html-to-image |
| **Backend & Servidor** | Node.js, Express (`server.ts`), esbuild, tsx |
| **Banco de Dados & Auth** | Supabase (`@supabase/supabase-js`) com Row Level Security (RLS) |
| **Inteligência Artificial** | Google Gemini API (`@google/genai`) |
| **Utilitários & Manipulação** | xlsx (Excel parser), dotenv |

---

## 📁 Estrutura do Projeto

```text
Hermes/
├── public/                     # Fontes personalizadas (Gravity, Roobert) e assets estáticos
├── src/
│   ├── components/             # Telas e modais da operação principal
│   │   ├── performance/        # Módulo Hermes Performance
│   │   │   ├── pages/          # Telas de IA, Camisa 10, Rankings, Remuneração, etc.
│   │   │   └── HermesPerformanceModule.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── LeaderDashboard.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── MachineScannerModal.tsx
│   │   ├── SLATrackerModal.tsx
│   │   └── ...
│   ├── data/                   # Mocks e bases históricas de apoio
│   ├── design-system/          # Tokens de cores, temas e fontes
│   ├── services/               # Conexão com Supabase e APIs
│   │   ├── api.ts              # Regras de negócio e operações de banco
│   │   └── supabaseClient.ts   # Instância do cliente Supabase
│   ├── types/                  # Definições de tipos TypeScript (domínio e performance)
│   ├── utils/                  # Parsers (Workfinity, números BR, registros)
│   ├── App.tsx                 # Componente raiz, controle de rotas e perfis
│   ├── main.tsx                # Bootstrap da aplicação
│   └── index.css               # Estilos globais e Tailwind v4
├── server.ts                   # Servidor Express com middleware Vite e rota Gemini AI
├── vite.config.ts              # Configuração do Vite
├── tsconfig.json               # Configurações do compilador TypeScript
├── package.json                # Dependências e scripts
└── NEXT_TASK.md                # Registro de tarefas pendentes do projeto
```

---

## ⚙️ Pré-requisitos & Instalação

### Pré-requisitos
- **Node.js** (versão 20+ recomendada)
- Gerenciador de pacotes **npm** ou **bun**
- Projeto configurado no **Supabase**
- Chave de API do **Google Gemini** (Google AI Studio)

### Passos de Configuração

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/ProjetosSCL/Hermes.git
   cd Hermes
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Copie o arquivo de exemplo e preencha com as suas credenciais:
   ```bash
   cp .env.example .env
   ```

   Campos necessários no `.env`:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key-do-supabase
   GEMINI_API_KEY=sua-chave-api-gemini
   PORT=3000
   ```

---

## 🚦 Executando a Aplicação

### Ambiente de Desenvolvimento
Inicia o servidor Express integrado ao middleware do Vite:
```bash
npm run dev
```
O servidor estará acessível em `http://localhost:3000`.

### Verificação de Tipos (Lint/Typecheck)
```bash
npm run lint
```

### Build de Produção
Gera o bundle estático do frontend com Vite e compila o `server.ts` para `dist/server.cjs` com esbuild:
```bash
npm run build
```

### Executar em Produção
```bash
npm start
```

---

## 📄 Licença

Este projeto é desenvolvido para uso sob licença proprietária/interna da **Remix Logística SCL / Stone**. Consulte a liderança do projeto para detalhes de autorização e distribuição.
