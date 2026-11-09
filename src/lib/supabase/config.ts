export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/**
 * Sem as variáveis do Supabase o app roda em modo demonstração:
 * sem login e com dados de exemplo. Útil para desenvolver o visual.
 */
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_KEY);
