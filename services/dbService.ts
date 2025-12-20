
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Product, Project, Kit, Customer, Task, Expense, Supplier } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

/**
 * SQL PARA CORREÇÃO DEFINITIVA DE RLS (Executar no SQL Editor do Supabase):
 * 
 * -- Ativar RLS
 * ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
 * ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
 * 
 * -- Criar Políticas (Permite que a chave anon faça tudo)
 * DROP POLICY IF EXISTS "anon_all_despesas" ON public.despesas;
 * CREATE POLICY "anon_all_despesas" ON public.despesas FOR ALL TO anon USING (true) WITH CHECK (true);
 * 
 * DROP POLICY IF EXISTS "anon_all_fornecedores" ON public.fornecedores;
 * CREATE POLICY "anon_all_fornecedores" ON public.fornecedores FOR ALL TO anon USING (true) WITH CHECK (true);
 */

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const isUUID = (id: any) => {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// --- DESPESAS ---
export const fetchExpenses = async (): Promise<Expense[]> => {
  try {
    const { data, error } = await supabase.from('despesas').select('*').order('data_vencimento', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      descricao: d.descricao,
      valor: parseFloat(d.valor) || 0,
      dataVencimento: d.data_vencimento,
      categoria: d.categoria,
      status: d.status,
      fornecedorId: d.fornecedor_id,
      projetoId: d.projeto_id
    }));
  } catch (e) {
    console.error("Erro despesas:", e);
    return [];
  }
};

export const saveExpense = async (expense: Expense) => {
  const payload = {
    descricao: expense.descricao,
    valor: expense.valor,
    data_vencimento: expense.dataVencimento,
    categoria: expense.categoria,
    status: expense.status,
    fornecedor_id: expense.fornecedorId,
    projeto_id: expense.projetoId
  };
  let res;
  if (isUUID(expense.id)) {
    res = await supabase.from('despesas').update(payload).eq('id', expense.id).select();
  } else {
    res = await supabase.from('despesas').insert([payload]).select();
  }
  if (res.error) throw res.error;
  return res.data[0];
};

export const deleteExpense = async (id: string) => {
  if (!isUUID(id)) return;
  await supabase.from('despesas').delete().eq('id', id);
};

// --- FORNECEDORES ---
export const fetchSuppliers = async (): Promise<Supplier[]> => {
  try {
    const { data, error } = await supabase.from('fornecedores').select('*').order('nome');
    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
};

export const saveSupplier = async (supplier: Supplier) => {
  const { id, ...cleanData } = supplier;
  let res;
  if (isUUID(id)) {
    res = await supabase.from('fornecedores').update(cleanData).eq('id', id).select();
  } else {
    res = await supabase.from('fornecedores').insert([cleanData]).select();
  }
  if (res.error) throw res.error;
  return res.data[0];
};

// --- TAREFAS ---
export const fetchTasks = async (): Promise<Task[]> => {
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
  } catch (e) { return []; }
};

export const saveTask = async (task: Task) => {
  const payload = {
    titulo: task.titulo,
    descricao: task.descricao,
    status: task.status,
    prioridade: task.prioridade,
    data_vencimento: task.dataVencimento,
    projeto_id: task.projetoId,
    projeto_nome: task.projetoNome,
    tags: task.tags,
    checklist: task.checklist
  };
  let res;
  if (isUUID(task.id)) res = await supabase.from('tarefas').update(payload).eq('id', task.id).select();
  else res = await supabase.from('tarefas').insert([payload]).select();
  return res.data?.[0];
};

export const deleteTask = async (id: string) => { if (isUUID(id)) await supabase.from('tarefas').delete().eq('id', id); };

// --- PRODUTOS ---
export const fetchProducts = async (): Promise<Product[]> => {
  const { data } = await supabase.from('produtos').select('*').order('nome');
  return (data || []).map(p => ({ id: p.id, nome: p.nome, preco: parseFloat(p.preco) || 0, imagem: p.imagem || '' }));
};

export const saveProduct = async (product: Product) => {
  const { id, ...cleanData } = product;
  if (isUUID(id)) return (await supabase.from('produtos').update(cleanData).eq('id', id).select()).data?.[0];
  return (await supabase.from('produtos').insert([cleanData]).select()).data?.[0];
};

export const deleteProduct = async (id: string) => { if (isUUID(id)) await supabase.from('produtos').delete().eq('id', id); };

// --- CLIENTES ---
export const fetchCustomers = async (): Promise<Customer[]> => {
  const { data } = await supabase.from('clientes').select('*').order('nome');
  return data || [];
};

export const saveCustomer = async (customer: Customer) => {
  const { id, ...cleanData } = customer;
  if (isUUID(id)) return (await supabase.from('clientes').update(cleanData).eq('id', id).select()).data?.[0];
  return (await supabase.from('clientes').insert([cleanData]).select()).data?.[0];
};

// --- KITS ---
export const fetchKits = async (): Promise<Kit[]> => {
  const { data } = await supabase.from('kits').select('*');
  return (data || []).map(k => ({ 
    ...(k.dados_json || {}), 
    id: k.id, 
    nomeKit: k.nome_kit, 
    tipoInfra: k.tipo_infra, 
    ativo: k.ativo 
  }));
};

export const saveKit = async (kit: Kit) => {
  const payload = { nome_kit: kit.nomeKit, tipo_infra: kit.tipoInfra, ativo: kit.ativo, dados_json: kit };
  if (isUUID(kit.id)) return (await supabase.from('kits').update(payload).eq('id', kit.id).select()).data?.[0];
  return (await supabase.from('kits').insert([payload]).select()).data?.[0];
};

export const deleteKit = async (id: string) => { if (isUUID(id)) await supabase.from('kits').delete().eq('id', id); };

// --- PROJETOS ---
export const fetchProjects = async (): Promise<Project[]> => {
  const { data } = await supabase.from('projetos').select('*').order('created_at', { ascending: false });
  return (data || []).map(p => ({ 
    ...(p.dados_json || {}), 
    id: p.id, 
    status: p.status,
    financeiro: { ...(p.dados_json?.financeiro || {}), precoVendaFinal: parseFloat(p.valor_venda) || 0 }
  }));
};

export const saveProject = async (project: Project) => {
  const payload = { obra: project.obra, status: project.status, valor_venda: project.financeiro.precoVendaFinal, dados_json: project };
  if (isUUID(project.id)) return (await supabase.from('projetos').update(payload).eq('id', project.id).select()).data?.[0];
  return (await supabase.from('projetos').insert([payload]).select()).data?.[0];
};

export const deleteProject = async (id: string) => { if (isUUID(id)) await supabase.from('projetos').delete().eq('id', id); };
