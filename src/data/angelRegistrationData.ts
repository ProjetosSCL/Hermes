// Cadastro de Green Angels.
//
// AVISO: este arquivo continha, até esta correção, nomes reais, WhatsApp e
// links de foto de pessoas reais, além do link de uma planilha do Google
// Sheets aberta ao público — tudo isso ia embutido no código do site,
// visível a qualquer visitante. Foi zerado por segurança.
//
// Próximo passo (Fase 2 do backend): mover esses cadastros para uma tabela
// própria no Supabase, com controle de acesso (RLS), e buscar os dados daqui
// via API em vez de tê-los fixos no código.

export interface AngelRegistration {
  id: string;
  nome: string;
  franquia: string;
  franquiaKey: string;
  whatsapp: string;
  jaqueta?: string;
  calca?: string;
  botas?: string;
  capacete?: string;
  fotoUrl?: string;
}

export const ANGEL_REGISTRATION_SHEET_URL = '';

export const initialAngelRegistrations: AngelRegistration[] = [];
