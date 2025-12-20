
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Task,
  TaskStatus,
  TaskPriority,
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  Supplier
} from './types';
import { 
  fetchProducts, 
  fetchProjects, 
  saveProject, 
  deleteProject,
  fetchKits, 
  saveKit,
  deleteKit,
  fetchCustomers,
  saveCustomer,
  saveProduct,
  deleteProduct,
  fetchTasks,
  saveTask,
  deleteTask,
  fetchExpenses,
  saveExpense,
  deleteExpense,
  fetchSuppliers,
  saveSupplier
} from './services/dbService';
import { calculateComposition, updateFinancialTotals } from './services/calculationService';
import { DEFAULT_KITS } from './constants';

// --- Utilities ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
};

// --- Standard Constants ---
const STANDARD_CENTRAL_ITEMS = [
  "Placas", "Detectores", "Acionadores", "Sirene", "Luminarias", "Extintor ABC", "Caixa de Hidrante", "Bomba"
];

// --- Shared Components ---

const Logo = () => (
  <div className="flex flex-col items-center leading-none select-none">
    <div className="relative mb-1">
      <i className="fa-solid fa-bolt-lightning text-4xl text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.6)] transform -skew-x-12"></i>
    </div>
    <div className="text-center">
      <span className="text-white font-black tracking-tighter text-lg block uppercase italic">Incêndio Brasília</span>
      <span className="text-red-500 font-bold text-[8px] tracking-[0.4em] uppercase block mt-1 border-t border-white/10 pt-1">Engenharia e Sistemas</span>
    </div>
  </div>
);

const NavTab = ({ to, label, icon, active }: { to: string, label: string, icon: string, active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-500 font-black uppercase text-[10px] tracking-widest ${
      active 
        ? 'bg-red-600 text-white shadow-2xl shadow-red-600/40 translate-y-[-2px]' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`}
  >
    <i className={`fa-solid ${icon} text-sm`}></i>
    {label}
  </Link>
);

// --- Proposal Print ---

const ProposalDocument: React.FC<{ project: Project, isPreview?: boolean, id?: string }> = ({ project, isPreview = false, id }) => {
  return (
    <div 
      id={id}
      className={`${isPreview ? 'block shadow-2xl' : 'hidden print:block'} p-12 bg-white text-gray-900 font-serif min-h-screen max-w-[21cm] mx-auto`}
    >
      <div className="flex justify-between items-start border-b-4 border-red-600 pb-8 mb-12">
        <div className="flex items-center gap-4">
          <i className="fa-solid fa-bolt-lightning text-5xl text-red-600 transform -skew-x-12"></i>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Incêndio Brasília</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-600">Engenharia e Projetos</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-xl uppercase italic tracking-tighter">Proposta Comercial</p>
          <p className="text-[10px] font-bold text-gray-400">REF: {project.id.toUpperCase()}</p>
          <p className="text-[10px] font-bold text-gray-400">DATA: {new Date(project.dataCriacao).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12 text-sm">
        <div>
          <h2 className="font-black uppercase text-xs text-red-600 mb-3 tracking-widest border-b pb-1">Cliente</h2>
          <p className="font-bold text-lg">{project.cliente || 'Consumidor Final'}</p>
          <p className="text-gray-600 mt-1">{project.endereco || 'Endereço a definir'}</p>
        </div>
        <div>
          <h2 className="font-black uppercase text-xs text-red-600 mb-3 tracking-widest border-b pb-1">Obra</h2>
          <p className="font-bold text-lg">{project.obra || 'Projeto de Incêndio'}</p>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="font-black uppercase text-xs text-red-600 mb-4 tracking-widest border-b pb-1">Materiais</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-gray-900 text-[10px] font-black uppercase tracking-widest">
              <th className="py-2">Descrição</th>
              <th className="py-2 text-center">Qtd</th>
              <th className="py-2 text-right">Unit.</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {project.orcamentoItens.map((item, idx) => (
              <tr key={idx}>
                <td className="py-3 font-bold uppercase text-[11px]">{item.produtoNome}</td>
                <td className="py-3 text-center font-bold">{item.qtdFinal}</td>
                <td className="py-3 text-right text-gray-500">{formatCurrency(item.custoUnitario)}</td>
                <td className="py-3 text-right font-black">{formatCurrency(item.custoTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900">
              <td colSpan={3} className="py-4 text-right font-black uppercase text-xs">Valor Global:</td>
              <td className="py-4 text-right font-black text-xl italic text-red-600">{formatCurrency(project.financeiro.precoVendaFinal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="text-[10px] leading-relaxed border-t pt-4">
        <p><b>Condições:</b> {project.condicoesPagamento}</p>
        <p><b>Prazo:</b> {project.cronograma}</p>
        <p><b>Validade:</b> {project.validadeDias} dias</p>
      </div>
    </div>
  );
};

// --- Project Editor (Aba Projetos) ---

const ProjectEditor: React.FC<{ 
  projects: Project[], 
  products: Product[], 
  kits: Kit[], 
  onSave: (p: Project) => Promise<void> 
}> = ({ projects, products, kits, onSave }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'cotacao' | 'composicao' | 'proposta'>('cotacao');

  useEffect(() => {
    if (id === 'new') {
      setProject({
        id: Math.random().toString(36).substr(2, 9),
        cliente: '', obra: '', endereco: '', status: ProjectStatus.DRAFT,
        pavimentos: [], condicoesPagamento: '30 dias', cronograma: '15 dias',
        observacoes: '', validadeDias: 30, orcamentoItens: [],
        financeiro: { custoMateriais: 0, bdiPercentual: 25, bdiValor: 0, margemLucroPercentual: 15, margemLucroValor: 0, descontoPercentual: 0, descontoValor: 0, precoVendaFinal: 0 },
        dataCriacao: new Date().toISOString()
      });
    } else {
      const found = projects.find(p => p.id === id);
      if (found) setProject(JSON.parse(JSON.stringify(found)));
    }
  }, [id, projects]);

  if (!project) return null;

  const handleAddFloor = () => {
    const newFloor: Floor = { 
      id: Math.random().toString(36).substr(2, 9), nome: `Pavimento ${project.pavimentos.length + 1}`,
      tipo: FloorType.TIPO, referenciaPrancha: '', largura: 0, comprimento: 0, altura: 3,
      itensCentrais: STANDARD_CENTRAL_ITEMS.map(name => ({ id: Math.random().toString(), produtoNome: name, quantidade: 0 })),
      infraestruturas: []
    };
    setProject({ ...project, pavimentos: [...project.pavimentos, newFloor] });
  };

  const handleCalculate = () => {
    const { items, financial } = calculateComposition(project, products, kits);
    setProject({ ...project, orcamentoItens: items, financeiro: financial, status: ProjectStatus.CALCULATED });
    setActiveTab('composicao');
  };

  const handleUpdateBudgetManual = (itemId: string, field: 'qtdFinal' | 'custoUnitario', value: number) => {
    const newItems = project.orcamentoItens.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        updated.custoTotal = updated.qtdFinal * updated.custoUnitario;
        return updated;
      }
      return item;
    });
    const materialCost = newItems.reduce((acc, it) => acc + it.custoTotal, 0);
    const newFinancial = updateFinancialTotals({ ...project.financeiro, custoMateriais: materialCost });
    setProject({ ...project, orcamentoItens: newItems, financeiro: newFinancial });
  };

  const handleUpdateDiscount = (type: 'percent' | 'value', value: number) => {
    let newFin = { ...project.financeiro };
    const subtotalComMargens = (newFin.custoMateriais + newFin.bdiValor + newFin.margemLucroValor);

    if (type === 'percent') {
      newFin.descontoPercentual = value;
      newFin.descontoValor = subtotalComMargens * (value / 100);
    } else {
      newFin.descontoValor = value;
      newFin.descontoPercentual = subtotalComMargens > 0 ? (value / subtotalComMargens) * 100 : 0;
    }
    
    newFin.precoVendaFinal = subtotalComMargens - newFin.descontoValor;
    setProject({ ...project, financeiro: newFin });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-fadeIn no-print pb-32">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 border-b pb-10">
        <h1 className="text-6xl font-black uppercase italic tracking-tighter">Editor de <span className="text-red-600">Projeto</span></h1>
        <div className="flex bg-gray-100 p-2 rounded-[2.5rem] shadow-inner">
           <button onClick={() => setActiveTab('cotacao')} className={`px-10 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'cotacao' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400'}`}>1. Cotação</button>
           <button onClick={() => setActiveTab('composicao')} className={`px-10 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'composicao' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400'}`}>2. Composição</button>
           <button onClick={() => setActiveTab('proposta')} className={`px-10 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'proposta' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400'}`}>3. Proposta</button>
        </div>
      </div>

      {activeTab === 'cotacao' && (
        <div className="space-y-10">
          <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8">
            <input value={project.cliente} onChange={e => setProject({...project, cliente: e.target.value})} placeholder="Nome do Cliente" className="w-full bg-gray-50 p-6 rounded-2xl font-bold border-none" />
            <input value={project.obra} onChange={e => setProject({...project, obra: e.target.value})} placeholder="Obra" className="w-full bg-gray-50 p-6 rounded-2xl font-bold border-none" />
            <input value={project.endereco} onChange={e => setProject({...project, endereco: e.target.value})} placeholder="Endereço" className="w-full bg-gray-50 p-6 rounded-2xl font-bold border-none md:col-span-2" />
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">Pavimentos</h2>
            <button onClick={handleAddFloor} className="bg-gray-950 text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition">+ Novo Pavimento</button>
          </div>

          {project.pavimentos.map((floor, fIdx) => (
            <div key={floor.id} className="bg-white p-12 rounded-[5rem] shadow-2xl border border-gray-100 grid grid-cols-1 lg:grid-cols-4 gap-12">
               <div className="lg:col-span-1 border-r pr-10">
                  <input value={floor.nome} onChange={e => { const n = [...project.pavimentos]; n[fIdx].nome = e.target.value; setProject({...project, pavimentos: n}); }} className="text-3xl font-black italic uppercase bg-transparent w-full" />
                  <div className="grid grid-cols-3 gap-2 mt-8">
                    <input type="number" placeholder="L" value={floor.largura} onChange={e => { const n = [...project.pavimentos]; n[fIdx].largura = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n}); }} className="w-full bg-gray-50 p-3 rounded-lg text-center font-bold" />
                    <input type="number" placeholder="C" value={floor.comprimento} onChange={e => { const n = [...project.pavimentos]; n[fIdx].comprimento = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n}); }} className="w-full bg-gray-50 p-3 rounded-lg text-center font-bold" />
                    <input type="number" placeholder="H" value={floor.altura} onChange={e => { const n = [...project.pavimentos]; n[fIdx].altura = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n}); }} className="w-full bg-gray-50 p-3 rounded-lg text-center font-bold" />
                  </div>
               </div>
               <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                  {floor.itensCentrais.map((item, iIdx) => (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase italic truncate">{item.produtoNome}</span>
                      <input type="number" value={item.quantidade} onChange={e => { const n = [...project.pavimentos]; n[fIdx].itensCentrais[iIdx].quantidade = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n}); }} className="w-16 bg-white p-2 rounded-xl text-center font-black text-red-600 border-none shadow-sm" />
                    </div>
                  ))}
               </div>
               <div className="lg:col-span-1 bg-gray-50 p-8 rounded-[3rem] space-y-4">
                  <span className="text-[9px] font-black uppercase text-gray-400 block mb-4">Infraestrutura (m)</span>
                  {kits.map(k => (
                    <div key={k.id} className="flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-gray-950 uppercase">{k.nomeKit}</span>
                      <input type="number" value={floor.infraestruturas.find(i => i.tipo === k.tipoInfra)?.metragem || 0} onChange={e => {
                        const n = [...project.pavimentos];
                        const idx = n[fIdx].infraestruturas.findIndex(i => i.tipo === k.tipoInfra);
                        const val = parseFloat(e.target.value) || 0;
                        if (idx >= 0) n[fIdx].infraestruturas[idx].metragem = val;
                        else n[fIdx].infraestruturas.push({ tipo: k.tipoInfra, metragem: val });
                        setProject({...project, pavimentos: n});
                      }} className="w-full bg-white p-3 rounded-xl font-black text-center" />
                    </div>
                  ))}
               </div>
            </div>
          ))}
          <div className="flex justify-center pt-10">
             <button onClick={handleCalculate} className="bg-red-600 text-white px-20 py-6 rounded-[3rem] font-black uppercase text-xs shadow-2xl hover:scale-105 transition-all">Gerar Composição</button>
          </div>
        </div>
      )}

      {activeTab === 'composicao' && (
        <div className="bg-white p-12 rounded-[5rem] shadow-2xl border border-gray-100">
          <div className="flex justify-between items-end mb-12 border-b pb-8">
            <h2 className="text-4xl font-black italic uppercase">B.4 - Revisão</h2>
            <span className="text-4xl font-black italic">{formatCurrency(project.financeiro.custoMateriais)}</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase text-gray-400 border-b">
                <th className="pb-6">Descrição</th>
                <th className="pb-6 text-center">Origem</th>
                <th className="pb-6 text-center">Qtd Final</th>
                <th className="pb-6 text-right">Unitário (R$)</th>
                <th className="pb-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {project.orcamentoItens.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-6 font-black uppercase text-xs">{item.produtoNome}</td>
                  <td className="py-6 text-center text-[8px] font-bold uppercase">{item.origem}</td>
                  <td className="py-6 text-center">
                    <input type="number" value={item.qtdFinal} onChange={e => handleUpdateBudgetManual(item.id, 'qtdFinal', parseFloat(e.target.value) || 0)} className="w-20 bg-gray-100 p-2 rounded-lg text-center font-black" />
                  </td>
                  <td className="py-6 text-right">
                    <input type="number" step="0.01" value={item.custoUnitario} onChange={e => handleUpdateBudgetManual(item.id, 'custoUnitario', parseFloat(e.target.value) || 0)} className="w-28 bg-gray-100 p-2 rounded-lg text-right font-black" />
                  </td>
                  <td className="py-6 text-right font-black italic">{formatCurrency(item.custoTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-center pt-10">
             <button onClick={() => setActiveTab('proposta')} className="bg-gray-950 text-white px-20 py-6 rounded-[3rem] font-black uppercase text-xs">Ir para Proposta</button>
          </div>
        </div>
      )}

      {activeTab === 'proposta' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fadeIn">
          <div className="bg-white p-12 rounded-[5rem] shadow-xl space-y-8">
            <h3 className="text-xs font-black uppercase text-gray-400 border-b pb-4 tracking-[0.3em]">C.2 - Preço</h3>
            <div className="grid grid-cols-2 gap-8">
              <label className="block">
                <span className="text-[8px] font-black text-gray-400 uppercase">BDI (%)</span>
                <input type="number" value={project.financeiro.bdiPercentual} onChange={e => setProject({...project, financeiro: updateFinancialTotals({...project.financeiro, bdiPercentual: parseFloat(e.target.value) || 0})})} className="w-full bg-gray-50 p-5 rounded-2xl font-black mt-2" />
              </label>
              <label className="block">
                <span className="text-[8px] font-black text-gray-400 uppercase">Margem (%)</span>
                <input type="number" value={project.financeiro.margemLucroPercentual} onChange={e => setProject({...project, financeiro: updateFinancialTotals({...project.financeiro, margemLucroPercentual: parseFloat(e.target.value) || 0})})} className="w-full bg-gray-50 p-5 rounded-2xl font-black mt-2" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <label className="block">
                <span className="text-[8px] font-black text-gray-400 uppercase">Desconto (R$)</span>
                <input type="number" value={project.financeiro.descontoValor} onChange={e => handleUpdateDiscount('value', parseFloat(e.target.value) || 0)} className="w-full bg-red-50 p-5 rounded-2xl font-black mt-2" />
              </label>
              <label className="block">
                <span className="text-[8px] font-black text-gray-400 uppercase">Desconto (%)</span>
                <input type="number" step="0.01" value={project.financeiro.descontoPercentual} onChange={e => handleUpdateDiscount('percent', parseFloat(e.target.value) || 0)} className="w-full bg-red-50 p-5 rounded-2xl font-black mt-2" />
              </label>
            </div>
            <div className="bg-gray-950 p-10 rounded-[3rem] text-white">
              <span className="text-[10px] font-black uppercase text-red-600 block mb-2">Preço Final</span>
              <span className="text-5xl font-black italic">{formatCurrency(project.financeiro.precoVendaFinal)}</span>
            </div>
          </div>
          <div className="bg-white p-12 rounded-[5rem] shadow-xl space-y-6">
            <h3 className="text-xs font-black uppercase text-gray-400 border-b pb-4 tracking-[0.3em]">C.3 - Termos</h3>
            <input value={project.condicoesPagamento} onChange={e => setProject({...project, condicoesPagamento: e.target.value})} placeholder="Pagamento" className="w-full bg-gray-50 p-5 rounded-2xl font-bold" />
            <input value={project.cronograma} onChange={e => setProject({...project, cronograma: e.target.value})} placeholder="Cronograma" className="w-full bg-gray-50 p-5 rounded-2xl font-bold" />
            <textarea value={project.observacoes} onChange={e => setProject({...project, observacoes: e.target.value})} placeholder="Obs..." className="w-full bg-gray-50 p-5 rounded-2xl font-bold h-32" />
          </div>
        </div>
      )}

      <div className="fixed bottom-10 right-10 z-[2000] no-print flex gap-4">
         <button onClick={async () => { await onSave(project); navigate('/'); }} className="bg-gray-950 text-white px-10 py-5 rounded-full font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl hover:bg-red-600 transition-all border-2 border-white/10">
            SALVAR PROJETO
         </button>
      </div>
    </div>
  );
};

// --- Aba Insumos (Catálogo) ---

const ProductManager: React.FC<{ products: Product[], onSave: (p: Product) => Promise<void>, onDelete: (id: string) => Promise<void> }> = ({ products, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl font-black uppercase italic tracking-tighter">Catálogo <span className="text-red-600">Insumos</span></h1>
        <button onClick={() => setEditing({ nome: '', preco: 0 })} className="bg-gray-950 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all">+ Novo Cadastro</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {products.map(p => (
          <div key={p.id} className="bg-white p-10 rounded-[4rem] shadow-lg border border-gray-100 flex flex-col items-center group">
            <h3 className="font-black text-center mb-2 uppercase text-[10px] text-gray-400 leading-tight">{p.nome}</h3>
            <span className="font-black text-xl italic">{formatCurrency(p.preco)}</span>
            <div className="flex gap-4 mt-6 opacity-0 group-hover:opacity-100 transition">
               <button onClick={() => setEditing(p)} className="text-gray-300 hover:text-gray-950 transition-all"><i className="fa-solid fa-pen"></i></button>
               <button onClick={() => onDelete(p.id)} className="text-gray-300 hover:text-red-600 transition-all"><i className="fa-solid fa-trash"></i></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 rounded-[4rem] w-full max-w-md animate-fadeIn shadow-2xl">
             <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b pb-8">Insumo</h2>
             <div className="space-y-6">
                <input value={editing.nome} onChange={e => setEditing({...editing, nome: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
                <input type="number" value={editing.preco} onChange={e => setEditing({...editing, preco: parseFloat(e.target.value) || 0})} placeholder="Preço" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
             </div>
             <div className="flex gap-6 mt-12">
                <button onClick={() => setEditing(null)} className="flex-1 py-5 bg-gray-100 rounded-full font-black uppercase text-[10px] text-gray-400">Cancelar</button>
                <button onClick={async () => { await onSave(editing as Product); setEditing(null); }} className="flex-[2] py-5 bg-red-600 text-white rounded-full font-black uppercase text-[10px] shadow-xl">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Aba Tarefas (Kanban) ---

const TaskManager: React.FC<{ 
  tasks: Task[], 
  projects: Project[], 
  onSave: (t: Task) => Promise<void>, 
  onDelete: (id: string) => Promise<void> 
}> = ({ tasks, projects, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Partial<Task> | null>(null);

  const handleMove = async (task: Task, direction: 'next' | 'prev') => {
    let nextStatus = task.status;
    if (direction === 'next') {
      if (task.status === TaskStatus.TODO) nextStatus = TaskStatus.DOING;
      else if (task.status === TaskStatus.DOING) nextStatus = TaskStatus.DONE;
    } else {
      if (task.status === TaskStatus.DONE) nextStatus = TaskStatus.DOING;
      else if (task.status === TaskStatus.DOING) nextStatus = TaskStatus.TODO;
    }
    await onSave({ ...task, status: nextStatus });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl font-black italic uppercase tracking-tighter">Gestão <span className="text-red-600">Operacional</span></h1>
        <button onClick={() => setEditing({ titulo: '', status: TaskStatus.TODO, prioridade: TaskPriority.MEDIUM, dataVencimento: new Date().toISOString().split('T')[0] })} className="bg-gray-950 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all">+ Nova Tarefa</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE].map(status => (
          <div key={status} className="bg-gray-100/40 p-6 rounded-[3rem] min-h-[600px] flex flex-col">
            <h3 className="font-black uppercase italic text-gray-950 text-xs tracking-[0.4em] mb-10 px-6">{status}</h3>
            <div className="space-y-6 flex-1">
              {tasks.filter(t => t.status === status).map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-red-100 group">
                   <h4 className="font-black text-lg italic uppercase tracking-tighter text-gray-950 mb-2">{t.titulo}</h4>
                   <p className="text-[10px] text-gray-500 line-clamp-2 mb-6">{t.descricao}</p>
                   <div className="flex justify-between items-center border-t pt-6">
                      <div className="flex gap-2">
                        {status !== TaskStatus.TODO && (
                          <button onClick={() => handleMove(t, 'prev')} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center">
                            <i className="fa-solid fa-arrow-left text-xs"></i>
                          </button>
                        )}
                        {status !== TaskStatus.DONE && (
                          <button onClick={() => handleMove(t, 'next')} className="w-10 h-10 rounded-full bg-gray-950 text-white hover:bg-red-600 transition-all flex items-center justify-center">
                            <i className="fa-solid fa-arrow-right text-xs"></i>
                          </button>
                        )}
                      </div>
                      <button onClick={() => setEditing(t)} className="text-gray-300 hover:text-gray-950 transition"><i className="fa-solid fa-pen-to-square"></i></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 rounded-[4rem] w-full max-w-2xl animate-fadeIn shadow-2xl">
             <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b pb-8">Tarefa</h2>
             <div className="space-y-8">
                <input value={editing.titulo} onChange={e => setEditing({...editing, titulo: e.target.value})} className="w-full bg-gray-50 p-6 rounded-[2rem] font-black uppercase italic text-lg border-none" placeholder="Título" />
                <textarea value={editing.descricao} onChange={e => setEditing({...editing, descricao: e.target.value})} className="w-full bg-gray-50 p-6 rounded-[2rem] h-32 border-none" placeholder="Descrição" />
             </div>
             <div className="flex gap-6 mt-16">
                <button onClick={() => setEditing(null)} className="flex-1 py-6 bg-gray-100 rounded-[3rem] font-black uppercase text-[10px] text-gray-400">Cancelar</button>
                <button onClick={async () => { await onSave(editing as Task); setEditing(null); }} className="flex-[2] py-6 bg-red-600 text-white rounded-[3rem] font-black uppercase text-[10px] shadow-xl">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Aba Engenharia (Kits) ---

const KitManager: React.FC<{ 
  kits: Kit[], 
  products: Product[], 
  onSave: (k: Kit) => Promise<void>,
  onDelete: (id: string) => Promise<void>
}> = ({ kits, products, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Kit | null>(null);

  const handleOpenNew = () => {
    setEditing({ id: Math.random().toString(36).substr(2, 9), nomeKit: '', tipoInfra: 'novo', percentualPerda: 10, ativo: true, componentes: [] });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl font-black uppercase italic tracking-tighter">Padrões <span className="text-red-600">Engenharia</span></h1>
        <button onClick={handleOpenNew} className="bg-gray-950 text-white px-12 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all">+ Novo Padrão</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {kits.map(k => (
          <div key={k.id} className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 group">
             <div className="flex justify-between items-start mb-8">
               <span className="bg-red-50 text-red-600 text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest">{k.tipoInfra}</span>
               <button onClick={() => setEditing(JSON.parse(JSON.stringify(k)))} className="text-gray-300 hover:text-gray-950 transition"><i className="fa-solid fa-pen-to-square"></i></button>
             </div>
             <h3 className="font-black uppercase italic text-3xl tracking-tighter mb-4">{k.nomeKit}</h3>
             <p className="text-[10px] font-bold text-gray-400 uppercase">Perda: <b className="text-gray-950">{k.percentualPerda}%</b></p>
             <div className="mt-8 space-y-2">
               {k.componentes.map((c, idx) => (
                 <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                    <span className="truncate flex-1 pr-4">{c.produtoNome}</span>
                    <span className="bg-gray-50 px-2 py-1 rounded">x{c.fatorConversao}</span>
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 rounded-[4rem] w-full max-w-4xl animate-fadeIn shadow-2xl max-h-[90vh] overflow-y-auto">
             <div className="flex justify-between items-start border-b pb-8 mb-10 text-4xl font-black uppercase italic tracking-tighter">
               <h2>Configurar <span className="text-red-600">Kit</span></h2>
               <button onClick={() => setEditing(null)} className="text-gray-300 hover:text-red-600 transition"><i className="fa-solid fa-xmark"></i></button>
             </div>
             <div className="grid grid-cols-3 gap-8 mb-12">
                <input value={editing.nomeKit} onChange={e => setEditing({...editing, nomeKit: e.target.value})} className="bg-gray-50 p-5 rounded-2xl font-bold border-none" placeholder="Nome" />
                <input value={editing.tipoInfra} onChange={e => setEditing({...editing, tipoInfra: e.target.value})} className="bg-gray-50 p-5 rounded-2xl font-bold border-none" placeholder="Slug (tipo)" />
                <input type="number" value={editing.percentualPerda} onChange={e => setEditing({...editing, percentualPerda: parseFloat(e.target.value) || 0})} className="bg-gray-50 p-5 rounded-2xl font-bold border-none" placeholder="Perda (%)" />
             </div>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.4em]">Insumos / Componentes</h4>
                   <button onClick={() => setEditing({...editing, componentes: [...editing.componentes, { produtoNome: products[0]?.nome || '', fatorConversao: 1, unidade: 'UN' }]})} className="bg-gray-950 text-white px-6 py-2 rounded-full text-[9px] font-black uppercase hover:bg-red-600 transition">Adicionar</button>
                </div>
                {editing.componentes.map((c, i) => (
                   <div key={i} className="flex items-center gap-6 bg-gray-50 p-6 rounded-[2.5rem]">
                      <select value={c.produtoNome} onChange={e => { const n = [...editing.componentes]; n[i].produtoNome = e.target.value; setEditing({...editing, componentes: n}); }} className="flex-1 bg-transparent border-none font-black text-[12px] uppercase">
                        {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                      </select>
                      <input type="number" step="0.01" value={c.fatorConversao} onChange={e => { const n = [...editing.componentes]; n[i].fatorConversao = parseFloat(e.target.value) || 0; setEditing({...editing, componentes: n}); }} className="w-20 bg-white p-3 rounded-xl text-center font-black" />
                      <button onClick={() => { const n = editing.componentes.filter((_, idx) => idx !== i); setEditing({...editing, componentes: n}); }} className="text-red-200 hover:text-red-600 transition"><i className="fa-solid fa-trash-can"></i></button>
                   </div>
                ))}
             </div>
             <div className="flex gap-6 mt-16 pt-8 border-t">
               <button onClick={() => setEditing(null)} className="flex-1 py-6 bg-gray-100 rounded-[2.5rem] font-black uppercase text-[10px] text-gray-400">Cancelar</button>
               <button onClick={async () => { await onSave(editing!); setEditing(null); }} className="flex-[2] py-6 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl">Salvar Padrão</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Aba Financeiro (Fluxo de Caixa) ---

const FinanceManager: React.FC<{ 
  projects: Project[], 
  expenses: Expense[], 
  suppliers: Supplier[], 
  onSaveExpense: (e: Expense) => Promise<void>, 
  onDeleteExpense: (id: string) => Promise<void>,
  onSaveSupplier: (s: Supplier) => Promise<void>
}> = ({ projects, expenses, suppliers, onSaveExpense, onDeleteExpense, onSaveSupplier }) => {
  const [activeSubTab, setActiveSubTab] = useState<'despesas' | 'fornecedores'>('despesas');
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl font-black italic uppercase tracking-tighter">Fluxo <span className="text-red-600">Financeiro</span></h1>
        <div className="flex bg-gray-100 p-2 rounded-[2.5rem] shadow-inner">
           <button onClick={() => setActiveSubTab('despesas')} className={`px-8 py-3 rounded-full font-black uppercase text-[10px] transition-all ${activeSubTab === 'despesas' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400'}`}>Despesas</button>
           <button onClick={() => setActiveSubTab('fornecedores')} className={`px-8 py-3 rounded-full font-black uppercase text-[10px] transition-all ${activeSubTab === 'fornecedores' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400'}`}>Fornecedores</button>
        </div>
      </div>

      <div className="bg-gray-950 p-10 rounded-[3rem] shadow-xl text-white mb-12 flex justify-between items-center">
         <div>
            <span className="text-[10px] font-black uppercase text-red-600 block mb-2 tracking-widest">Total Geral em Saídas</span>
            <span className="text-5xl font-black italic">{formatCurrency(totalExpenses)}</span>
         </div>
         <button onClick={() => setEditingExpense({ descricao: '', valor: 0, dataVencimento: new Date().toISOString().split('T')[0], categoria: ExpenseCategory.MATERIAL, status: ExpenseStatus.PENDING })} className="bg-red-600 px-10 py-5 rounded-full font-black uppercase text-[10px] hover:scale-105 transition">+ Lançar Despesa</button>
      </div>

      {activeSubTab === 'despesas' ? (
        <div className="bg-white rounded-[4rem] shadow-xl border border-gray-100 overflow-hidden">
           <table className="w-full text-left">
              <thead>
                 <tr className="text-[10px] font-black uppercase text-gray-400 border-b tracking-widest">
                    <th className="p-8">Descrição</th>
                    <th className="p-8">Vencimento</th>
                    <th className="p-8">Status</th>
                    <th className="p-8 text-right">Valor</th>
                    <th className="p-8">Ações</th>
                 </tr>
              </thead>
              <tbody className="divide-y">
                 {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                       <td className="p-8 font-black uppercase text-xs italic">{exp.descricao}</td>
                       <td className="p-8 font-bold text-xs">{new Date(exp.dataVencimento).toLocaleDateString('pt-BR')}</td>
                       <td className="p-8 text-[8px] font-black uppercase">
                          <span className={`px-3 py-1 rounded-full ${exp.status === ExpenseStatus.PAID ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>{exp.status}</span>
                       </td>
                       <td className="p-8 text-right font-black italic text-sm">{formatCurrency(exp.valor)}</td>
                       <td className="p-8 flex gap-4">
                          <button onClick={() => setEditingExpense(exp)} className="text-gray-200 hover:text-gray-950 transition"><i className="fa-solid fa-pen"></i></button>
                          <button onClick={() => onDeleteExpense(exp.id)} className="text-gray-200 hover:text-red-600 transition"><i className="fa-solid fa-trash"></i></button>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {suppliers.map(sup => (
             <div key={sup.id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
                <h3 className="font-black text-xl italic uppercase mb-2">{sup.nome}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{sup.categoria}</p>
                <div className="mt-6 pt-4 border-t flex justify-between items-center">
                   <span className="text-[10px] font-bold text-gray-950">{sup.contato}</span>
                   <button onClick={() => setEditingSupplier(sup)} className="text-gray-200 hover:text-gray-950 transition"><i className="fa-solid fa-pen"></i></button>
                </div>
             </div>
           ))}
           <button onClick={() => setEditingSupplier({ nome: '', contato: '', categoria: '' })} className="bg-gray-100 p-10 rounded-[3rem] border-2 border-dashed border-gray-300 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:border-red-600 hover:text-red-600 transition">Adicionar Fornecedor</button>
        </div>
      )}

      {editingExpense && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 rounded-[4rem] w-full max-w-2xl animate-fadeIn shadow-2xl">
             <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b pb-8">Lançamento</h2>
             <div className="space-y-6">
                <input value={editingExpense.descricao} onChange={e => setEditingExpense({...editingExpense, descricao: e.target.value})} placeholder="Descrição" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
                <div className="grid grid-cols-2 gap-6">
                   <input type="number" value={editingExpense.valor} onChange={e => setEditingExpense({...editingExpense, valor: parseFloat(e.target.value) || 0})} placeholder="Valor (R$)" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
                   <input type="date" value={editingExpense.dataVencimento} onChange={e => setEditingExpense({...editingExpense, dataVencimento: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <select value={editingExpense.status} onChange={e => setEditingExpense({...editingExpense, status: e.target.value as any})} className="w-full bg-gray-50 p-5 rounded-2xl font-black uppercase text-xs border-none">
                      {Object.values(ExpenseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <select value={editingExpense.categoria} onChange={e => setEditingExpense({...editingExpense, categoria: e.target.value as any})} className="w-full bg-gray-50 p-5 rounded-2xl font-black uppercase text-xs border-none">
                      {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
             </div>
             <div className="flex gap-6 mt-12">
                <button onClick={() => setEditingExpense(null)} className="flex-1 py-5 bg-gray-100 rounded-full font-black uppercase text-[10px] text-gray-400">Cancelar</button>
                <button onClick={async () => { await onSaveExpense(editingExpense as Expense); setEditingExpense(null); }} className="flex-[2] py-5 bg-red-600 text-white rounded-full font-black uppercase text-[10px] shadow-xl">Salvar</button>
             </div>
          </div>
        </div>
      )}

      {editingSupplier && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 rounded-[4rem] w-full max-w-2xl animate-fadeIn shadow-2xl">
             <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b pb-8">Fornecedor</h2>
             <div className="space-y-6">
                <input value={editingSupplier.nome} onChange={e => setEditingSupplier({...editingSupplier, nome: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
                <input value={editingSupplier.contato} onChange={e => setEditingSupplier({...editingSupplier, contato: e.target.value})} placeholder="Contato" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
                <input value={editingSupplier.categoria} onChange={e => setEditingSupplier({...editingSupplier, categoria: e.target.value})} placeholder="Categoria" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none" />
             </div>
             <div className="flex gap-6 mt-12">
                <button onClick={() => setEditingSupplier(null)} className="flex-1 py-5 bg-gray-100 rounded-full font-black uppercase text-[10px] text-gray-400">Cancelar</button>
                <button onClick={async () => { await onSaveSupplier(editingSupplier as Supplier); setEditingSupplier(null); }} className="flex-[2] py-5 bg-red-600 text-white rounded-full font-black uppercase text-[10px] shadow-xl">Salvar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Dashboard ---

const Dashboard: React.FC<{ projects: Project[], onDelete: (id: string) => void }> = ({ projects, onDelete }) => {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
       <div className="flex justify-between items-center mb-16">
          <h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none">Visão <span className="text-red-600">Geral</span></h1>
          <Link to="/project/new" className="bg-gray-950 text-white px-12 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all">+ Nova Cotação</Link>
       </div>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {projects.map(p => (
            <div key={p.id} className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-xl group hover:-translate-y-2 transition-all">
               <div className="flex justify-between items-start mb-8">
                  <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${p.status === ProjectStatus.APPROVED ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{p.status}</span>
                  <button onClick={() => onDelete(p.id)} className="text-gray-200 hover:text-red-600 transition"><i className="fa-solid fa-trash"></i></button>
               </div>
               <h3 className="font-black text-2xl italic tracking-tighter uppercase mb-2 leading-none">{p.cliente || 'Sem Cliente'}</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase mb-8">{p.obra || 'Sem Obra'}</p>
               <div className="bg-gray-900 p-8 rounded-[2.5rem] mb-8">
                  <span className="text-[8px] font-black uppercase text-gray-500 block mb-1">Valor Comercial</span>
                  <span className="font-black text-2xl italic text-white">{formatCurrency(p.financeiro.precoVendaFinal)}</span>
               </div>
               <Link to={`/project/${p.id}`} className="block text-center py-4 bg-gray-50 rounded-2xl text-[9px] font-black uppercase text-gray-950 hover:bg-red-600 hover:text-white transition-all">Abrir Projeto</Link>
            </div>
          ))}
       </div>
    </div>
  );
};

// --- App Principal ---

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proj, prod, k, tsk, exp, sup] = await Promise.all([
        fetchProjects(), fetchProducts(), fetchKits(), fetchTasks(), fetchExpenses(), fetchSuppliers()
      ]);
      setProjects(proj); setProducts(prod); setKits(k.length > 0 ? k : DEFAULT_KITS); setTasks(tsk); setExpenses(exp); setSuppliers(sup);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
      <Logo />
      <div className="mt-8 text-red-600 animate-pulse"><i className="fa-solid fa-bolt-lightning text-4xl"></i></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 font-sans selection:bg-red-100">
      <nav className="fixed left-0 top-0 h-full w-24 hover:w-64 bg-gray-950 border-r border-white/5 transition-all duration-500 group z-[3000] no-print flex flex-col items-center py-10 overflow-hidden">
        <Logo />
        <div className="flex flex-col gap-4 mt-20 w-full px-4">
          <NavTab to="/" label="Projetos" icon="fa-chart-pie" active={location.pathname === '/'} />
          <NavTab to="/finance" label="Financeiro" icon="fa-sack-dollar" active={location.pathname === '/finance'} />
          <NavTab to="/tasks" label="Operação" icon="fa-list-check" active={location.pathname === '/tasks'} />
          <NavTab to="/products" label="Insumos" icon="fa-boxes-stacked" active={location.pathname === '/products'} />
          <NavTab to="/kits" label="Engenharia" icon="fa-gears" active={location.pathname === '/kits'} />
        </div>
      </nav>

      <main className="pl-24 transition-all duration-500 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard projects={projects} onDelete={async (id) => { if (confirm('Excluir projeto?')) { await deleteProject(id); loadData(); } }} />} />
          <Route path="/finance" element={<FinanceManager projects={projects} expenses={expenses} suppliers={suppliers} onSaveExpense={async (e) => { await saveExpense(e); loadData(); }} onDeleteExpense={async (id) => { if (confirm('Excluir despesa?')) { await deleteExpense(id); loadData(); } }} onSaveSupplier={async (s) => { await saveSupplier(s); loadData(); }} />} />
          <Route path="/tasks" element={<TaskManager tasks={tasks} projects={projects} onSave={async (t) => { await saveTask(t); loadData(); }} onDelete={async (id) => { if (confirm('Excluir tarefa?')) { await deleteTask(id); loadData(); } }} />} />
          <Route path="/products" element={<ProductManager products={products} onSave={async (p) => { await saveProduct(p); loadData(); }} onDelete={async (id) => { if (confirm('Excluir produto?')) { await deleteProduct(id); loadData(); } }} />} />
          <Route path="/kits" element={<KitManager kits={kits} products={products} onSave={async (k) => { await saveKit(k); loadData(); }} onDelete={async (id) => { if (confirm('Excluir kit?')) { await deleteKit(id); loadData(); } }} />} />
          <Route path="/project/:id" element={<ProjectEditor projects={projects} products={products} kits={kits} onSave={async (p) => { await saveProject(p); loadData(); }} />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
