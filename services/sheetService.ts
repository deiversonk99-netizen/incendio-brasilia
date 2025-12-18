
import { Product, Project, Kit, Customer } from '../types';
import { SCRIPT_API_URL } from '../constants';

/**
 * Utilitário genérico para buscar dados via GET com timeout
 */
async function fetchFromSheet(sheetName: string): Promise<any[][]> {
  if (!SCRIPT_API_URL) return [];
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout

    const response = await fetch(`${SCRIPT_API_URL}?sheet=${sheetName}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Erro ao buscar aba ${sheetName}:`, error);
    return [];
  }
}

/**
 * Utilitário genérico para salvar dados via POST
 */
async function saveToSheet(targetSheet: string, data: any): Promise<boolean> {
  if (!SCRIPT_API_URL) return false;
  
  try {
    const payload = { ...data, targetSheet };
    // Usamos no-cors para evitar problemas de preflight do Google Apps Script
    // e text/plain para garantir que o corpo seja enviado corretamente
    await fetch(SCRIPT_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.error(`Erro ao salvar na aba ${targetSheet}:`, error);
    return false;
  }
}

// --- PRODUTOS ---
export const fetchProducts = async (): Promise<Product[]> => {
  const data = await fetchFromSheet('produtos');
  if (data.length < 2) return [];
  
  const headers = data[0].map((h: any) => h.toString().toUpperCase().trim());
  const nameIdx = headers.indexOf('NOME PRODUTO');
  const priceIdx = headers.indexOf('PRECO');
  const imgIdx = headers.indexOf('IMAGEM');
  
  return data.slice(1).map((row, idx) => {
    const precoRaw = row[priceIdx]?.toString() || '0';
    const preco = parseFloat(precoRaw.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    
    return {
      id: `p-${idx}`,
      nome: row[nameIdx]?.toString() || `Produto ${idx}`,
      preco: preco,
      imagem: row[imgIdx]?.toString() || '',
      descricao: '',
      demanda: '',
      isLocal: false
    };
  }).filter(p => p.nome);
};

// --- PROJETOS ---
export const fetchProjectsFromSheet = async (): Promise<Project[]> => {
  const data = await fetchFromSheet('projetos');
  if (data.length < 2) return [];
  const headers = data[0] || [];
  const jsonIdx = headers.findIndex((h: any) => h.toString().toUpperCase() === 'DADOS_JSON');
  if (jsonIdx === -1) return [];
  
  return data.slice(1).map(row => {
    try {
      const jsonStr = row[jsonIdx];
      return jsonStr ? JSON.parse(jsonStr) : null;
    } catch {
      return null;
    }
  }).filter(p => p !== null);
};

export const saveProjectToSheet = async (project: Project) => {
  return saveToSheet('projetos', {
    id: project.id,
    cliente: project.cliente,
    obra: project.obra,
    dados_json: JSON.stringify(project)
  });
};

// --- KITS ---
export const fetchKitsFromSheet = async (): Promise<Kit[]> => {
  const data = await fetchFromSheet('kits');
  if (data.length < 2) return [];
  const headers = data[0] || [];
  const jsonIdx = headers.findIndex((h: any) => h.toString().toUpperCase() === 'DADOS_JSON');
  if (jsonIdx === -1) return [];
  
  return data.slice(1).map(row => {
    try {
      return JSON.parse(row[jsonIdx]);
    } catch {
      return null;
    }
  }).filter(k => k !== null);
};

export const saveKitToSheet = async (kit: Kit) => {
  return saveToSheet('kits', {
    id: kit.id,
    nome_kit: kit.nomeKit,
    tipo_infra: kit.tipoInfra,
    dados_json: JSON.stringify(kit)
  });
};

// --- CLIENTES ---
export const fetchCustomersFromSheet = async (): Promise<Customer[]> => {
  const data = await fetchFromSheet('clientes');
  if (data.length < 2) return [];
  const headers = data[0] || [];
  const jsonIdx = headers.findIndex((h: any) => h.toString().toUpperCase() === 'DADOS_JSON');
  if (jsonIdx === -1) return [];
  
  return data.slice(1).map(row => {
    try {
      return JSON.parse(row[jsonIdx]);
    } catch {
      return null;
    }
  }).filter(c => c !== null);
};

export const saveCustomerToSheet = async (customer: Customer) => {
  return saveToSheet('clientes', {
    id: customer.id,
    nome: customer.nome,
    documento: customer.documento,
    dados_json: JSON.stringify(customer)
  });
};
