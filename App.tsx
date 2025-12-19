
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
  KitComponent,
  Task,
  TaskStatus,
  TaskPriority,
  ChecklistItem,
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
import { DEFAULT_KITS, DEFAULT_PROFIT_MARGIN } from './constants';

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
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

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
            <div className="bg-gray-950 p-12 rounded-[4rem] text-white relative overflow-hidden group">
              <span className="text-[9px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Receita (Aprovados)</span>
              <span className="text-4xl font-black italic tracking-tighter text-green-500">{formatCurrency(stats.revenue)}</span>
            </div>
            <div className="bg-gray-950 p-12 rounded-[4rem] text-white relative overflow-hidden group">
              <span className="text-[9px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Saídas Globais</span>
              <span className="text-4xl font-black italic tracking-tighter text-red-500">{formatCurrency(stats.totalExpenses)}</span>
            </div>
            <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl relative overflow-hidden group">
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
           <div className="flex justify-between items-center mb-10 px-6">
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
      if (found) setProject(JSON.parse(JSON.stringify(found)));
    }
  }, [id, projects]);

  if (!project) return null;

  const handleCalculate = () => {
    const { items, financial } = calculateComposition(project, products, kits);
    setProject({ ...project, orcamentoItens: items, financeiro: financial, status: ProjectStatus.CALCULATED });
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
          <button onClick={handleCalculate} className="bg-red-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] shadow-xl hover:scale-105 transition">Calcular Materiais</button>
          <button onClick={async () => { await onSave(project); navigate('/'); }} className="bg-gray-950 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] shadow-xl hover:bg-red-600 transition">Salvar Tudo</button>
        </div>
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
           <h3 className="font-black uppercase italic text-red-600 text-[10px] mb-8 border-b border-white/10 pb-4 tracking-widest">Configuração de Venda</h3>
           <div className="space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase text-gray-400">Total Insumos</span>
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
                 <label className="col-span-2">
                   <span className="text-[8px] font-black uppercase text-gray-500">Estado da Proposta</span>
                   <select value={project.status} onChange={e => setProject({...project, status: e.target.value as ProjectStatus})} className="w-full bg-white/5 p-4 rounded-xl border border-white/10 text-white font-black uppercase text-[10px] outline-none focus:ring-1 focus:ring-red-600 mt-1">
                      {Object.values(ProjectStatus).map(s => <option key={s} value={s} className="bg-gray-900">{s}</option>)}
                   </select>
                 </label>
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-6">
          <h2 className="text-4xl font-black uppercase italic tracking-tighter">Detalhamento dos <span className="text-red-600">Pavimentos</span></h2>
          <button onClick={handleAddFloor} className="bg-gray-950 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition shadow-xl">+ Novo Pavimento</button>
        </div>

        {project.pavimentos.map((floor, fIdx) => (
          <div key={floor.id} className="bg-white p-12 rounded-[5rem] shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 border-b pb-8 gap-10">
                <div className="flex flex-wrap gap-8 items-start flex-1 w-full">
                   <div className="flex flex-col flex-1 min-w-[200px]">
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Nome / Identificação</span>
                      <input value={floor.nome} onChange={e => {
                        const n = [...project.pavimentos]; n[fIdx].nome = e.target.value; setProject({...project, pavimentos: n});
                      }} className="font-black uppercase italic text-3xl bg-transparent border-none outline-none tracking-tighter text-gray-950 focus:text-red-600 transition-colors w-full" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Prancha de Ref.</span>
                      <input value={floor.referenciaPrancha} onChange={e => {
                        const n = [...project.pavimentos]; n[fIdx].referenciaPrancha = e.target.value; setProject({...project, pavimentos: n});
                      }} className="bg-gray-50 px-4 py-2 rounded-xl font-bold text-xs border-none outline-none focus:ring-2 focus:ring-red-600" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-1">Tipo de Área</span>
                      <select value={floor.tipo} onChange={e => {
                         const n = [...project.pavimentos]; n[fIdx].tipo = e.target.value as FloorType; setProject({...project, pavimentos: n});
                      }} className="bg-gray-50 px-4 py-2 rounded-xl font-black text-[10px] uppercase border-none outline-none focus:ring-2 focus:ring-red-600 transition-all">
                         {Object.values(FloorType).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                </div>
                <button onClick={() => confirm(`Excluir ${floor.nome}?`) && setProject({...project, pavimentos: project.pavimentos.filter((_, idx) => idx !== fIdx)})} className="text-red-200 hover:text-red-600 transition-all p-4"><i className="fa-solid fa-trash-can text-2xl"></i></button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16 border-b pb-12">
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Largura (m)</span>
                  <input type="number" step="0.01" value={floor.largura} onChange={e => {
                    const n = [...project.pavimentos]; n[fIdx].largura = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n});
                  }} className="w-full bg-gray-50 p-4 rounded-2xl font-black text-xl italic text-gray-950 border-none outline-none focus:ring-2 focus:ring-red-600" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Comprimento (m)</span>
                  <input type="number" step="0.01" value={floor.comprimento} onChange={e => {
                    const n = [...project.pavimentos]; n[fIdx].comprimento = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n});
                  }} className="w-full bg-gray-50 p-4 rounded-2xl font-black text-xl italic text-gray-950 border-none outline-none focus:ring-2 focus:ring-red-600" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Pé Direito (m)</span>
                  <input type="number" step="0.01" value={floor.altura} onChange={e => {
                    const n = [...project.pavimentos]; n[fIdx].altura = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n});
                  }} className="w-full bg-gray-50 p-4 rounded-2xl font-black text-xl italic text-gray-950 border-none outline-none focus:ring-2 focus:ring-red-600" />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Área Total (m²)</span>
                  <div className="w-full bg-gray-100 p-4 rounded-2xl font-black text-xl italic text-gray-400 border-none select-none">
                    {(floor.largura * floor.comprimento).toFixed(2)}
                  </div>
                </div>
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

                <div>
                   <div className="flex justify-between items-center mb-8">
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
                   <div className="space-y-4">
                      {floor.itensCentrais.map((item, iIdx) => (
                        <div key={iIdx} className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 p-5 rounded-[2rem] border border-transparent hover:border-gray-200 transition-all">
                           <select value={item.produtoNome} onChange={e => {
                              const n = [...project.pavimentos]; n[fIdx].itensCentrais[iIdx].produtoNome = e.target.value; setProject({...project, pavimentos: n});
                           }} className="flex-1 bg-transparent border-none outline-none text-xs font-black uppercase text-gray-950 focus:text-red-600 transition-colors">
                              {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                           </select>
                           <div className="flex items-center gap-3">
                             <input type="number" value={item.quantidade} onChange={e => {
                                const n = [...project.pavimentos]; n[fIdx].itensCentrais[iIdx].quantidade = parseFloat(e.target.value) || 0; setProject({...project, pavimentos: n});
                             }} className="w-20 bg-white p-3 rounded-xl text-center font-black text-lg italic border-none shadow-sm focus:ring-2 focus:ring-red-600 transition-all" />
                           </div>
                           <button onClick={() => {
                              const n = [...project.pavimentos]; n[fIdx].itensCentrais = n[fIdx].itensCentrais.filter((_, idx) => idx !== iIdx); setProject({...project, pavimentos: n});
                           }} className="text-gray-200 hover:text-red-600 transition-all p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      {project.orcamentoItens.length > 0 && (
        <div className="bg-white p-12 rounded-[5rem] shadow-2xl border border-gray-100 mt-16 animate-fadeIn">
           <div className="flex justify-between items-center mb-10 border-b pb-6">
             <h3 className="text-3xl font-black uppercase italic tracking-tighter text-gray-950">Ajuste Final de <span className="text-red-600">Quantitativos e Preços</span></h3>
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Edite diretamente os valores abaixo se necessário</p>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead>
                    <tr className="text-[10px] font-black uppercase text-gray-400 border-b pb-6 tracking-widest">
                       <th className="pb-6">Descrição do Material</th>
                       <th className="pb-6 text-center">Tipo</th>
                       <th className="pb-6 text-center">Quantidade Final</th>
                       <th className="pb-6 text-right">Preço Unit. (R$)</th>
                       <th className="pb-6 text-right">Total Item</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {project.orcamentoItens.map(item => (
                       <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                          <td className="py-6 font-black uppercase text-xs text-gray-950">{item.produtoNome}</td>
                          <td className="py-6 text-center">
                             <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${item.origem === 'calculado' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                {item.origem}
                             </span>
                          </td>
                          <td className="py-6 text-center">
                            <input 
                              type="number" 
                              value={item.qtdFinal} 
                              onChange={(e) => handleUpdateBudgetManual(item.id, 'qtdFinal', parseFloat(e.target.value) || 0)}
                              className="w-24 bg-gray-50 p-2 rounded-lg text-center font-black border-none outline-none focus:ring-2 focus:ring-red-600"
                            />
                          </td>
                          <td className="py-6 text-right">
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.custoUnitario} 
                              onChange={(e) => handleUpdateBudgetManual(item.id, 'custoUnitario', parseFloat(e.target.value) || 0)}
                              className="w-32 bg-gray-50 p-2 rounded-lg text-right font-bold border-none outline-none focus:ring-2 focus:ring-red-600"
                            />
                          </td>
                          <td className="py-6 text-right font-black text-gray-950 italic">{formatCurrency(item.custoTotal)}</td>
                       </tr>
                    ))}
                 </tbody>
                 <tfoot>
                    <tr>
                       <td colSpan={4} className="py-10 text-right font-black uppercase text-xs text-gray-400 tracking-widest">Soma dos Insumos Selecionados:</td>
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
  const handleSaveExpense = async (e: Expense) => { await saveExpense(e); await loadData(); };
  const handleDeleteExpense = async (id: string) => { await deleteExpense(id); await loadData(); };
  const handleSaveSupplier = async (s: Supplier) => { await saveSupplier(s); await loadData(); };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950 font-sans selection:bg-red-100 selection:text-red-900">
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
          <Route path="/finance" element={<FinanceManager projects={projects} expenses={expenses} suppliers={suppliers} onSaveExpense={handleSaveExpense} onDeleteExpense={handleDeleteExpense} onSaveSupplier={handleSaveSupplier} />} />
          <Route path="/tasks" element={<TaskManager tasks={tasks} projects={projects} onSave={async (t) => { await saveTask(t); loadData(); }} onDelete={async (id) => { await deleteTask(id); loadData(); }} />} />
          <Route path="/products" element={<ProductManager products={products} onSave={async (p) => { await saveProduct(p); loadData(); }} onDelete={async (id) => { await deleteProduct(id); loadData(); }} />} />
          <Route path="/kits" element={<KitManager kits={kits} products={products} onSave={async (k) => { await saveKit(k); loadData(); }} />} />
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
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-4">Gestão de Carteira e Orçamentação Técnica</p>
          </div>
          <Link to="/project/new" className="bg-gray-950 text-white px-12 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all">+ Nova Cotação</Link>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {projects.length === 0 && (
            <div className="col-span-full py-40 text-center bg-white rounded-[5rem] border-4 border-dashed border-gray-100 flex flex-col items-center">
               <i className="fa-solid fa-folder-open text-6xl text-gray-100 mb-8"></i>
               <h3 className="font-black uppercase italic text-gray-300 text-3xl">Nenhum projeto encontrado</h3>
            </div>
          )}
          {projects.map(p => (
            <div key={p.id} className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-xl group hover:-translate-y-2 transition-all overflow-hidden relative">
               <div className="flex justify-between items-start mb-8 relative z-10">
                  <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${p.status === ProjectStatus.APPROVED ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{p.status}</span>
                  <div className="flex gap-4">
                    <button onClick={() => onDelete(p.id)} className="text-gray-200 hover:text-red-600 transition"><i className="fa-solid fa-trash"></i></button>
                  </div>
               </div>
               <h3 className="font-black text-2xl italic tracking-tighter uppercase mb-2 leading-none relative z-10">{p.cliente || 'Consumidor Final'}</h3>
               <p className="text-[10px] font-bold text-gray-400 uppercase mb-8 relative z-10">{p.obra || 'Obra não identificada'}</p>
               
               <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-inner relative z-10 overflow-hidden group/card">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full -mr-12 -mt-12 transition-transform group-hover/card:scale-150"></div>
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
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200 group-hover:text-red-200 transition-colors"><i className="fa-solid fa-box-open text-3xl"></i></div>
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
            <h2 className="text-3xl font-black uppercase italic mb-10 tracking-tighter border-b pb-6">Detalhes do <span className="text-red-600">Insumo</span></h2>
            <div className="space-y-6">
              <label className="block"><span className="text-[10px] font-black uppercase text-gray-400">Nome do Material</span>
                <input value={editing.nome} onChange={e => setEditing({...editing, nome: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" />
              </label>
              <label className="block"><span className="text-[10px] font-black uppercase text-gray-400">Preço Unitário</span>
                <input type="number" value={editing.preco} onChange={e => setEditing({...editing, preco: parseFloat(e.target.value)})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600" />
              </label>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setEditing(null)} className="flex-1 py-5 bg-gray-100 rounded-[2rem] font-black uppercase text-[10px] text-gray-400 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={async () => { await onSave(editing as Product); setEditing(null); }} className="flex-[2] py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:bg-red-700 transition">Salvar Produto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KitManager: React.FC<{ kits: Kit[], products: Product[], onSave: (k: Kit) => Promise<void> }> = ({ kits, products, onSave }) => {
  const [editing, setEditing] = useState<Kit | null>(null);
  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
      <h1 className="text-6xl font-black uppercase italic mb-16 tracking-tighter">Padrões <span className="text-red-600">Engenharia</span></h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {kits.map(k => (
          <div key={k.id} className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 group">
            <div className="flex justify-between items-start mb-8">
               <div>
                 <p className="text-[10px] font-black text-red-600 uppercase mb-1 tracking-widest">{k.tipoInfra}</p>
                 <h3 className="font-black uppercase italic text-3xl tracking-tighter">{k.nomeKit}</h3>
               </div>
               <button onClick={() => setEditing(k)} className="bg-gray-950 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-red-600 transition shadow-xl"><i className="fa-solid fa-gears"></i></button>
            </div>
            <div className="space-y-3">
              {k.componentes.map((c, i) => <div key={i} className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>{c.produtoNome}</span><span>Fator {c.fatorConversao}</span></div>)}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-16 rounded-[4rem] w-full max-w-2xl animate-fadeIn shadow-2xl">
             <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b pb-8">Configurar <span className="text-red-600">Composição</span></h2>
             <div className="space-y-8">
                <input value={editing.nomeKit} onChange={e => setEditing({...editing, nomeKit: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none focus:ring-2 focus:ring-red-600" />
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                {editing.componentes.map((c, i) => (
                  <div key={i} className="flex gap-4 items-center bg-gray-50 p-4 rounded-3xl">
                    <select value={c.produtoNome} onChange={e => { const n = [...editing.componentes]; n[i].produtoNome = e.target.value; setEditing({...editing, componentes: n}); }} className="flex-1 bg-transparent border-none outline-none font-bold text-xs uppercase focus:text-red-600 transition-colors">
                      {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                    </select>
                    <input type="number" step="0.01" value={c.fatorConversao} onChange={e => { const n = [...editing.componentes]; n[i].fatorConversao = parseFloat(e.target.value); setEditing({...editing, componentes: n}); }} className="w-20 bg-white p-2 rounded-xl text-center font-black focus:ring-2 focus:ring-red-600 transition-all outline-none" />
                    <button onClick={() => { const n = editing.componentes.filter((_, idx) => idx !== i); setEditing({...editing, componentes: n}); }} className="text-gray-300 hover:text-red-600 transition"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
                </div>
                <button onClick={() => setEditing({...editing, componentes: [...editing.componentes, { produtoNome: products[0]?.nome || '', fatorConversao: 1, unidade: 'UN' }]})} className="text-[10px] font-black uppercase text-red-600 hover:underline tracking-widest transition-all">+ Adicionar Insumo ao Kit</button>
             </div>
             <div className="flex gap-6 mt-16">
               <button onClick={() => setEditing(null)} className="flex-1 py-6 bg-gray-100 rounded-[2.5rem] font-black uppercase text-[10px] text-gray-400 hover:bg-gray-200 transition">Descartar</button>
               <button onClick={async () => { await onSave(editing); setEditing(null); }} className="flex-[2] py-6 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-[10px] shadow-xl hover:bg-red-700 transition">Salvar Padrão Técnico</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TaskManager: React.FC<{ tasks: Task[], projects: Project[], onSave: (t: Task) => Promise<void>, onDelete: (id: string) => Promise<void> }> = ({ tasks, projects, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
        <div>
          <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">Fluxo <span className="text-red-600">Operacional</span></h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.5em] mt-2">Cronograma e Acompanhamento de Obras</p>
        </div>
        <button onClick={() => setEditing({ titulo: '', status: TaskStatus.TODO, prioridade: TaskPriority.MEDIUM, dataVencimento: new Date().toISOString().split('T')[0] })} className="bg-gray-950 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase text-[10px] shadow-2xl hover:bg-red-600 transition-all">+ Nova Atividade</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {[TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE].map(status => (
          <div key={status} className="bg-gray-100/50 p-8 rounded-[3rem] min-h-[500px]">
            <h3 className="font-black uppercase italic text-gray-400 text-xs mb-8 tracking-[0.4em] px-4">{status}</h3>
            <div className="space-y-6">
              {tasks.filter(t => t.status === status).map(t => (
                <div key={t.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 group hover:shadow-xl transition-all">
                  <div className="flex justify-between mb-4"><span className={`text-[8px] font-black uppercase ${t.prioridade === TaskPriority.HIGH ? 'text-red-600' : 'text-gray-400'}`}>{t.prioridade}</span><button onClick={() => onDelete(t.id)} className="text-gray-200 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"><i className="fa-solid fa-trash"></i></button></div>
                  <h4 className="font-black text-lg italic tracking-tighter uppercase leading-none mb-2">{t.titulo}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(t.dataVencimento).toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-16 rounded-[4rem] w-full max-w-md animate-fadeIn shadow-2xl">
            <h2 className="text-3xl font-black uppercase italic mb-10 tracking-tighter border-b pb-6">Planejar <span className="text-red-600">Tarefa</span></h2>
            <div className="space-y-6">
              <input value={editing.titulo} onChange={e => setEditing({...editing, titulo: e.target.value})} placeholder="Título da Atividade" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-none outline-none mt-2 focus:ring-2 focus:ring-red-600 transition-all" />
              <div className="grid grid-cols-2 gap-4">
                <label>
                  <span className="text-[10px] font-black uppercase text-gray-400">Prioridade</span>
                  <select value={editing.prioridade} onChange={e => setEditing({...editing, prioridade: e.target.value as TaskPriority})} className="w-full bg-gray-50 p-4 rounded-xl font-black uppercase text-[10px] border-none outline-none focus:ring-2 focus:ring-red-600 transition-all mt-2">
                    {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label>
                  <span className="text-[10px] font-black uppercase text-gray-400">Status</span>
                  <select value={editing.status} onChange={e => setEditing({...editing, status: e.target.value as TaskStatus})} className="w-full bg-gray-50 p-4 rounded-xl font-black uppercase text-[10px] border-none outline-none focus:ring-2 focus:ring-red-600 transition-all mt-2">
                    {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setEditing(null)} className="flex-1 py-5 bg-gray-100 rounded-[2rem] font-black uppercase text-[10px] text-gray-400 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={async () => { await onSave(editing as Task); setEditing(null); }} className="flex-[2] py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-[10px] shadow-lg hover:bg-red-700 transition">Salvar Tarefa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
