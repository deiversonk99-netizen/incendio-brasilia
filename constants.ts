
import { Kit } from './types';

// ==============================================================================
// CONFIGURAÇÃO DO SUPABASE
// ==============================================================================
// URL do seu projeto Supabase
export const SUPABASE_URL = 'https://glgpmpngxiyxlwjavzgl.supabase.co'; 

// Chave API Pública (Anon Key) fornecida
export const SUPABASE_ANON_KEY = 'sb_publishable_A1ds8HCH_hTP0t7T7SLXow_E-QXTiBC'; 

export const SCRIPT_API_URL = '';

export const DEFAULT_BDI = 25;
export const DEFAULT_PROFIT_MARGIN = 15;
export const DEFAULT_VALIDITY = 30;

export const DEFAULT_KITS: Kit[] = [
  {
    id: 'k1',
    nomeKit: 'Kit Infra Alarme Padrão',
    tipoInfra: 'alarme',
    percentualPerda: 10,
    ativo: true,
    componentes: [
      // Fixed: Added missing 'unidade' property to comply with KitComponent interface
      { produtoNome: 'Tubo Zincado 3/4', fatorConversao: 1.2, unidade: 'M' },
      // Fixed: Added missing 'unidade' property to comply with KitComponent interface
      { produtoNome: 'Conexão Tê 3/4', fatorConversao: 0.25, unidade: 'UN' }
    ]
  }
];
