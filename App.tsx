
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Project, 
  ProjectStatus, 
  Product, 
  Kit, 
  FloorType, 
  FinancialSummary, 
  BudgetItem, 
  Floor, 
  Customer, 
  ManualItem,
  KitComponent
} from './types';
import { 
  fetchProducts, 
  fetchProjects, 
  saveProject, 
  deleteProject,
  fetchKits, 
  saveKit,
  fetchCustomers,
  saveCustomer,
  saveProduct,
  deleteProduct
} from './services/dbService';
import { calculateComposition, updateFinancialTotals } from './services/calculationService';
import { DEFAULT_KITS, DEFAULT_PROFIT_MARGIN } from './constants';

// --- Utilities ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

// --- UI Components ---

const Logo = () => (
  <div className="flex flex-col items-center leading-none select-none">
    <div className="relative mb-1">
      <i className="fa-solid fa-bolt-lightning text-4xl text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)] transform -skew-x-12"></i>
    </div>
    <div className="text-center">
      <span className="text-white font-black tracking-tighter text-lg block uppercase">Incêndio Brasília</span>
      <span className="text-red-500 font-bold text-[8px] tracking-[0.4em] uppercase block mt-0.5 border-t border-white/10 pt-0.5">Engenharia</span>
    </div>
  </div>
);

const NavTab = ({ to, label, icon, active }: { to: string, label: string, icon: string, active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-300 font-black uppercase text-[10px] tracking-widest ${
      active 
        ? 'bg-red-600 text-white shadow-lg' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <i className={`fa-solid ${icon} text-sm`}></i>
    {label}
  </Link>
);

// --- Pages ---

const Dashboard: React.FC<{ projects: Project[], onDelete: (id: string) => void }> = ({ projects, onDelete }) => {
  // Cálculo de métricas para o Dashboard
  const totalProjects = projects.length;
  const totalValue = projects.reduce((acc, p) => acc + (p.financeiro?.precoVendaFinal || 0), 0);
  const approvedCount = projects.filter(p => p.status === ProjectStatus.APPROVED).length;
  const draftCount = projects.filter(p => p.status === ProjectStatus.DRAFT).length;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Header do Dashboard */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Dashboard Brasília</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão Estratégica de Projetos Cloud</p>
        </div>
        <Link to="/project/new" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95">
          <i className="fa-solid fa-plus text-lg"></i> Novo Projeto
        </Link>
      </div>

      {/* Grid de Indicadores (Métricas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
              <i className="fa-solid fa-folder-tree text-xl"></i>
            </div>
            <div>
              <span className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Total Projetos</span>
              <span className="font-black text-2xl text-gray-950 tracking-tighter">{totalProjects}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
              <i className="fa-solid fa-sack-dollar text-xl"></i>
            </div>
            <div>
              <span className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Valor em Carteira</span>
              <span className="font-black text-2xl text-red-600 tracking-tighter italic">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
              <i className="fa-solid fa-circle-check text-xl"></i>
            </div>
            <div>
              <span className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Aprovados</span>
              <span className="font-black text-2xl text-green-600 tracking-tighter">{approvedCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500">
              <i className="fa-solid fa-pen-ruler text-xl"></i>
            </div>
            <div>
              <span className="text-[8px] font-black uppercase text-gray-400 block mb-1 tracking-widest">Rascunhos</span>
              <span className="font-black text-2xl text-orange-500 tracking-tighter">{draftCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Título da Seção de Lista */}
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-[10px] font-black uppercase text-gray-950 tracking-[0.3em] bg-gray-100 px-6 py-2 rounded-full italic">Projetos Ativos</h2>
        <div className="h-[1px] flex-1 bg-gray-200"></div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
          <i className="fa-solid fa-folder-open text-6xl text-gray-200 mb-6"></i>
          <h3 className="text-xl font-black uppercase text-gray-400">Nenhum projeto encontrado</h3>
          <p className="text-xs text-gray-400 mt-2">Inicie um novo orçamento clicando no botão acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all group overflow-hidden flex flex-col">
              <div className="p-10 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 pr-4">
                    <h3 className="font-black text-2xl text-gray-900 uppercase italic tracking-tighter leading-tight mb-1 group-hover:text-red-600 truncate">{p.cliente || 'Cliente não definido'}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] truncate">{p.obra || 'Obra não definida'}</p>
                  </div>
                  <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase border ${p.status === 'Aprovado' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400'}`}>{p.status}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 bg-gray-50 p-6 rounded-[2rem] mt-8">
                  <div>
                    <span className="text-[8px] font-black uppercase text-gray-400 block mb-1">Preço Final (Materiais)</span>
                    <span className="font-black text-xl text-red-600 italic">{formatCurrency(p.financeiro?.precoVendaFinal || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-10 py-6 border-t flex justify-between items-center">
                <button onClick={() => onDelete(p.id)} className="text-gray-300 hover:text-red-600 transition"><i className="fa-solid fa-trash-can text-xl"></i></button>
                <Link to={`/project/${p.id}`} className="text-[10px] font-black uppercase text-gray-900 hover:text-red-600 tracking-widest italic">Acessar / Editar <i className="fa-solid fa-arrow-right ml-1"></i></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProductManager: React.FC<{ 
  products: Product[], 
  onSave: (p: Product) => Promise<void>, 
  onDelete: (id: string) => Promise<void> 
}> = ({ products, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados locais para garantir que o formulário seja reativo
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number | string>(0);

  useEffect(() => {
    if (editing) {
      setFormName(editing.nome || '');
      setFormPrice(editing.preco !== undefined ? editing.preco : 0);
    } else {
      setFormName('');
      setFormPrice(0);
    }
  }, [editing]);

  const handleSave = async () => {
    if (!formName.trim()) {
      alert("Por favor, preencha o nome do produto.");
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ ...editing, nome: formName, preco: Number(formPrice) } as Product);
      setEditing(null);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Catálogo de Produtos</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão de Inventário Brasília Cloud</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative group">
            <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors"></i>
            <input 
              type="text" 
              placeholder="Pesquisar material..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-6 font-bold text-[10px] uppercase tracking-widest outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/5 transition-all w-64 shadow-sm"
            />
          </div>
          <button onClick={() => setEditing({ nome: '', preco: 0 })} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95">
            <i className="fa-solid fa-plus text-lg"></i> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl border overflow-hidden animate-fadeIn">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-32">
            <i className="fa-solid fa-boxes-stacked text-6xl text-gray-100 mb-6"></i>
            <h3 className="text-xl font-black uppercase text-gray-400">
              {searchTerm ? 'Nenhum resultado encontrado' : 'O catálogo está vazio'}
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              {searchTerm ? 'Tente buscar por outro termo ou limpe o campo.' : 'Comece adicionando os itens que compõem seus kits de alarme.'}
            </p>
            {!searchTerm && (
              <button onClick={() => setEditing({ nome: '', preco: 0 })} className="mt-8 text-red-600 font-black uppercase text-xs hover:underline">+ Adicionar Primeiro Produto</button>
            )}
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="mt-8 text-red-600 font-black uppercase text-xs hover:underline">Limpar Pesquisa</button>
            )}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b uppercase text-[10px] font-black tracking-widest text-gray-400">
              <tr>
                <th className="p-8">Descrição do Equipamento</th>
                <th className="p-8 text-right">Preço de Venda Unit. (R$)</th>
                <th className="p-8 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-8 font-black text-sm text-gray-800 uppercase italic tracking-tighter">{p.nome}</td>
                  <td className="p-8 text-right font-black text-red-600 italic">{formatCurrency(p.preco)}</td>
                  <td className="p-8">
                    <div className="flex justify-center gap-6">
                      <button onClick={() => setEditing(p)} className="text-gray-300 hover:text-gray-950 transition-all transform hover:scale-110"><i className="fa-solid fa-pen-to-square text-lg"></i></button>
                      <button onClick={() => confirm(`Deseja excluir "${p.nome}" do catálogo?`) && onDelete(p.id)} className="text-gray-300 hover:text-red-600 transition-all transform hover:scale-110"><i className="fa-solid fa-trash-can text-lg"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-12 shadow-2xl relative overflow-hidden animate-fadeIn">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
            <h2 className="text-3xl font-black uppercase italic mb-10 tracking-tighter text-gray-900 border-b pb-6">
              {editing.id ? 'Editar Produto' : 'Cadastrar Equipamento'}
            </h2>
            <div className="space-y-8">
              <label className="block">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Nome do Material</span>
                <input 
                  autoFocus
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                  placeholder="Ex: Central de Alarme Endereçável"
                  className="w-full bg-gray-50 p-5 rounded-3xl font-bold border-2 border-transparent focus:border-red-600 focus:bg-white outline-none transition-all text-gray-900" 
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Preço de Tabela (Unitário R$)</span>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400">R$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={formPrice} 
                    onChange={e => setFormPrice(e.target.value)} 
                    className="w-full bg-gray-50 p-5 pl-12 rounded-3xl font-black border-2 border-transparent focus:border-red-600 focus:bg-white outline-none transition-all text-red-600 text-2xl italic" 
                  />
                </div>
              </label>
            </div>
            <div className="mt-12 flex gap-4">
              <button onClick={() => setEditing(null)} className="flex-1 p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest bg-gray-100 text-gray-400 hover:bg-gray-200 transition">Cancelar</button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="flex-[2] bg-gray-950 text-white p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-800 transition disabled:opacity-50"
              >
                {isSaving ? 'Gravando...' : 'Gravar no Catálogo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KitManager: React.FC<{ kits: Kit[], products: Product[], onSave: (k: Kit) => Promise<void> }> = ({ kits, products, onSave }) => {
  const [editing, setEditing] = useState<Kit | null>(null);

  const addComponent = () => {
    if (!editing) return;
    const defaultProduct = products[0];
    const newComp: KitComponent = { 
      produtoNome: defaultProduct?.nome || 'Selecione um produto', 
      fatorConversao: 1,
      unidade: 'UN'
    };
    setEditing({...editing, componentes: [...editing.componentes, newComp]});
  };

  const removeComponent = (idx: number) => {
    if (!editing) return;
    const n = editing.componentes.filter((_, i) => i !== idx);
    setEditing({...editing, componentes: n});
  };

  const updateComponent = (idx: number, data: Partial<KitComponent>) => {
    if (!editing) return;
    const n = [...editing.componentes];
    n[idx] = { ...n[idx], ...data };
    setEditing({...editing, componentes: n});
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase">Configuração de Kits</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Fatores de Conversão e Composição Técnica</p>
        </div>
        <button onClick={() => setEditing({ id: 'new-' + Math.random().toString(36).substr(2,9), nomeKit: 'Novo Kit de Composição', tipoInfra: 'novo_tipo', percentualPerda: 10, componentes: [], ativo: true })} className="bg-gray-950 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all hover:scale-105 active:scale-95">
          <i className="fa-solid fa-plus text-lg"></i> Novo Kit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
        {kits.map(k => (
          <div key={k.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all relative group flex flex-col">
            <div className="absolute top-6 right-8">
              <button onClick={() => setEditing(k)} className="text-gray-200 group-hover:text-red-600 text-xl transition-all transform hover:rotate-90"><i className="fa-solid fa-gear"></i></button>
            </div>
            <div className="mb-8">
              <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 mb-1">{k.nomeKit}</h3>
              <span className="text-[9px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-full uppercase tracking-widest border border-red-100">{k.tipoInfra}</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-48 pr-2">
              <p className="text-[8px] font-black uppercase text-gray-300 tracking-[0.2em] mb-4 border-b pb-2">Itens da Composição</p>
              {k.componentes.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-500 italic border-b border-gray-50 pb-1">
                  <span className="truncate pr-4">{c.produtoNome}</span>
                  <span className="text-gray-950 font-black whitespace-nowrap">{c.fatorConversao} {c.unidade}/m</span>
                </div>
              ))}
              {k.componentes.length === 0 && <p className="text-[10px] italic text-gray-300">Nenhum item configurado.</p>}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-[5000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl p-12 shadow-2xl max-h-[90vh] overflow-y-auto relative animate-fadeIn">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
            <h2 className="text-3xl font-black uppercase italic mb-8 border-b pb-6 text-gray-950 tracking-tighter">Configurar Kit de Infraestrutura</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
              <label className="block md:col-span-2">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Nome do Kit</span>
                <input value={editing.nomeKit} onChange={e => setEditing({...editing, nomeKit: e.target.value})} className="w-full bg-gray-50 p-5 rounded-3xl font-bold border-2 border-transparent outline-none focus:border-red-600 focus:bg-white transition-all text-gray-900" />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Tag / Filtro</span>
                <input value={editing.tipoInfra} onChange={e => setEditing({...editing, tipoInfra: e.target.value})} className="w-full bg-gray-50 p-5 rounded-3xl font-bold border-2 border-transparent outline-none focus:border-red-600 focus:bg-white transition-all text-gray-900" />
              </label>
            </div>

            <div className="mb-10 bg-blue-50/50 border border-blue-100 p-6 rounded-[2.5rem]">
              <h4 className="text-[10px] font-black uppercase text-blue-600 mb-3 tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-circle-info"></i> Entendendo as Quantidades (Fator)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-500 block mb-1">Unidade (UN)</span>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed italic">Representa peças avulsas necessárias para cada metro de infraestrutura. Ex: Se usar 0.25 (1 peça a cada 4 metros), o sistema multiplicará pela metragem total e arredondará para cima.</p>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-gray-500 block mb-1">Metro (M)</span>
                  <p className="text-[10px] font-medium text-gray-500 leading-relaxed italic">Representa o consumo linear do material por metro de infraestrutura. Ex: Para tubulação, use 1.0. Para cabos, pode-se usar 1.2 (considerando sobras/curvas).</p>
                </div>
              </div>
            </div>

            <div className="mb-10">
               <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400">Materiais da Infraestrutura (Vínculo c/ Produtos)</h4>
                  <button onClick={addComponent} className="bg-red-600 text-white px-5 py-2 rounded-xl font-black uppercase text-[9px] hover:bg-red-700 transition shadow-lg">+ Vincular Material</button>
               </div>
               
               <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 px-6 text-[8px] font-black uppercase text-gray-300 tracking-widest mb-2">
                    <div className="col-span-6">Produto do Catálogo</div>
                    <div className="col-span-2 text-center">Unidade</div>
                    <div className="col-span-3 text-center">Qtde p/ Metro</div>
                    <div className="col-span-1"></div>
                  </div>
                  {editing.componentes.map((c, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-4 rounded-3xl border border-transparent hover:border-gray-200 transition-all shadow-sm">
                       <div className="col-span-6">
                         <select 
                            value={c.produtoNome} 
                            onChange={e => updateComponent(idx, { produtoNome: e.target.value })} 
                            className="w-full bg-white font-black text-xs outline-none uppercase italic p-3 rounded-2xl border-2 border-transparent focus:border-red-600 transition-all text-gray-900"
                         >
                           <option value="">Selecione um produto...</option>
                           {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                         </select>
                       </div>
                       
                       <div className="col-span-2">
                         <select 
                           value={c.unidade} 
                           onChange={e => updateComponent(idx, { unidade: e.target.value as 'UN' | 'M' })} 
                           className="w-full bg-white font-black text-xs outline-none uppercase italic p-3 rounded-2xl border-2 border-transparent focus:border-red-600 transition-all text-center text-gray-900"
                         >
                           <option value="UN">UN</option>
                           <option value="M">M</option>
                         </select>
                       </div>

                       <div className="col-span-3">
                         <div className="flex items-center gap-2">
                            <input 
                               type="number" 
                               step="0.001" 
                               value={c.fatorConversao} 
                               onChange={e => updateComponent(idx, { fatorConversao: Number(e.target.value) })} 
                               className="w-full text-center font-black bg-white border-2 border-transparent focus:border-red-600 transition-all rounded-2xl p-3 text-sm text-red-600 outline-none shadow-inner" 
                            />
                         </div>
                       </div>

                       <div className="col-span-1 flex justify-center">
                         <button onClick={() => removeComponent(idx)} className="text-gray-300 hover:text-red-600 transition-all transform hover:scale-125"><i className="fa-solid fa-circle-xmark text-xl"></i></button>
                       </div>
                    </div>
                  ))}
                  {editing.componentes.length === 0 && (
                    <div className="text-center py-16 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                      <i className="fa-solid fa-link-slash text-4xl text-gray-200 mb-4"></i>
                      <p className="text-[10px] font-bold text-gray-400 uppercase italic">Vincule produtos do catálogo para compor esta infraestrutura.</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="flex gap-4 mt-12 pt-8 border-t">
              <button onClick={() => setEditing(null)} className="flex-1 p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest bg-gray-100 text-gray-400 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={async () => { await onSave(editing); setEditing(null); }} className="flex-[2] bg-gray-950 text-white p-5 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-gray-800 transition">Salvar Configuração</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectEditor: React.FC<{ 
  projects: Project[], 
  products: Product[], 
  kits: Kit[], 
  customers: Customer[], 
  onSave: (p: Project) => Promise<void>, 
  onSaveCustomer: (c: Customer) => Promise<any>,
  setIsPrinting: (isPrinting: boolean) => void 
}> = ({ projects, products, kits, customers, onSave, onSaveCustomer, setIsPrinting }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activePhase, setActivePhase] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [isSaving, setIsSaving] = useState(false);
  const [printMode, setPrintMode] = useState<'proposal' | 'composition' | null>(null);

  const [project, setProject] = useState<Project>({
    id: 'temp-' + Math.random().toString(36).substr(2, 9),
    cliente: '', obra: '', endereco: '', status: ProjectStatus.DRAFT,
    pavimentos: [], condicoesPagamento: '30 dias após aprovação', cronograma: '15 dias úteis', observacoes: '', validadeDias: 30,
    orcamentoItens: [],
    financeiro: { custoMateriais: 0, bdiPercentual: 25, bdiValor: 0, margemLucroPercentual: DEFAULT_PROFIT_MARGIN, margemLucroValor: 0, descontoPercentual: 0, descontoValor: 0, precoVendaFinal: 0 },
    dataCriacao: new Date().toISOString()
  });

  useEffect(() => {
    if (id && id !== 'new') {
      const existing = projects.find(p => p.id === id);
      if (existing) setProject(existing);
    }
  }, [id, projects]);

  useEffect(() => {
    setIsPrinting(printMode !== null);
  }, [printMode, setIsPrinting]);

  const addFloor = () => {
    const newFloor: Floor = {
      id: Math.random().toString(36).substr(2, 9),
      nome: `Pavimento ${project.pavimentos.length + 1}`,
      tipo: FloorType.TIPO,
      referenciaPrancha: '', largura: 0, comprimento: 0, altura: 3,
      itensCentrais: [],
      infraestruturas: []
    };
    setProject({...project, pavimentos: [...project.pavimentos, newFloor]});
  };

  const updateFloor = (fId: string, data: Partial<Floor>) => {
    setProject({ ...project, pavimentos: project.pavimentos.map(f => f.id === fId ? {...f, ...data} : f)});
  };

  const addInfraToFloor = (fId: string, kitType: string) => {
    const floor = project.pavimentos.find(f => f.id === fId);
    if (!floor || floor.infraestruturas.some(i => i.tipo === kitType)) return;
    updateFloor(fId, { infraestruturas: [...floor.infraestruturas, { tipo: kitType, metragem: 0 }] });
  };

  const removeInfraFromFloor = (fId: string, kitType: string) => {
    const floor = project.pavimentos.find(f => f.id === fId);
    if (!floor) return;
    updateFloor(fId, { infraestruturas: floor.infraestruturas.filter(i => i.tipo !== kitType) });
  };

  const handleQuickCustomer = async (nome: string) => {
    if (!nome || nome.trim() === "") return;
    const existing = customers.find(c => c.nome.toLowerCase() === nome.toLowerCase());
    if (existing) {
      setProject({ ...project, cliente: existing.nome, clienteId: existing.id, endereco: existing.endereco });
    } else {
      if (confirm(`O cliente "${nome}" não está cadastrado. Deseja criar um novo cadastro automático no banco de dados?`)) {
        try {
          const newCust = await onSaveCustomer({ id: 'new', nome, documento: '', contato: '', email: '', endereco: '' });
          if (newCust && newCust.id) {
            setProject({ ...project, cliente: newCust.nome, clienteId: newCust.id });
          }
        } catch (err) {
          console.error("Erro ao cadastrar cliente:", err);
        }
      }
    }
  };

  const runCalculation = () => {
    const result = calculateComposition(project, products, kits);
    setProject({ ...project, orcamentoItens: result.items, financeiro: result.financial, status: ProjectStatus.CALCULATED });
    setActivePhase('B');
  };

  const handlePrint = (mode: 'proposal' | 'composition') => {
    setPrintMode(mode);
  };

  const closePreview = () => setPrintMode(null);

  return (
    <>
      {/* RENDERIZAÇÃO DE IMPRESSÃO / PRÉ-VISUALIZAÇÃO */}
      {printMode && (
        <div className="fixed inset-0 z-[99999] bg-gray-200 overflow-y-auto print:static print:bg-transparent print:p-0">
          <div className="no-print sticky top-0 bg-gray-900 p-4 flex justify-between items-center text-white shadow-2xl z-[100000]">
             <div className="flex items-center gap-4">
               <button onClick={closePreview} className="bg-white/10 hover:bg-white/20 p-2 px-6 rounded-xl text-xs font-black uppercase transition flex items-center gap-2">
                 <i className="fa-solid fa-arrow-left"></i> Voltar ao Editor
               </button>
               <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">Documento: {printMode === 'proposal' ? 'Proposta Comercial' : 'Composição Técnica'}</span>
             </div>
             <button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 px-10 py-3 rounded-xl font-black uppercase text-xs shadow-xl transition-all active:scale-95 flex items-center gap-3">
               <i className="fa-solid fa-print"></i> Confirmar Impressão / PDF
             </button>
          </div>

          <div className="flex justify-center p-8 print:p-0 w-full min-h-screen">
            <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-[0_0_50px_rgba(0,0,0,0.2)] p-[20mm] print:shadow-none print:p-0 print:m-0 animate-fadeIn">
              {printMode === 'proposal' ? (
                <div className="proposal-layout">
                  <div className="flex justify-between items-start mb-16 border-b-8 border-red-600 pb-8">
                    <Logo />
                    <div className="text-right">
                      <h1 className="text-4xl font-black uppercase italic tracking-tighter text-gray-900">Proposta de Materiais</h1>
                      <p className="font-bold text-gray-400 uppercase text-xs">REF: {project.id.slice(-8).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-12 mb-16">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2 border-b">Cliente / Condomínio</h4>
                      <p className="font-black text-2xl uppercase italic text-gray-900">{project.cliente}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2 border-b">Identificação da Obra</h4>
                      <p className="font-black text-xl uppercase italic text-gray-900">{project.obra}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900 text-white p-12 rounded-[3rem] shadow-2xl mb-16 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <i className="fa-solid fa-bolt-lightning text-9xl"></i>
                    </div>
                    <h3 className="text-center text-[10px] font-black uppercase tracking-[0.4em] mb-4 text-red-500">Valor Total do Investimento</h3>
                    <p className="text-center text-6xl font-black italic">{formatCurrency(project.financeiro.precoVendaFinal)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-16 mb-20">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 border-b">Condições Comerciais</h4>
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-black uppercase block text-red-600">Forma de Pagamento</span>
                          <p className="text-sm font-bold text-gray-800">{project.condicoesPagamento}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase block text-red-600">Prazo de Entrega</span>
                          <p className="text-sm font-bold text-gray-800">{project.cronograma}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black uppercase block text-red-600">Validade da Proposta</span>
                          <p className="text-sm font-bold text-gray-800">{project.validadeDias} dias corridos</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 border-b">Observações do Projeto</h4>
                      <p className="text-xs leading-relaxed text-gray-600 italic bg-gray-50 p-6 rounded-2xl border">{project.observacoes || 'Nenhuma observação adicional declarada.'}</p>
                    </div>
                  </div>

                  <div className="mt-32 pt-16 border-t flex justify-between gap-20">
                    <div className="text-center flex-1 border-t border-black pt-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-900">Responsável Comercial</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Brasília Engenharia</p>
                    </div>
                    <div className="text-center flex-1 border-t border-black pt-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-900">Aceite do Cliente</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Data: ___/___/___</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="composition-layout">
                  <div className="flex justify-between items-end border-b-4 border-black pb-4 mb-10">
                    <Logo />
                    <div className="text-right">
                      <h1 className="text-2xl font-black uppercase italic text-gray-900">Composição Técnica</h1>
                      <p className="text-[10px] font-bold uppercase text-gray-400">{project.cliente} - {project.obra}</p>
                    </div>
                  </div>
                  {project.orcamentoItens.length > 0 ? (
                    <table className="w-full text-left mb-10 border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-100 uppercase text-[9px] font-black tracking-widest">
                          <th className="p-4 border border-gray-200">Equipamento / Material</th>
                          <th className="p-4 border border-gray-200 text-center">Quantidade</th>
                          <th className="p-4 border border-gray-200 text-right">Preço Unit.</th>
                          <th className="p-4 border border-gray-200 text-right">Total Item</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {project.orcamentoItens.map(item => (
                          <tr key={item.id} className="text-[10px] border border-gray-200 font-bold uppercase text-gray-700">
                            <td className="p-4 border border-gray-200">{item.produtoNome}</td>
                            <td className="p-4 border border-gray-200 text-center">{item.qtdFinal}</td>
                            <td className="p-4 border border-gray-200 text-right">{formatCurrency(item.custoUnitario)}</td>
                            <td className="p-4 border border-gray-200 text-right">{formatCurrency(item.custoTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-10 border-2 border-dashed rounded-[2rem] text-center mb-10">
                      <p className="text-[10px] font-black uppercase text-gray-400">Proposta sem detalhamento de materiais (Custo Global)</p>
                      <p className="text-sm font-bold mt-2">Custo Base de Materiais Informado: {formatCurrency(project.financeiro.custoMateriais)}</p>
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-2 pt-4 border-t-2 border-gray-950">
                    <p className="text-xs font-bold uppercase text-gray-400">Total Materiais Bruto: {formatCurrency(project.financeiro.custoMateriais)}</p>
                    <p className="text-xl font-black italic uppercase text-red-600">Valor de Venda Final: {formatCurrency(project.financeiro.precoVendaFinal)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDITOR UI CONTENT */}
      <div className={`p-8 max-w-7xl mx-auto pb-32 animate-fadeIn ${printMode ? 'hidden' : ''}`}>
        {!printMode && (
          <div className="flex justify-between items-center mb-12 no-print">
            <button onClick={() => navigate('/')} className="w-14 h-14 bg-white border rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-600 shadow-sm transition-all"><i className="fa-solid fa-chevron-left text-xl"></i></button>
            <div className="flex gap-2">
              {[
                { id: 'A', label: 'Medição' },
                { id: 'B', label: 'Materiais' },
                { id: 'C', label: 'Proposta' },
                { id: 'D', label: 'Documentos' }
              ].map((p, i) => (
                <button key={p.id} onClick={() => setActivePhase(p.id as any)} className={`px-6 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all ${activePhase === p.id ? 'bg-red-600 text-white shadow-xl scale-105' : 'bg-white text-gray-400 hover:bg-gray-50 border'}`}>
                  {i + 1}. {p.label}
                </button>
              ))}
            </div>
            <button onClick={async () => { setIsSaving(true); await onSave(project); navigate('/'); }} className="bg-gray-950 text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px] shadow-2xl active:scale-95 transition-all">
              {isSaving ? 'Salvando...' : 'Gravar Cloud'}
            </button>
          </div>
        )}

        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-gray-100 overflow-hidden min-h-[60vh] no-print">
          {activePhase === 'A' && (
            <div className="p-12 animate-fadeIn">
              <div className="grid grid-cols-2 gap-10 mb-12">
                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Cliente / Condomínio</span>
                  <input 
                    list="customer-list" 
                    value={project.cliente} 
                    onChange={e => setProject({...project, cliente: e.target.value})} 
                    onBlur={e => handleQuickCustomer(e.target.value)}
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold bg-white focus:border-red-500 outline-none text-gray-900" 
                    placeholder="Nome do Cliente..."
                  />
                  <datalist id="customer-list">
                    {customers.map(c => <option key={c.id} value={c.nome} />)}
                  </datalist>
                </label>
                <label className="block">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Obra / Local</span>
                  <input value={project.obra} onChange={e => setProject({...project, obra: e.target.value})} className="w-full border-2 border-gray-100 rounded-2xl p-4 font-bold bg-white focus:border-red-500 outline-none text-gray-900" placeholder="Ex: Torre Alvorada" />
                </label>
              </div>

              <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-3xl mb-8">
                <h3 className="font-black uppercase italic text-sm">Estrutura e Pavimentos</h3>
                <button onClick={addFloor} className="bg-red-600 px-6 py-2 rounded-xl font-black uppercase text-[9px] shadow-lg">+ Novo Pavimento</button>
              </div>

              <div className="space-y-6">
                {project.pavimentos.map(f => (
                  <div key={f.id} className="border-2 border-gray-100 rounded-[2.5rem] p-10 bg-white hover:border-red-200 transition-all">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                      <div>
                        <input value={f.nome} onChange={e => updateFloor(f.id, {nome: e.target.value})} className="text-2xl font-black uppercase italic tracking-tighter border-b-2 border-transparent focus:border-red-600 outline-none mb-6 w-full bg-white text-gray-900" placeholder="Nome do Pavimento" />
                        <div className="grid grid-cols-3 gap-4">
                          <div><span className="text-[8px] font-black text-gray-400 uppercase mb-1 block text-center">L (m)</span><input type="number" value={f.largura} onChange={e => updateFloor(f.id, {largura: Number(e.target.value)})} className="w-full bg-white p-3 rounded-xl font-bold text-center border text-gray-900" /></div>
                          <div><span className="text-[8px] font-black text-gray-400 uppercase mb-1 block text-center">C (m)</span><input type="number" value={f.comprimento} onChange={e => updateFloor(f.id, {comprimento: Number(e.target.value)})} className="w-full bg-white p-3 rounded-xl font-bold text-center border text-gray-900" /></div>
                          <div><span className="text-[8px] font-black text-gray-400 uppercase mb-1 block text-center">H (m)</span><input type="number" value={f.altura} onChange={e => updateFloor(f.id, {altura: Number(e.target.value)})} className="w-full bg-white p-3 rounded-xl font-bold text-center border text-gray-900" /></div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest flex justify-between">Dispositivos <span>Un</span></p>
                        <div className="space-y-2">
                          {['Detector de Fumaça', 'Sirene de Alarme', 'Acionador Manual'].map(pName => (
                            <div key={pName} className="flex justify-between items-center bg-gray-50 p-2 rounded-xl border">
                              <span className="text-[9px] font-bold uppercase text-gray-600">{pName}</span>
                              <input type="number" value={f.itensCentrais.find(i => i.produtoNome === pName)?.quantidade || 0} onChange={e => {
                                const q = Number(e.target.value);
                                const n = [...f.itensCentrais];
                                const idx = n.findIndex(i => i.produtoNome === pName);
                                if (idx >= 0) n[idx].quantidade = q; else n.push({ id: Math.random().toString(36).substr(2,9), produtoNome: pName, quantidade: q });
                                updateFloor(f.id, {itensCentrais: n});
                              }} className="w-16 bg-white border rounded p-1 text-center font-black text-xs text-gray-900" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Metragem Infra</p>
                          <select className="bg-red-50 text-red-600 text-[9px] font-black uppercase p-1 rounded border border-red-200 outline-none" onChange={e => {
                            if (e.target.value) { addInfraToFloor(f.id, e.target.value); e.target.value = ''; }
                          }}>
                            <option value="">+ Add Infra</option>
                            {kits.map(k => <option key={k.id} value={k.tipoInfra}>{k.nomeKit}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          {f.infraestruturas.map(infra => (
                            <div key={infra.tipo} className="flex justify-between items-center bg-red-50 p-2 rounded-xl border border-red-100">
                              <span className="text-[9px] font-bold uppercase text-red-800 flex-1 truncate">{infra.tipo}</span>
                              <div className="flex items-center gap-2">
                                <input type="number" value={infra.metragem} onChange={e => {
                                  const m = Number(e.target.value);
                                  updateFloor(f.id, { infraestruturas: f.infraestruturas.map(i => i.tipo === infra.tipo ? { ...i, metragem: m } : i) });
                                }} className="w-16 bg-white border rounded p-1 text-center font-black text-xs text-gray-900" />
                                <button onClick={() => removeInfraFromFloor(f.id, infra.tipo)} className="text-red-300 hover:text-red-600"><i className="fa-solid fa-circle-xmark"></i></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-16 border-t pt-10">
                <button onClick={runCalculation} className="bg-red-600 text-white px-12 py-6 rounded-[2rem] font-black uppercase italic tracking-tighter text-lg shadow-2xl hover:scale-105 transition active:scale-95 flex items-center gap-4">
                   Gerar Cotação Detalhada <i className="fa-solid fa-calculator text-xl"></i>
                </button>
                <div className="text-gray-300 font-black italic uppercase text-xs">OU</div>
                <button onClick={() => { setProject({...project, orcamentoItens: []}); setActivePhase('C'); }} className="bg-gray-900 text-white px-12 py-6 rounded-[2rem] font-black uppercase italic tracking-tighter text-lg shadow-2xl hover:scale-105 transition active:scale-95 flex items-center gap-4">
                   Ir Direto para Proposta <i className="fa-solid fa-bolt text-xl text-yellow-400"></i>
                </button>
              </div>
            </div>
          )}

          {activePhase === 'B' && (
            <div className="p-12 animate-fadeIn">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-10 text-gray-900">Materiais da Cotação</h2>
              <div className="overflow-hidden rounded-[2.5rem] border-2">
                <table className="w-full text-left">
                  <thead className="bg-gray-950 text-white font-black uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="p-6">Descrição do Produto</th>
                      <th className="p-6 text-center">Quantidade</th>
                      <th className="p-6 text-right">Preço Unitário (R$)</th>
                      <th className="p-6 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {project.orcamentoItens.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="p-6 font-black uppercase text-xs text-gray-800">{item.produtoNome}</td>
                        <td className="p-6 text-center">
                          <input type="number" value={item.qtdFinal} onChange={e => {
                            const q = Number(e.target.value);
                            const n = [...project.orcamentoItens];
                            n[idx].qtdFinal = q;
                            n[idx].custoTotal = q * n[idx].custoUnitario;
                            const totalMat = n.reduce((acc, x) => acc + x.custoTotal, 0);
                            setProject({ ...project, orcamentoItens: n, financeiro: updateFinancialTotals({...project.financeiro, custoMateriais: totalMat}) });
                          }} className="w-20 border rounded-xl p-2 text-center font-black text-red-600 bg-white" />
                        </td>
                        <td className="p-6 text-right">
                          <input type="number" step="0.01" value={item.custoUnitario} onChange={e => {
                            const u = Number(e.target.value);
                            const n = [...project.orcamentoItens];
                            n[idx].custoUnitario = u;
                            n[idx].custoTotal = n[idx].qtdFinal * u;
                            const totalMat = n.reduce((acc, x) => acc + x.custoTotal, 0);
                            setProject({ ...project, orcamentoItens: n, financeiro: updateFinancialTotals({...project.financeiro, custoMateriais: totalMat}) });
                          }} className="w-32 border rounded-xl p-2 text-right font-black text-xs bg-white text-gray-900 focus:bg-white outline-none" />
                        </td>
                        <td className="p-6 text-right font-black text-xs text-red-600 italic">{formatCurrency(item.custoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-8 flex justify-end">
                <button onClick={() => setActivePhase('C')} className="bg-gray-950 text-white px-12 py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Finalizar Proposta Comercial <i className="fa-solid fa-chevron-right ml-2"></i></button>
              </div>
            </div>
          )}

          {activePhase === 'C' && (
            <div className="p-12 animate-fadeIn">
              <div className="grid grid-cols-2 gap-16">
                <div>
                  <h2 className="text-3xl font-black uppercase italic mb-8 text-gray-900">Formação de Preço</h2>
                  <div className="bg-gray-50 p-10 rounded-[3rem] space-y-8 border shadow-sm">
                    <div className="flex justify-between items-center">
                       <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Total Materiais Bruto</span>
                       {project.orcamentoItens.length === 0 ? (
                         <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-xs">R$</span>
                            <input 
                              type="number" 
                              value={project.financeiro.custoMateriais} 
                              onChange={e => setProject({...project, financeiro: updateFinancialTotals({...project.financeiro, custoMateriais: Number(e.target.value)})})} 
                              className="bg-white border-2 border-red-500/20 rounded-2xl p-4 pl-10 text-right font-black text-xl italic text-red-600 outline-none focus:ring-4 focus:ring-red-600/5 transition-all w-48 shadow-inner" 
                              placeholder="0,00"
                            />
                         </div>
                       ) : (
                         <span className="font-black text-xl italic text-gray-800">{formatCurrency(project.financeiro.custoMateriais)}</span>
                       )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-white p-6 rounded-3xl border">
                        <span className="text-[10px] font-black uppercase text-red-600 block mb-2 tracking-widest">BDI (%)</span>
                        <input type="number" value={project.financeiro.bdiPercentual} onChange={e => setProject({ ...project, financeiro: updateFinancialTotals({...project.financeiro, bdiPercentual: Number(e.target.value)}) })} className="w-full text-2xl font-black outline-none italic bg-white text-gray-900" />
                      </div>
                      <div className="bg-white p-6 rounded-3xl border group">
                        <span className="text-[10px] font-black uppercase text-red-600 block mb-2 tracking-widest flex justify-between items-center">
                          Margem Lucro (%)
                        </span>
                        <input 
                          type="number" 
                          placeholder="Ex: 15"
                          value={project.financeiro.margemLucroPercentual || ''} 
                          onChange={e => {
                             const val = e.target.value === '' ? 0 : Number(e.target.value);
                             setProject({ ...project, financeiro: updateFinancialTotals({...project.financeiro, margemLucroPercentual: val}) });
                          }} 
                          className="w-full text-2xl font-black outline-none italic bg-white text-gray-900 placeholder-gray-200" 
                        />
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-red-200">
                      <h4 className="text-[10px] font-black uppercase text-center mb-4 text-gray-400 tracking-widest">Desconto Especial</h4>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <span className="text-[8px] font-black uppercase text-gray-400 block mb-1 text-center">Em Reais (R$)</span>
                          <input type="number" step="0.01" value={project.financeiro.descontoValor} onChange={e => {
                            const val = Number(e.target.value);
                            const base = project.financeiro.custoMateriais + project.financeiro.bdiValor + project.financeiro.margemLucroValor;
                            const perc = base > 0 ? (val / base) * 100 : 0;
                            setProject({ ...project, financeiro: updateFinancialTotals({ ...project.financeiro, descontoValor: val, descontoPercentual: perc }) });
                          }} className="w-full bg-white border rounded-xl p-3 font-black text-sm text-gray-900 text-center" />
                        </div>
                        <div className="flex-1">
                          <span className="text-[8px] font-black uppercase text-gray-400 block mb-1 text-center">Em Porcentagem (%)</span>
                          <input type="number" value={project.financeiro.descontoPercentual} onChange={e => {
                            const perc = Number(e.target.value);
                            const base = project.financeiro.custoMateriais + project.financeiro.bdiValor + project.financeiro.margemLucroValor;
                            const val = base * (perc / 100);
                            setProject({ ...project, financeiro: updateFinancialTotals({ ...project.financeiro, descontoPercentual: perc, descontoValor: val }) });
                          }} className="w-full bg-white border rounded-xl p-3 font-black text-sm text-gray-900 text-center" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-600 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl">
                      <span className="text-sm font-black uppercase italic tracking-tighter">Valor Final de Venda</span>
                      <span className="text-4xl font-black italic">{formatCurrency(project.financeiro.precoVendaFinal)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                   <h2 className="text-3xl font-black uppercase italic mb-8 text-gray-900">Dados da Proposta</h2>
                   <div className="space-y-4 bg-white p-8 rounded-[3rem] border">
                      <label className="block">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Forma de Pagamento</span>
                        <input value={project.condicoesPagamento} onChange={e => setProject({...project, condicoesPagamento: e.target.value})} className="w-full border-2 rounded-2xl p-4 font-bold focus:border-red-500 outline-none bg-white text-gray-900" placeholder="Ex: 50% Entrada e 50% na Entrega" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Prazo de Entrega (Entrega)</span>
                        <input value={project.cronograma} onChange={e => setProject({...project, cronograma: e.target.value})} className="w-full border-2 rounded-2xl p-4 font-bold focus:border-red-500 outline-none bg-white text-gray-900" placeholder="Ex: 15 dias úteis" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Validade da Proposta (Dias)</span>
                        <input type="number" value={project.validadeDias} onChange={e => setProject({...project, validadeDias: Number(e.target.value)})} className="w-full border-2 rounded-2xl p-4 font-bold focus:border-red-500 outline-none bg-white text-gray-900" />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Observações Técnicas</span>
                        <textarea value={project.observacoes} onChange={e => setProject({...project, observacoes: e.target.value})} className="w-full border-2 rounded-2xl p-4 font-bold focus:border-red-500 outline-none h-24 bg-white text-gray-900" placeholder="Ex: Não incluso instalação..." />
                      </label>
                   </div>
                   <button onClick={() => setActivePhase('D')} className="w-full bg-gray-950 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95 transition">
                     Gerar Arquivos e Documentos <i className="fa-solid fa-file-pdf"></i>
                   </button>
                </div>
              </div>
            </div>
          )}

          {activePhase === 'D' && (
            <div className="p-12 animate-fadeIn">
               <h2 className="text-3xl font-black uppercase italic mb-10 text-center text-gray-900">Acesso a Documentos do Projeto</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto">
                  <div className="bg-gray-50 border-2 border-gray-100 p-10 rounded-[3.5rem] text-center hover:border-red-600 transition group cursor-pointer" onClick={() => handlePrint('proposal')}>
                     <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-red-600 group-hover:text-white transition shadow-lg">
                        <i className="fa-solid fa-file-invoice-dollar text-4xl"></i>
                     </div>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 text-gray-900">1. Proposta Comercial</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Clique para abrir a prévia e salvar como PDF para o cliente.</p>
                     <button className="mt-8 bg-white border-2 border-gray-200 px-8 py-3 rounded-2xl font-black uppercase text-[9px] group-hover:border-red-600 transition text-gray-900">Abrir Documento</button>
                  </div>

                  <div className="bg-gray-50 border-2 border-gray-100 p-10 rounded-[3.5rem] text-center hover:border-gray-900 transition group cursor-pointer" onClick={() => handlePrint('composition')}>
                     <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-gray-900 group-hover:text-white transition shadow-lg">
                        <i className="fa-solid fa-list-check text-4xl"></i>
                     </div>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 text-gray-900">2. Composição Técnica</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Detalhamento interno de equipamentos e materiais para conferência.</p>
                     <button className="mt-8 bg-white border-2 border-gray-200 px-8 py-3 rounded-2xl font-black uppercase text-[9px] group-hover:border-gray-950 transition text-gray-900">Abrir Documento</button>
                  </div>
               </div>
               <div className="mt-16 text-center border-t pt-8 max-w-2xl mx-auto">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 italic">Status: Documentos prontos para exportação</p>
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-relaxed bg-red-50 p-4 rounded-2xl">Para salvar em PDF: Clique em 'Abrir Documento', depois em 'Confirmar Impressão' e no diálogo do navegador selecione a impressora 'Salvar como PDF'.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const location = useLocation();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prods, projs, kts, custs] = await Promise.all([
        fetchProducts().catch(() => []),
        fetchProjects().catch(() => []),
        fetchKits().catch(() => DEFAULT_KITS),
        fetchCustomers().catch(() => [])
      ]);
      setProducts(prods);
      setProjects(projs);
      setKits(kts.length ? kts : DEFAULT_KITS);
      setCustomers(custs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveProject = async (p: Project) => { await saveProject(p); await loadData(); };
  const handleSaveCustomer = async (c: Customer) => { const res = await saveCustomer(c); await loadData(); return res; };
  const handleDeleteProject = async (id: string) => { if (confirm('Excluir esta cotação permanentemente?')) { await deleteProject(id); await loadData(); } };
  
  const handleSaveProduct = async (p: Product) => { await saveProduct(p); await loadData(); };
  const handleDeleteProduct = async (id: string) => { await deleteProduct(id); await loadData(); };
  const handleSaveKit = async (k: Kit) => { await saveKit(k); await loadData(); };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-red-600 p-10 text-center">
      <i className="fa-solid fa-bolt-lightning text-7xl animate-pulse mb-8"></i>
      <h2 className="text-white font-black uppercase italic tracking-[0.4em] text-xs">Acessando Brasília Cloud...</h2>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className={`bg-gray-950 text-white sticky top-0 z-[100] border-b border-white/5 backdrop-blur-xl bg-opacity-95 no-print shadow-xl ${isPrinting ? 'hidden' : 'flex'}`}>
        <div className="container mx-auto px-8 py-4 flex justify-between items-center w-full">
          <Link to="/"><Logo /></Link>
          <nav className="flex gap-4">
            <NavTab to="/" label="Projetos" icon="fa-folder-tree" active={location.pathname === '/' || location.pathname.startsWith('/project')} />
            <NavTab to="/products" label="Produtos" icon="fa-boxes-stacked" active={location.pathname === '/products'} />
            <NavTab to="/kits" label="Kits" icon="fa-gears" active={location.pathname === '/kits'} />
          </nav>
          <div className="w-10"></div>
        </div>
      </header>
      
      <main className="container mx-auto pb-24 flex-1">
        <Routes>
          <Route path="/" element={<Dashboard projects={projects} onDelete={handleDeleteProject} />} />
          <Route path="/project/:id" element={
            <ProjectEditor 
              projects={projects} 
              products={products} 
              kits={kits} 
              customers={customers} 
              onSave={handleSaveProject} 
              onSaveCustomer={handleSaveCustomer}
              setIsPrinting={setIsPrinting}
            />
          } />
          <Route path="/products" element={<ProductManager products={products} onSave={handleSaveProduct} onDelete={handleDeleteProduct} />} />
          <Route path="/kits" element={<KitManager kits={kits} products={products} onSave={handleSaveKit} />} />
        </Routes>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; color: black !important; }
          main, .container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .print-active { display: block !important; padding: 0 !important; margin: 0 !important; border: none !important; }
          .proposal-layout, .composition-layout { padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
