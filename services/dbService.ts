
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Product, Project, Kit, Customer, Task } from '../types';
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

// --- TAREFAS ---
export const fetchTasks = async (): Promise<Task[]> => {
  if (!isConfigured()) return [];
  try {
    const { data, error } = await supabase.from('tarefas').select('*').order('data_vencimento', { ascending: true });
    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      titulo: t.titulo,
      descricao: t.descricao,
      status: t.status,
      prioridade: t.prioridade,
      dataVencimento: t.data_vencimento,
      projetoId: t.projeto_id,
      projetoNome: t.projeto_nome,
      arquivoUrl: t.arquivo_url,
      arquivoNome: t.arquivo_nome,
      tags: t.tags || [],
      checklist: t.checklist || []
    }));
  } catch (e) {
    console.error("Erro ao carregar tarefas:", e);
    return [];
  }
};

export const saveTask = async (task: Task) => {
  if (!isConfigured()) throw new Error("Supabase não configurado");
  const payload = {
    titulo: task.titulo,
    descricao: task.descricao,
    status: task.status,
    prioridade: task.prioridade,
    data_vencimento: task.dataVencimento,
    projeto_id: task.projetoId,
    projeto_nome: task.projetoNome,
    arquivo_url: task.arquivoUrl,
    arquivo_nome: task.arquivoNome,
    tags: task.tags,
    checklist: task.checklist
  };
  try {
    let res;
    if (isUUID(task.id)) {
      res = await supabase.from('tarefas').update(payload).eq('id', task.id).select();
    } else {
      res = await supabase.from('tarefas').insert([payload]).select();
    }
    if (res.error) throw res.error;
    return res.data[0];
  } catch (err: any) {
    console.error("Erro ao salvar tarefa:", err);
    throw err;
  }
};

export const deleteTask = async (id: string) => {
  if (!isUUID(id) || !isConfigured()) return;
  const { error } = await supabase.from('tarefas').delete().eq('id', id);
  if (error) console.error("Erro ao excluir tarefa:", error);
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
    return [];
  }
};

export const saveProduct = async (product: Product) => {
  if (!isConfigured()) throw new Error("Supabase não configurado");
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
    throw err;
  }
};

export const deleteProduct = async (id: string) => {
  if (!isUUID(id) || !isConfigured()) return;
  await supabase.from('produtos').delete().eq('id', id);
};

// --- CLIENTES ---
export const fetchCustomers = async (): Promise<Customer[]> => {
  if (!isConfigured()) return [];
  try {
    const { data, error } = await supabase.from('clientes').select('*').order('nome');
    if (error) throw error;
    return data || [];
  } catch (e) {
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
      propostaUrl: p.proposta_url,
      financeiro: {
        ...(p.dados_json?.financeiro || {}),
        precoVendaFinal: parseFloat(p.valor_venda) || 0
      }
    }));
  } catch (e) {
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
    proposta_url: project.propostaUrl || null,
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
    throw err;
  }
};

export const deleteProject = async (id: string) => {
  if (!isUUID(id) || !isConfigured()) return;
  await supabase.from('projetos').delete().eq('id', id);
};
