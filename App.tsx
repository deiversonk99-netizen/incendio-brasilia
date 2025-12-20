
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

// --- Components ---

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

// --- Print Component ---

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
          <h2 className="font-black uppercase text-xs text-red-600 mb-3 tracking-widest border-b pb-1">Identificação do Cliente</h2>
          <p className="font-bold text-lg">{project.cliente || 'Consumidor Final'}</p>
          <p className="text-gray-600 mt-1">{project.endereco || 'Endereço a definir'}</p>
        </div>
        <div>
          <h2 className="font-black uppercase text-xs text-red-600 mb-3 tracking-widest border-b pb-1">Identificação da Obra</h2>
          <p className="font-bold text-lg">{project.obra || 'Projeto de Incêndio'}</p>
          <p className="text-gray-600 mt-1">Status do Registro: {project.status}</p>
        </div>
      </div>

      {project.pavimentos.length > 0 && (
        <div className="mb-12">
          <h2 className="font-black uppercase text-xs text-red-600 mb-4 tracking-widest border-b pb-1">Detalhamento Técnico</h2>
          <div className="grid grid-cols-1 gap-4">
            {project.pavimentos.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="font-black uppercase text-[10px] text-gray-400">{p.tipo}</span>
                  <p className="font-bold">{p.nome} {p.referenciaPrancha && <span className="text-gray-400 font-normal">({p.referenciaPrancha})</span>}</p>
                  <span className="text-[8px] text-gray-400 font-bold">{p.largura}m x {p.comprimento}m | H: {p.altura}m</span>
                </div>
                <div className="flex gap-6 text-[10px] font-bold uppercase">
                  {p.infraestruturas.map((inf, i) => (
                    <span key={i} className="text-gray-500">{inf.tipo}: <b className="text-gray-900">{inf.metragem}m</b></span>
                  ))}
                  <span>Dispositivos: <b className="text-gray-900">{p.itensCentrais.length} un</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-12">
        <h2 className="font-black uppercase text-xs text-red-600 mb-4 tracking-widest border-b pb-1">Composição de Materiais</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-gray-900 text-[10px] font-black uppercase tracking-widest">
              <th className="py-2">Descrição do Insumo</th>
              <th className="py-2 text-center">Quantidade</th>
              <th className="py-2 text-right">Valor Unit.</th>
              <th className="py-2 text-right">Valor Total</th>
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
              <td colSpan={3} className="py-4 text-right font-black uppercase text-xs">Valor Global Estimado:</td>
              <td className="py-4 text-right font-black text-xl italic text-red-600">{formatCurrency(project.financeiro.precoVendaFinal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-12 text-[10px] leading-relaxed">
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <h3 className="font-black uppercase text-gray-400 mb-2 tracking-widest">Condições Gerais</h3>
          <p><b>Pagamento:</b> {project.condicoesPagamento}</p>
          <p><b>Cronograma:</b> {project.cronograma}</p>
          <p><b>Validade:</b> {project.validadeDias} dias</p>
        </div>
        <div className="p-6 flex flex-col justify-end text-center border-t-2 border-gray-100 mt-auto pt-10">
          <div className="w-48 h-0.5 bg-gray-300 mx-auto mb-2"></div>
          <p className="font-black uppercase text-gray-400 tracking-widest">Brasília Engenharia</p>
        </div>
      </div>
    </div>
  );
};

// --- Financial Module ---

const FinanceManager: React.FC<{ 
  projects: Project[], 
  expenses: Expense[], 
  suppliers: Supplier[],
  onSaveExpense: (e: Expense) => Promise<void>,
  onDeleteExpense: (id: string) => Promise<void>,
  onSaveSupplier: (s: Supplier) => Promise<void>
}> = ({ projects, expenses, suppliers, onSaveExpense, onDeleteExpense, onSaveSupplier }) => {
  const [activeTab, setActiveTab] = useState<'dash' | 'expenses' | 'suppliers'>('dash');
  const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

  const stats = useMemo(() => {
    const revenue = projects
      .filter(p => p.status === ProjectStatus.APPROVED)
      .reduce((acc, p) => acc + (p.financeiro?.precoVendaFinal || 0), 0);
    
    const paidExpenses = expenses
      .filter(e => e.status === ExpenseStatus.PAID)
      .reduce((acc, e) => acc + e.valor, 0);

    const pendingExpenses = expenses
      .filter(e => e.status !== ExpenseStatus.PAID)
      .reduce((acc, e) => acc + e.valor, 0);

    return {
      revenue,
      totalExpenses: paidExpenses + pendingExpenses,
      paidExpenses,
      pendingExpenses,
      balance: revenue - (paidExpenses + pendingExpenses)
    };
  }, [projects, expenses]);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-16">
        <div>
          <h1 className="text-6xl font-black text-gray-950 tracking-tighter italic uppercase leading-none">
            Gestão <span className="text-red-600">Financeira</span>
          </h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5em] mt-4 flex items-center gap-3">
             <i className="fa-solid fa-sack-dollar text-red-600"></i> Fluxo de Caixa Integrado
          </p>
        </div>
        <div className="flex gap-2 bg-gray-100 p-2 rounded-[2rem]">
          <button onClick={() => setActiveTab('dash')} className={`px-8 py-3 rounded-full font-black uppercase text-[9px] tracking-widest transition-all ${activeTab === 'dash' ? 'bg-white shadow-lg text-red-600' : 'text-gray-400'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('expenses')} className={`px-8 py-3 rounded-full font-black uppercase text-[9px] tracking-widest transition-all ${activeTab === 'expenses' ? 'bg-white shadow-lg text-red-600' : 'text-gray-400'}`}>Despesas</button>
          <button onClick={() => setActiveTab('suppliers')} className={`px-8 py-3 rounded-full font-black uppercase text-[9px] tracking-widest transition-all ${activeTab === 'suppliers' ? 'bg-white shadow-lg text-red-600' : 'text-gray-400'}`}>Fornecedores</button>
        </div>
      </div>

      {activeTab === 'dash' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-950 p-12 rounded-[4rem] text-white">
              <span className="text-[9px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Receita (Aprovados)</span>
              <span className="text-4xl font-black italic tracking-tighter text-green-500">{formatCurrency(stats.revenue)}</span>
            </div>
            <div className="bg-gray-950 p-12 rounded-[4rem] text-white">
              <span className="text-[9px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Saídas Globais</span>
              <span className="text-4xl font-black italic tracking-tighter text-red-500">{formatCurrency(stats.totalExpenses)}</span>
            </div>
            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl">
              <span className="text-[9px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Saldo Atual</span>
              <span className={`text-4xl font-black italic tracking-tighter ${stats.balance >= 0 ? 'text-gray-950' : 'text-red-600'}`}>
                {formatCurrency(stats.balance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-8">
           <div className="flex justify-between items-center mb-10">
             <h2 className="text-[14px] font-black uppercase text-gray-950 tracking-[0.6em] italic">Despesas Operacionais</h2>
             <button 
              onClick={() => setEditingExpense({ descricao: '', valor: 0, status: ExpenseStatus.PENDING, categoria: ExpenseCategory.MATERIAL, dataVencimento: new Date().toISOString().split('T')[0] })}
              className="bg-gray-950 text-white px-8 py-3 rounded-full font-black uppercase text-[9px] tracking-widest hover:bg-red-600 transition shadow-xl"
             >
               + Adicionar Saída
             </button>
           </div>
           <div className="grid grid-cols-1 gap-4">
              {expenses.map(e => (
                <div key={e.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between group">
                   <div>
                      <h4 className="font-black uppercase italic text-gray-950">{e.descricao}</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{e.categoria} | Venc: {new Date(e.dataVencimento).toLocaleDateString('pt-BR')}</p>
                   </div>
                   <div className="flex items-center gap-6">
                      <span className="font-black text-lg italic">{formatCurrency(e.valor)}</span>
                      <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${e.status === ExpenseStatus.PAID ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>{e.status}</div>
                      <button onClick={() => setEditingExpense(e)} className="text-gray-300 hover:text-gray-950"><i className="fa-solid fa-pen"></i></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {editingExpense && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 rounded-[3rem] w-full max-w-lg animate-fadeIn">
             <h2 className="text-3xl font-black uppercase italic mb-8 border-b pb-4">Editar <span className="text-red-600">Lançamento</span></h2>
             <div className="space-y-4">
                <input value={editingExpense.descricao} onChange={e => setEditingExpense({...editingExpense, descricao: e.target.value})} placeholder="Descrição" className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-red-600" />
                <input type="number" value={editingExpense.valor} onChange={e => setEditingExpense({...editingExpense, valor: parseFloat(e.target.value)})} placeholder="Valor" className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-red-600" />
                <input type="date" value={editingExpense.dataVencimento?.split('T')[0]} onChange={e => setEditingExpense({...editingExpense, dataVencimento: e.target.value})} className="w-full bg-gray-50 p-4 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-red-600" />
                <select value={editingExpense.status} onChange={e => setEditingExpense({...editingExpense, status: e.target.value as any})} className="w-full bg-gray-50 p-4 rounded-xl font-black uppercase text-xs border-none outline-none focus:ring-2 focus:ring-red-600">
                   {Object.values(ExpenseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
             <div className="flex gap-4 mt-8">
                <button onClick={() => setEditingExpense(null)} className="flex-1 py-4 bg-gray-100 rounded-full font-black uppercase text-xs hover:bg-gray-200 transition">Cancelar</button>
                <button onClick={async () => { await onSaveExpense(editingExpense as Expense); setEditingExpense(null); }} className="flex-[2] py-4 bg-red-600 text-white rounded-full font-black uppercase text-xs shadow-lg hover:bg-red-700 transition">Salvar Lançamento</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Project Editor ---

const ProjectEditor: React.FC<{ 
  projects: Project[], 
  products: Product[], 
  kits: Kit[], 
  customers: Customer[], 
  onSave: (p: Project) => Promise<void>, 
  onSaveCustomer: (c: Customer) => Promise<any> 
}> = ({ projects, products, kits, customers, onSave, onSaveCustomer }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'proposal'>('editor');
  const [methodology, setMethodology] = useState<'technical' | 'direct'>('technical');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('view') === 'proposal') setViewMode('proposal');
  }, [location]);

  useEffect(() => {
    if (id === 'new') {
      setProject({
        id: Math.random().toString(36).substr(2, 9),
        cliente: '',
        obra: '',
        endereco: '',
        status: ProjectStatus.DRAFT,
        pavimentos: [],
        condicoesPagamento: 'Faturado 30 dias',
        cronograma: '15 dias úteis',
        observacoes: '',
        validadeDias: 30,
        orcamentoItens: [],
        financeiro: { custoMateriais: 0, bdiPercentual: 25, bdiValor: 0, margemLucroPercentual: 15, margemLucroValor: 0, descontoPercentual: 0, descontoValor: 0, precoVendaFinal: 0 },
        dataCriacao: new Date().toISOString()
      });
    } else {
      const found = projects.find(p => p.id === id);
      if (found) {
        const p = JSON.parse(JSON.stringify(found));
        setProject(p);
        if (p.pavimentos.length === 0 && p.orcamentoItens.length > 0) setMethodology('direct');
      }
    }
  }, [id, projects]);

  if (!project) return null;

  const handleCalculate = () => {
    const { items, financial } = calculateComposition(project, products, kits);
    setProject({ ...project, orcamentoItens: items, financeiro: financial, status: ProjectStatus.CALCULATED });
    alert('Cálculo realizado com sucesso!');
  };

  const handleUpdateBudgetManual = (itemId: string, field: 'qtdFinal' | 'custoUnitario', value: number) => {
    if (!project) return;
    const newItems = project.orcamentoItens.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        updated.custoTotal = updated.qtdFinal * updated.custoUnitario;
        return updated;
      }
      return item;
    });

    const materialCost = newItems.reduce((acc, it) => acc + it.custoTotal, 0);
    const newFinancial = updateFinancialTotals({
      ...project.financeiro,
      custoMateriais: materialCost
    });

    setProject({ ...project, orcamentoItens: newItems, financeiro: newFinancial });
  };

  const handleAddBudgetManual = () => {
    if (!project) return;
    const prod = products[0];
    const newItem: BudgetItem = {
      id: Math.random().toString(36).substr(2, 9),
      produtoNome: prod?.nome || 'Novo Item',
      origem: 'manual',
      qtdSistema: 1,
      qtdFinal: 1,
      custoUnitario: prod?.preco || 0,
      custoTotal: prod?.preco || 0
    };
    const newItems = [...project.orcamentoItens, newItem];
    const materialCost = newItems.reduce((acc, it) => acc + it.custoTotal, 0);
    const newFinancial = updateFinancialTotals({
      ...project.financeiro,
      custoMateriais: materialCost
    });
    setProject({ ...project, orcamentoItens: newItems, financeiro: newFinancial });
  };

  const handleAddFloor = () => {
    const newFloor: Floor = { id: Math.random().toString(36).substr(2, 9), nome: `Pavimento ${project.pavimentos.length + 1}`, tipo: FloorType.TIPO, referenciaPrancha: '', largura: 0, comprimento: 0, altura: 3, itensCentrais: [], infraestruturas: [] };
    setProject({ ...project, pavimentos: [...project.pavimentos, newFloor] });
  };

  const handleGeneratePDF = async () => {
    if (!project) return;
    setIsGenerating(true);
    const fileName = `PROPOSTA_${project.cliente || 'CLIENTE'}_${project.obra || 'OBRA'}`.replace(/\s+/g, '_').toUpperCase() + '.pdf';
    const element = document.getElementById('proposal-capture');
    const opt = { margin: 0, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    try {
      const updatedProject = { ...project, status: ProjectStatus.SENT, propostaUrl: `/proposal/${project.id}` };
      setProject(updatedProject);
      await onSave(updatedProject);
      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (error) { console.error(error); } finally { setIsGenerating(false); }
  };

  if (viewMode === 'proposal') {
    return (
      <>
        <div className="fixed -left-[9999px] top-0 pointer-events-none">
          <ProposalDocument project={project} isPreview={true} id="proposal-capture" />
        </div>
        <div className="no-print animate-fadeIn p-8 flex flex-col items-center gap-12 bg-gray-50 min-h-screen">
          <div className="w-full max-w-4xl flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <button onClick={() => setViewMode('editor')} className="flex items-center gap-3 font-black uppercase text-[10px] text-gray-400 hover:text-gray-950 transition-all">
              <i className="fa-solid fa-chevron-left"></i> Voltar ao Editor
            </button>
            <button onClick={handleGeneratePDF} disabled={isGenerating} className="bg-red-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] shadow-2xl transition-all flex items-center gap-3">
              {isGenerating ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-download"></i>}
              {isGenerating ? 'PREPARANDO...' : 'BAIXAR / IMPRIMIR PDF'}
            </button>
          </div>
          <div className="bg-gray-200 p-8 rounded-[3rem] shadow-inner overflow-auto w-full flex justify-center border-4 border-gray-300">
              <ProposalDocument project={project} isPreview={true} />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 animate-fadeIn no-print">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Editor <span className="text-red-600">Técnico</span></h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">DADOS DE ENGENHARIA DO PROJETO</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => setViewMode('proposal')} className="bg-white border px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] shadow-sm hover:border-red-600 transition">Visualizar Proposta</button>
          <button onClick={async () => { await onSave(project); navigate('/'); }} className="bg-gray-950 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] shadow-xl hover:bg-red-600 transition">Salvar Tudo</button>
        </div>
      </div>

      <div className="flex bg-gray-200 p-2 rounded-[2.5rem] w-fit shadow-inner">
        <button onClick={() => setMethodology('technical')} className={`px-10 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all ${methodology === 'technical' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400'}`}>1. Metodologia Técnica</button>
        <button onClick={() => setMethodology('direct')} className={`px-10 py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all ${methodology === 'direct' ? 'bg-white text-red-600 shadow-lg' : 'text-gray-400'}`}>2. Orçamento Direto</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-gray-100">
             <h3 className="font-black uppercase italic text-gray-400 text-[10px] mb-8 border-b pb-4 tracking-widest">Informações do Contrato</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="block col-span-2">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nome do Cliente</span>
                  <input value={project.cliente} onChange={e => setProject({...project, cliente: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Obra / Empreendimento</span>
                  <input value={project.obra} onChange={e => setProject({...project, obra: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Endereço Completo</span>
                  <input value={project.endereco} onChange={e => setProject({...project, endereco: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all" />
                </label>
             </div>
          </div>

          <div className="bg-white p-10 rounded-[4rem] shadow-xl border border-gray-100">
             <h3 className="font-black uppercase italic text-gray-400 text-[10px] mb-8 border-b pb-4 tracking-widest">Prazos e Condições</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Forma de Pagamento</span>
                  <input value={project.condicoesPagamento} onChange={e => setProject({...project, condicoesPagamento: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Prazo de Execução</span>
                  <input value={project.cronograma} onChange={e => setProject({...project, cronograma: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Validade Proposta (Dias)</span>
                  <input type="number" value={project.validadeDias} onChange={e => setProject({...project, validadeDias: parseInt(e.target.value) || 0})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all" />
                </label>
                <label className="block col-span-3">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Notas Adicionais</span>
                  <textarea value={project.observacoes} onChange={e => setProject({...project, observacoes: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all h-24" />
                </label>
             </div>
          </div>
        </div>

        <div className="bg-gray-950 p-10 rounded-[4rem] shadow-2xl text-white h-fit sticky top-8">
           <h3 className="font-black uppercase italic text-red-600 text-[10px] mb-8 border-b border-white/10 pb-4 tracking-widest">Resultados Finais</h3>
           <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-gray-400">Total Materiais</span>
                <span className="font-black text-2xl italic">{formatCurrency(project.financeiro.custoMateriais)}</span>
              </div>
              <div className="flex justify-between items-end border-t border-white/10 pt-4">
                <span className="text-[10px] font-black uppercase text-red-500">Valor Final</span>
                <span className="font-black text-4xl italic text-white">{formatCurrency(project.financeiro.precoVendaFinal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-8">
                 <label>
                   <span className="text-[8px] font-black uppercase text-gray-500">BDI (%)</span>
                   <input type="number" value={project.financeiro.bdiPercentual} onChange={e => setProject({...project, financeiro: updateFinancialTotals({...project.financeiro, bdiPercentual: parseFloat(e.target.value) || 0})})} className="w-full bg-white/5 p-4 rounded-xl border border-white/10 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-red-600" />
                 </label>
                 <label>
                   <span className="text-[8px] font-black uppercase text-gray-500">Margem (%)</span>
                   <input type="number" value={project.financeiro.margemLucroPercentual} onChange={e => setProject({...project, financeiro: updateFinancialTotals({...project.financeiro, margemLucroPercentual: parseFloat(e.target.value) || 0})})} className="w-full bg-white/5 p-4 rounded-xl border border-white/10 text-white font-bold text-sm outline-none focus:ring-1 focus:ring-red-600" />
                 </label>
              </div>
           </div>
        </div>
      </div>

      {methodology === 'technical' && (
        <div className="space-y-10 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-6">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Cálculo de <span className="text-red-600">Engenharia</span></h2>
            <div className="flex gap-4">
               <button onClick={handleAddFloor} className="bg-gray-950 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition shadow-xl">+ Novo Pavimento</button>
               <button onClick={handleCalculate} className="bg-red-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] shadow-xl hover:scale-105 transition">Processar Cálculo</button>
            </div>
          </div>

          {project.pavimentos.map((floor, fIdx) => (
            <div key={floor.id} className="bg-white p-12 rounded-[5rem] shadow-xl border border-gray-100">
               <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 border-b pb-8 gap-10">
                  <div className="flex flex-wrap gap-8 items-start flex-1 w-full">
                     <div className="flex flex-col flex-1 min-w-[200px]">
                        <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Nome / Identificação</span>
                        <input value={floor.nome} onChange={e => {
                          const n = [...project.pavimentos]; n[fIdx].nome = e.target.value; setProject({...project, pavimentos: n});
                        }} className="font-black uppercase italic text-3xl bg-transparent border-none outline-none tracking-tighter text-gray-950 focus:text-red-600 transition-colors w-full" />
                     </div>
                  </div>
                  <button onClick={() => confirm(`Excluir ${floor.nome}?`) && setProject({...project, pavimentos: project.pavimentos.filter((_, idx) => idx !== fIdx)})} className="text-red-200 hover:text-red-600 transition-all p-4"><i className="fa-solid fa-trash-can text-2xl"></i></button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div>
                     <h4 className="text-[10px] font-black uppercase text-red-600 mb-8 tracking-[0.4em] flex items-center gap-2">
                       <i className="fa-solid fa-ruler-horizontal"></i> Metragem de Infra (m)
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {kits.map(k => (
                          <div key={k.id} className="bg-gray-50 p-6 rounded-[2.5rem] flex flex-col gap-3 group hover:bg-white border border-transparent hover:border-gray-200 transition-all shadow-sm">
                             <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{k.nomeKit}</span>
                             <input 
                                type="number" 
                                value={floor.infraestruturas.find(i => i.tipo === k.tipoInfra)?.metragem || 0}
                                onChange={e => {
                                   const n = [...project.pavimentos];
                                   const idx = n[fIdx].infraestruturas.findIndex(i => i.tipo === k.tipoInfra);
                                   const val = parseFloat(e.target.value) || 0;
                                   if (idx >= 0) n[fIdx].infraestruturas[idx].metragem = val;
                                   else n[fIdx].infraestruturas.push({ tipo: k.tipoInfra, metragem: val });
                                   setProject({...project, pavimentos: n});
                                }}
                                className="w-full bg-white p-4 rounded-2xl font-black text-2xl italic text-gray-950 border-none outline-none shadow-sm text-center focus:ring-2 focus:ring-red-600 transition-all"
                             />
                          </div>
                        ))}
                     </div>
                  </div>

                  <div className="max-w-full overflow-hidden">
                     <div className="flex justify-between items-center mb-8 px-2">
                        <h4 className="text-[10px] font-black uppercase text-gray-950 tracking-[0.4em] flex items-center gap-2">
                          <i className="fa-solid fa-microchip"></i> Itens Manuais / Centrais
                        </h4>
                        <button onClick={() => {
                           const n = [...project.pavimentos];
                           n[fIdx].itensCentrais.push({ id: Math.random().toString(), produtoNome: products[0]?.nome || '', quantidade: 1 });
                           setProject({...project, pavimentos: n});
                        }} className="text-[9px] font-black uppercase text-red-600 hover:underline tracking-widest transition-all">
                          + Novo Item
                        </button>
                     </div>
                     <div className="space-y-4 px-2">
                        {floor.itensCentrais.map((item, iIdx) => (
                          <div key={iIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-gray-50 p-5 rounded-[2.5rem] border border-transparent hover:border-gray-200 transition-all w-full overflow-hidden">
                             <select value={item.produtoNome} onChange={e => {
                                const n = [...project.pavimentos]; n[fIdx].itensCentrais[iIdx].produtoNome = e.target.value; setProject({...project, pavimentos: n});
                             }} className="flex-1 min-w-0 bg-transparent border-none outline-none text-[11px] font-black uppercase text-gray-950 focus:text-red-600 transition-colors truncate">
                                {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                             </select>
                             <div className="flex items-center justify-between sm:justify-start gap-4 bg-white px-5 py-3 rounded-2xl shadow-sm shrink-0 border border-gray-100">
                               <span className="text-[8px] font-black uppercase text-gray-400">Quantidade</span>
                               <input type="number" value={item.quantidade} onChange={e => {
                                  const n = [...project.pavimentos]; n[fIdx].itensCentrais[iIdx].quantidade = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n});
                               }} className="w-16 bg-transparent text-center font-black text-lg italic border-none outline-none focus:ring-0" />
                             </div>
                             <button onClick={() => {
                                const n = [...project.pavimentos]; n[fIdx].itensCentrais = n[fIdx].itensCentrais.filter((_, idx) => idx !== iIdx); setProject({...project, pavimentos: n});
                             }} className="text-gray-200 hover:text-red-600 transition-all p-2 shrink-0 self-end sm:self-auto"><i className="fa-solid fa-trash-can text-xl"></i></button>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {(methodology === 'direct' || project.orcamentoItens.length > 0) && (
        <div className="bg-white p-12 rounded-[5rem] shadow-2xl border border-gray-100 mt-16 animate-fadeIn">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b pb-6 gap-6">
             <div>
               <h3 className="text-3xl font-black uppercase italic tracking-tighter text-gray-950">Composição do <span className="text-red-600">Orçamento Final</span></h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ajuste os itens diretamente para a proposta</p>
             </div>
             <button onClick={handleAddBudgetManual} className="bg-gray-950 text-white px-10 py-4 rounded-full font-black uppercase text-[10px] hover:bg-red-600 transition shadow-xl tracking-widest">+ Adicionar Item Direto</button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                 <thead>
                    <tr className="text-[10px] font-black uppercase text-gray-400 border-b pb-6 tracking-widest">
                       <th className="pb-6">Descrição</th>
                       <th className="pb-6 text-center">Origem</th>
                       <th className="pb-6 text-center">Quantidade</th>
                       <th className="pb-6 text-right">Unitário</th>
                       <th className="pb-6 text-right">Total</th>
                       <th className="pb-6 w-10"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {project.orcamentoItens.map(item => (
                       <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                          <td className="py-6 font-black uppercase text-xs text-gray-950 min-w-[200px]">
                            <select 
                              value={item.produtoNome} 
                              onChange={(e) => {
                                const prod = products.find(p => p.nome === e.target.value);
                                const newItems = project.orcamentoItens.map(it => it.id === item.id ? { ...it, produtoNome: e.target.value, custoUnitario: prod?.preco || 0, custoTotal: it.qtdFinal * (prod?.preco || 0) } : it);
                                const cost = newItems.reduce((a, b) => a + b.custoTotal, 0);
                                setProject({ ...project, orcamentoItens: newItems, financeiro: updateFinancialTotals({ ...project.financeiro, custoMateriais: cost }) });
                              }}
                              className="bg-transparent border-none outline-none font-black text-xs uppercase focus:text-red-600 transition-colors w-full"
                            >
                              {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                            </select>
                          </td>
                          <td className="py-6 text-center">
                             <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${item.origem === 'calculado' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                {item.origem}
                             </span>
                          </td>
                          <td className="py-6 text-center">
                            <input type="number" value={item.qtdFinal} onChange={(e) => handleUpdateBudgetManual(item.id, 'qtdFinal', parseFloat(e.target.value) || 0)} className="w-24 bg-gray-50 p-2 rounded-lg text-center font-black border-none outline-none focus:ring-2 focus:ring-red-600" />
                          </td>
                          <td className="py-6 text-right">
                            <input type="number" step="0.01" value={item.custoUnitario} onChange={(e) => handleUpdateBudgetManual(item.id, 'custoUnitario', parseFloat(e.target.value) || 0)} className="w-32 bg-gray-50 p-2 rounded-lg text-right font-bold border-none outline-none focus:ring-2 focus:ring-red-600" />
                          </td>
                          <td className="py-6 text-right font-black text-gray-950 italic">{formatCurrency(item.custoTotal)}</td>
                          <td className="py-6 text-right">
                            <button onClick={() => confirm('Remover?') && setProject({ ...project, orcamentoItens: project.orcamentoItens.filter(it => it.id !== item.id), financeiro: updateFinancialTotals({ ...project.financeiro, custoMateriais: project.orcamentoItens.filter(it => it.id !== item.id).reduce((a, b) => a + b.custoTotal, 0) }) })} className="text-gray-200 hover:text-red-600 transition-all p-2">
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
                 <tfoot>
                    <tr>
                       <td colSpan={4} className="py-10 text-right font-black uppercase text-xs text-gray-400 tracking-widest">Soma Total de Materiais:</td>
                       <td className="py-10 text-right font-black text-3xl italic text-gray-950 tracking-tighter">{formatCurrency(project.financeiro.custoMateriais)}</td>
                    </tr>
                 </tfoot>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

// --- Operations Manager (Kanban) ---

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

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case TaskPriority.HIGH: return 'text-red-600 bg-red-50';
      case TaskPriority.MEDIUM: return 'text-orange-500 bg-orange-50';
      default: return 'text-gray-400 bg-gray-50';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-16">
        <div>
          <h1 className="text-6xl font-black italic uppercase leading-none tracking-tighter">
            Fluxo <span className="text-red-600">Operacional</span>
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mt-4">Gestão de Instalações e Manutenções</p>
        </div>
        <button 
          onClick={() => setEditing({ 
            titulo: '', 
            descricao: '', 
            status: TaskStatus.TODO, 
            prioridade: TaskPriority.MEDIUM, 
            dataVencimento: new Date().toISOString().split('T')[0],
            projetoId: '',
            checklist: [],
            tags: []
          })}
          className="bg-gray-950 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-red-600 transition-all"
        >
          + Nova Tarefa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE].map(status => (
          <div key={status} className="bg-gray-100/40 p-6 rounded-[3rem] min-h-[600px] border border-gray-200/50 flex flex-col">
            <div className="flex justify-between items-center mb-10 px-6">
               <h3 className="font-black uppercase italic text-gray-950 text-xs tracking-[0.4em]">{status}</h3>
               <span className="bg-gray-950 text-white text-[9px] font-black px-3 py-1 rounded-full">{tasks.filter(t => t.status === status).length}</span>
            </div>
            
            <div className="space-y-6 flex-1">
              {tasks.filter(t => t.status === status).map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-red-100 group">
                   <div className="flex justify-between items-start mb-4">
                     <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${getPriorityColor(t.prioridade)}`}>{t.prioridade}</span>
                     <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(t)} className="text-gray-300 hover:text-gray-950"><i className="fa-solid fa-pen text-xs"></i></button>
                        <button onClick={() => confirm('Excluir tarefa?') && onDelete(t.id)} className="text-gray-300 hover:text-red-600"><i className="fa-solid fa-trash text-xs"></i></button>
                     </div>
                   </div>
                   
                   <h4 className="font-black text-lg italic uppercase tracking-tighter leading-tight text-gray-950 mb-2">{t.titulo}</h4>
                   {t.projetoId && (
                     <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <i className="fa-solid fa-location-dot"></i> {projects.find(p => p.id === t.projetoId)?.obra || 'Projeto Vinculado'}
                     </p>
                   )}
                   <p className="text-[10px] text-gray-500 line-clamp-2 mb-6 font-medium">{t.descricao}</p>
                   
                   <div className="flex justify-between items-center border-t border-gray-50 pt-6">
                      <div className="flex flex-col">
                         <span className="text-[7px] font-black text-gray-300 uppercase">Vencimento</span>
                         <span className="text-[10px] font-bold text-gray-950">{new Date(t.dataVencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
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
                   </div>
                </div>
              ))}
              {tasks.filter(t => t.status === status).length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-[3rem] opacity-30">
                   <i className="fa-solid fa-clipboard-list text-3xl mb-4"></i>
                   <span className="text-[10px] font-black uppercase tracking-widest">Sem Tarefas</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 md:p-16 rounded-[4rem] w-full max-w-2xl animate-fadeIn shadow-2xl max-h-[95vh] overflow-y-auto">
             <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b pb-8">Gerenciar <span className="text-red-600">Tarefa</span></h2>
             
             <div className="space-y-8">
                <div>
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Título da Atividade</span>
                   <input 
                      value={editing.titulo} 
                      onChange={e => setEditing({...editing, titulo: e.target.value})} 
                      className="w-full bg-gray-50 p-6 rounded-[2rem] font-black uppercase italic text-lg border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" 
                      placeholder="Ex: Instalação de detectores pavimento 2"
                   />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Prioridade</span>
                      <select 
                        value={editing.prioridade} 
                        onChange={e => setEditing({...editing, prioridade: e.target.value as any})}
                        className="w-full bg-gray-50 p-5 rounded-[2rem] font-black uppercase text-xs border-none outline-none mt-2 focus:ring-2 focus:ring-red-600"
                      >
                         {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                   </div>
                   <div>
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Data de Vencimento</span>
                      <input 
                        type="date" 
                        value={editing.dataVencimento} 
                        onChange={e => setEditing({...editing, dataVencimento: e.target.value})}
                        className="w-full bg-gray-50 p-5 rounded-[2rem] font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600"
                      />
                   </div>
                </div>

                <div>
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Vincular a Projeto / Obra</span>
                   <select 
                     value={editing.projetoId} 
                     onChange={e => {
                       const proj = projects.find(p => p.id === e.target.value);
                       setEditing({...editing, projetoId: e.target.value, projetoNome: proj?.obra || ''});
                     }}
                     className="w-full bg-gray-50 p-5 rounded-[2rem] font-black uppercase text-xs border-none outline-none mt-2 focus:ring-2 focus:ring-red-600"
                   >
                      <option value="">Nenhum Projeto Específico</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.obra || p.cliente}</option>)}
                   </select>
                </div>

                <div>
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Detalhamento Técnico</span>
                   <textarea 
                      value={editing.descricao} 
                      onChange={e => setEditing({...editing, descricao: e.target.value})} 
                      className="w-full bg-gray-50 p-6 rounded-[2rem] font-medium border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 h-32"
                      placeholder="Descreva o que precisa ser feito..."
                   />
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-6 mt-16">
                <button onClick={() => setEditing(null)} className="flex-1 py-6 bg-gray-100 rounded-[3rem] font-black uppercase text-[10px] text-gray-400 hover:bg-gray-200 transition">Cancelar</button>
                <button 
                   onClick={async () => { await onSave(editing as Task); setEditing(null); }} 
                   className="flex-[2] py-6 bg-red-600 text-white rounded-[3rem] font-black uppercase text-[10px] shadow-xl hover:bg-red-700 transition"
                >
                   Salvar Atividade
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Engineering Kits Manager ---

const KitManager: React.FC<{ 
  kits: Kit[], 
  products: Product[], 
  onSave: (k: Kit) => Promise<void>,
  onDelete: (id: string) => Promise<void>
}> = ({ kits, products, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Kit | null>(null);

  const handleOpenNew = () => {
    setEditing({
      id: Math.random().toString(36).substr(2, 9),
      nomeKit: '',
      tipoInfra: 'novo',
      percentualPerda: 10,
      ativo: true,
      componentes: []
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter leading-none">Padrões <span className="text-red-600">Engenharia</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5em] mt-2">Configuração de Fórmulas de Infraestrutura</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-gray-950 text-white px-12 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all"
        >
          + Novo Padrão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {kits.map(k => (
          <div key={k.id} className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 group relative">
             <div className="flex justify-between items-start mb-8">
               <span className="bg-red-50 text-red-600 text-[8px] font-black uppercase px-2 py-1 rounded tracking-widest">{k.tipoInfra}</span>
               <div className="flex gap-2">
                 <button onClick={() => setEditing(JSON.parse(JSON.stringify(k)))} className="text-gray-300 hover:text-gray-950 transition"><i className="fa-solid fa-pen-to-square text-xl"></i></button>
                 <button onClick={() => confirm(`Excluir ${k.nomeKit}?`) && onDelete(k.id)} className="text-gray-300 hover:text-red-600 transition"><i className="fa-solid fa-trash text-xl"></i></button>
               </div>
             </div>
             <h3 className="font-black uppercase italic text-3xl tracking-tighter mb-4 text-gray-950">{k.nomeKit}</h3>
             <p className="text-[10px] font-bold text-gray-400 uppercase mb-8 border-b pb-4">Margem de Perda: <b className="text-gray-950">{k.percentualPerda}%</b></p>
             
             <div className="space-y-3">
               <span className="text-[8px] font-black uppercase text-gray-400 tracking-[0.3em] block mb-2">Composição Técnica:</span>
               {k.componentes.map((c, idx) => (
                 <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                    <span className="truncate flex-1 pr-4">{c.produtoNome}</span>
                    <span className="bg-gray-50 px-2 py-1 rounded text-gray-950">Fator: {c.fatorConversao}</span>
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-12 md:p-16 rounded-[4rem] w-full max-w-2xl animate-fadeIn shadow-2xl max-h-[90vh] overflow-y-auto">
             <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b pb-8">Configurar <span className="text-red-600">Composição</span></h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nome do Kit</span>
                  <input value={editing.nomeKit} onChange={e => setEditing({...editing, nomeKit: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" placeholder="Ex: Infra Tubulação 3/4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Slug Infra (ID Técnico)</span>
                  <input value={editing.tipoInfra} onChange={e => setEditing({...editing, tipoInfra: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" placeholder="Ex: alarme_galvanizado" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Margem de Perda (%)</span>
                  <input type="number" value={editing.percentualPerda} onChange={e => setEditing({...editing, percentualPerda: parseFloat(e.target.value) || 0})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" />
                </div>
             </div>

             <div className="border-t pt-10">
                <div className="flex justify-between items-center mb-8">
                   <h4 className="text-[11px] font-black uppercase text-gray-950 tracking-[0.4em] flex items-center gap-2">
                     <i className="fa-solid fa-list-ol text-red-600"></i> Lista de Insumos (Por Metro)
                   </h4>
                   <button 
                     onClick={() => setEditing({...editing, componentes: [...editing.componentes, { produtoNome: products[0]?.nome || '', fatorConversao: 1, unidade: 'UN' }]})}
                     className="text-[10px] font-black uppercase text-red-600 hover:underline tracking-widest"
                   >
                     + Adicionar Componente
                   </button>
                </div>

                <div className="space-y-4">
                   {editing.componentes.map((c, i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-gray-50 p-6 rounded-[2.5rem] border border-transparent hover:border-gray-200 transition-all">
                         <select 
                            value={c.produtoNome} 
                            onChange={e => { const n = [...editing.componentes]; n[i].produtoNome = e.target.value; setEditing({...editing, componentes: n}); }} 
                            className="flex-1 bg-transparent border-none outline-none font-black text-[11px] uppercase focus:text-red-600 transition-colors"
                          >
                            {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                         </select>
                         <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-sm">
                           <span className="text-[8px] font-black uppercase text-gray-400">FATOR</span>
                           <input 
                              type="number" 
                              step="0.01" 
                              value={c.fatorConversao} 
                              onChange={e => { const n = [...editing.componentes]; n[i].fatorConversao = parseFloat(e.target.value) || 0; setEditing({...editing, componentes: n}); }} 
                              className="w-16 bg-transparent text-center font-black text-lg italic border-none outline-none focus:ring-0" 
                           />
                         </div>
                         <button onClick={() => { const n = editing.componentes.filter((_, idx) => idx !== i); setEditing({...editing, componentes: n}); }} className="text-gray-200 hover:text-red-600 transition px-2"><i className="fa-solid fa-xmark text-xl"></i></button>
                      </div>
                   ))}
                </div>
             </div>

             <div className="flex flex-col sm:flex-row gap-6 mt-16">
               <button onClick={() => setEditing(null)} className="flex-1 py-6 bg-gray-100 rounded-[2.5rem] font-black uppercase text-[10px] text-gray-400 hover:bg-gray-200 transition">Descartar</button>
               <button onClick={async () => { await onSave(editing!); setEditing(null); }} className="flex-[2] py-6 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-[10px] shadow-xl hover:bg-red-700 transition">Salvar Padrão Técnico</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
          <div className="bg-white p-16 rounded-[4rem] w-full max-w-md shadow-2xl animate-fadeIn">
            <h2 className="text-3xl font-black uppercase italic mb-10 tracking-tighter border-b pb-6">Insumo</h2>
            <div className="space-y-6">
              <input value={editing.nome} onChange={e => setEditing({...editing, nome: e.target.value})} placeholder="Nome" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" />
              <input type="number" value={editing.preco} onChange={e => setEditing({...editing, preco: parseFloat(e.target.value)})} placeholder="Preço" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" />
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setEditing(null)} className="flex-1 py-5 bg-gray-100 rounded-[2rem] font-black uppercase text-[10px]">Cancelar</button>
              <button onClick={async () => { await onSave(editing as Product); setEditing(null); }} className="flex-[2] py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-[10px]">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proj, prod, k, cust, tsk, exp, sup] = await Promise.all([
        fetchProjects(), fetchProducts(), fetchKits(), fetchCustomers(), fetchTasks(), fetchExpenses(), fetchSuppliers()
      ]);
      setProjects(proj); setProducts(prod); setKits(k.length > 0 ? k : DEFAULT_KITS); setCustomers(cust); setTasks(tsk); setExpenses(exp); setSuppliers(sup);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveProject = async (p: Project) => { await saveProject(p); await loadData(); };
  const handleDeleteProject = async (id: string) => { if (confirm('Excluir projeto permanentemente?')) { await deleteProject(id); await loadData(); } };
  const handleSaveTask = async (t: Task) => { await saveTask(t); await loadData(); };
  const handleDeleteTask = async (id: string) => { await deleteTask(id); await loadData(); };
  const handleSaveKit = async (k: Kit) => { await saveKit(k); await loadData(); };
  const handleDeleteKit = async (id: string) => { await deleteKit(id); await loadData(); };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 font-sans selection:bg-red-100 selection:text-red-900 overflow-x-hidden">
      <nav className="bg-gray-950 text-white p-8 no-print shadow-2xl relative z-[1000]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo />
          <div className="flex flex-wrap justify-center gap-4 bg-white/5 p-2 rounded-[2.5rem] border border-white/10">
            <NavTab to="/" label="Projetos" icon="fa-chart-pie" active={location.pathname === '/'} />
            <NavTab to="/finance" label="Financeiro" icon="fa-sack-dollar" active={location.pathname === '/finance'} />
            <NavTab to="/tasks" label="Operação" icon="fa-list-check" active={location.pathname === '/tasks'} />
            <NavTab to="/products" label="Insumos" icon="fa-boxes-stacked" active={location.pathname === '/products'} />
            <NavTab to="/kits" label="Engenharia" icon="fa-gears" active={location.pathname === '/kits'} />
          </div>
        </div>
      </nav>

      <main className="relative">
        {isLoading && <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex items-center justify-center"><i className="fa-solid fa-bolt-lightning animate-pulse text-red-600 text-4xl transform -skew-x-12"></i></div>}
        <Routes>
          <Route path="/" element={<Dashboard projects={projects} onDelete={handleDeleteProject} />} />
          <Route path="/finance" element={<FinanceManager projects={projects} expenses={expenses} suppliers={suppliers} onSaveExpense={async (e) => { await saveExpense(e); loadData(); }} onDeleteExpense={async (id) => { await deleteExpense(id); loadData(); }} onSaveSupplier={async (s) => { await saveSupplier(s); loadData(); }} />} />
          <Route path="/tasks" element={<TaskManager tasks={tasks} projects={projects} onSave={handleSaveTask} onDelete={handleDeleteTask} />} />
          <Route path="/products" element={<ProductManager products={products} onSave={async (p) => { await saveProduct(p); loadData(); }} onDelete={async (id) => { await deleteProduct(id); loadData(); }} />} />
          <Route path="/kits" element={<KitManager kits={kits} products={products} onSave={handleSaveKit} onDelete={handleDeleteKit} />} />
          <Route path="/project/:id" element={<ProjectEditor projects={projects} products={products} kits={kits} customers={customers} onSave={handleSaveProject} onSaveCustomer={async (c) => saveCustomer(c)} />} />
        </Routes>
      </main>
      <footer className="p-12 text-center no-print"><p className="text-[10px] font-black uppercase text-gray-300 tracking-[0.5em]">© 2024 Brasília Engenharia</p></footer>
    </div>
  );
};

const Dashboard: React.FC<{ projects: Project[], onDelete: (id: string) => void }> = ({ projects, onDelete }) => {
  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-16">
          <div>
            <h1 className="text-7xl font-black italic tracking-tighter uppercase leading-none">Visão <span className="text-red-600">Geral</span></h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-4">Gestão de Carteira e Orçamentação</p>
          </div>
          <Link to="/project/new" className="bg-gray-950 text-white px-12 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all">+ Nova Cotação</Link>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {projects.map(p => (
            <div key={p.id} className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-xl group hover:-translate-y-2 transition-all overflow-hidden relative">
               <div className="flex justify-between items-start mb-8 relative z-10">
                  <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${p.status === ProjectStatus.APPROVED ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{p.status}</span>
                  <button onClick={() => onDelete(p.id)} className="text-gray-200 hover:text-red-600 transition"><i className="fa-solid fa-trash"></i></button>
               </div>
               <h3 className="font-black text-2xl italic tracking-tighter uppercase mb-2 leading-none relative z-10">{p.cliente || 'Consumidor Final'}</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase mb-8 relative z-10">{p.obra || 'Obra não identificada'}</p>
               
               <div className="bg-gray-900 p-8 rounded-[2.5rem] relative z-10">
                  <span className="text-[8px] font-black uppercase text-gray-500 block mb-1">Valor Comercial</span>
                  <span className="font-black text-2xl italic text-white">{formatCurrency(p.financeiro.precoVendaFinal)}</span>
               </div>
               
               <div className="flex gap-4 mt-8">
                  <Link to={`/project/${p.id}`} className="flex-1 text-center py-4 bg-gray-50 rounded-2xl text-[9px] font-black uppercase text-gray-950 hover:bg-red-600 hover:text-white transition-all">Ver Detalhes</Link>
                  <Link to={`/project/${p.id}?view=proposal`} className="flex-1 text-center py-4 bg-gray-50 rounded-2xl text-[9px] font-black uppercase text-gray-400 hover:text-red-600 transition-all"><i className="fa-solid fa-file-pdf"></i> PDF</Link>
               </div>
            </div>
          ))}
       </div>
    </div>
  );
};

export default App;
