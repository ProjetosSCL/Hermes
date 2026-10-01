import { createClient } from '@supabase/supabase-js';

// Essas duas variáveis vêm do arquivo .env (nunca comitado no Git).
// Veja .env.example para o formato esperado.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha alto e cedo: melhor quebrar em desenvolvimento do que rodar
  // silenciosamente sem conexão nenhuma com o banco.
  throw new Error(
    'Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Verifique o arquivo .env.'
  );
}

// A "anon key" é pública por design (fica visível no navegador de qualquer
// usuário) — a segurança real vem das políticas de Row Level Security (RLS)
// configuradas no banco, não do segredo desta chave.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
