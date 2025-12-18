
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Product, Project, Kit, Customer } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

const isConfigured = () => {
  const key = SUPABASE_ANON_KEY as string;
  return SUPABASE_URL && 
         !SUPABASE_URL.includes('seu-projeto') && 
         key && 
         key !== 'COLE_AQUI_SUA_CHAVE_ANON' &&
         key.length > 20;
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const isUUID = (id: any) => {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const checkDatabaseHealth = async () => {
  const tables = ['produtos', 'clientes', 'kits', 'projetos'];
  const status: Record<string, boolean> = {};
  
  if (!isConfigured()) return { configured: false, tables: {} };

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    status[table] = !error || (error.code !== '42P01');
  }

  return { configured: true, tables: status };
};

const handleError = (error: any, context: string) => {
  console.error(`Erro em ${context}:`, error);
  const msg = error.message || "Erro desconhecido";
  
  if (!isConfigured()) {
    alert("⚠️ CONFIGURAÇÃO FALTANDO: Você precisa colar sua 'anon key' no arquivo constants.ts.");
    return msg;
  }

  if (error.code === '42P01') {
    alert(`ERRO DE BANCO: A tabela para "${context}" não existe. Execute o SQL de criação.`);
  } else {
    alert(`ERRO NO SUPABASE (${context}): ${msg}`);
  }
  return msg;
};

// --- PRODUTOS ---
export const fetchProducts = async (): Promise<Product[]> => {
  if (!isConfigured()) return [];
  try {
    const { data, error } = await supabase.from('produtos').select('*').order('nome');
    if (error) throw error;
    return (data || []).map(p => ({
      id: p.id,
      nome: p.nome,
      preco: parseFloat(p.preco) || 0,
      imagem: p.imagem || '',
      isLocal: false
    }));
  } catch (e) {
    handleError(e, "Carregar Produtos");
    return [];
  }
};

export const saveProduct = async (product: Product) => {
  if (!isConfigured()) throw new Error("Supabase não configurado");
  
  // Removemos explicitamente campos que não pertencem ao DB para evitar erro de cache de schema
  const { id, isLocal, ...cleanData } = product;
  
  try {
    let res;
    if (isUUID(id)) {
      res = await supabase.from('produtos').update(cleanData).eq('id', id).select();
    } else {
      res = await supabase.from('produtos').insert([cleanData]).select();
    }
    if (res.error) throw res.error;
    return res.data[0];
  } catch (err: any) {
    handleError(err, "Salvar Produto");
    throw err;
  }
};

export const deleteProduct = async (id: string) => {
  if (!isUUID(id) || !isConfigured()) return;
  const { error } = await supabase.from('produtos').delete().eq('id', id);
  if (error) handleError(error, "Excluir Produto");
};

// --- CLIENTES ---
export const fetchCustomers = async (): Promise<Customer[]> => {
  if (!isConfigured()) return [];
  try {
    const { data, error } = await supabase.from('clientes').select('*').order('nome');
    if (error) throw error;
    return data || [];
  } catch (e) {
    handleError(e, "Carregar Clientes");
    return [];
  }
};

export const saveCustomer = async (customer: Customer) => {
  if (!isConfigured()) throw new Error("Supabase não configurado");
  const { id, isLocal, ...cleanData } = customer;
  try {
    let res;
    if (isUUID(id)) {
      res = await supabase.from('clientes').update(cleanData).eq('id', id).select();
    } else {
      res = await supabase.from('clientes').insert([cleanData]).select();
    }
    if (res.error) throw res.error;
    return res.data[0];
  } catch (err: any) {
    handleError(err, "Salvar Cliente");
    throw err;
  }
};

// --- KITS ---
export const fetchKits = async (): Promise<Kit[]> => {
  if (!isConfigured()) return [];
  try {
    const { data, error } = await supabase.from('kits').select('*');
    if (error) throw error;
    return (data || []).map(k => ({
      ...(k.dados_json || {}),
      id: k.id,
      nomeKit: k.nome_kit,
      tipoInfra: k.tipo_infra,
      ativo: k.ativo
    }));
  } catch (e) {
    handleError(e, "Carregar Kits");
    return [];
  }
};

export const saveKit = async (kit: Kit) => {
  if (!isConfigured()) throw new Error("Supabase não configurado");
  const payload = {
    nome_kit: kit.nomeKit,
    tipo_infra: kit.tipoInfra,
    ativo: kit.ativo,
    dados_json: kit
  };
  try {
    let res;
    if (isUUID(kit.id)) {
      res = await supabase.from('kits').update(payload).eq('id', kit.id).select();
    } else {
      res = await supabase.from('kits').insert([payload]).select();
    }
    if (res.error) throw res.error;
    return res.data[0];
  } catch (err: any) {
    handleError(err, "Salvar Kit");
    throw err;
  }
};

// --- PROJETOS ---
export const fetchProjects = async (): Promise<Project[]> => {
  if (!isConfigured()) return [];
  try {
    const { data, error } = await supabase.from('projetos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => ({
      ...(p.dados_json || {}),
      id: p.id,
      clienteId: p.cliente_id,
      status: p.status,
      financeiro: {
        ...(p.dados_json?.financeiro || {}),
        precoVendaFinal: parseFloat(p.valor_venda) || 0
      }
    }));
  } catch (e) {
    handleError(e, "Carregar Projetos");
    return [];
  }
};

export const saveProject = async (project: Project) => {
  if (!isConfigured()) throw new Error("Supabase não configurado");
  const projectId = isUUID(project.id) ? project.id : null;
  const payload: any = {
    obra: project.obra || 'Sem nome',
    status: project.status,
    valor_venda: project.financeiro.precoVendaFinal || 0,
    dados_json: project
  };
  if (isUUID(project.clienteId)) {
    payload.cliente_id = project.clienteId;
  }
  try {
    let res;
    if (projectId) {
      res = await supabase.from('projetos').update(payload).eq('id', projectId).select();
    } else {
      res = await supabase.from('projetos').insert([payload]).select();
    }
    if (res.error) throw res.error;
    return res.data[0];
  } catch (err: any) {
    handleError(err, "Salvar Projeto");
    throw err;
  }
};

export const deleteProject = async (id: string) => {
  if (!isUUID(id) || !isConfigured()) return;
  const { error } = await supabase.from('projetos').delete().eq('id', id);
  if (error) handleError(error, "Excluir Projeto");
};
