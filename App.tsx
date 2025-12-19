
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
  KitComponent,
  Task,
  TaskStatus,
  TaskPriority,
  ChecklistItem
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
  deleteTask
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
    className={`flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-500 font-black uppercase text-[10px] tracking-[0.2em] ${
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

const ProposalDocument: React.FC<{ project: Project, isPreview?: boolean }> = ({ project, isPreview = false }) => {
  return (
    <div className={`${isPreview ? 'block' : 'hidden print:block'} p-12 bg-white text-gray-900 font-serif min-h-screen shadow-2xl max-w-[21cm] mx-auto`}>
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
        <h2 className="font-black uppercase text-xs text-red-600 mb-4 tracking-widest border-b pb-1">Detalhamento Técnico (Pavimentação)</h2>
        <div className="grid grid-cols-1 gap-4">
          {project.pavimentos.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="font-black uppercase text-[10px] text-gray-400">{p.tipo}</span>
                <p className="font-bold">{p.nome}</p>
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
        <h2 className="font-black uppercase text-xs text-red-600 mb-4 tracking-widest border-b pb-1">Composição Quantitativa de Materiais</h2>
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
              <td colSpan={3} className="py-4 text-right font-black uppercase text-xs">Valor Global de Materiais:</td>
              <td className="py-4 text-right font-black text-xl italic text-red-600">{formatCurrency(project.financeiro.precoVendaFinal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-12 text-[10px] leading-relaxed">
        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <h3 className="font-black uppercase text-gray-400 mb-2 tracking-widest">Condições de Fornecimento</h3>
          <p><b>Pagamento:</b> {project.condicoesPagamento}</p>
          <p><b>Cronograma:</b> {project.cronograma}</p>
          <p><b>Validade da Proposta:</b> {project.validadeDias} dias corridos</p>
        </div>
        <div className="p-6 flex flex-col justify-end text-center border-t-2 border-gray-100 mt-auto pt-10">
          <div className="w-48 h-0.5 bg-gray-300 mx-auto mb-2"></div>
          <p className="font-black uppercase text-gray-400 tracking-widest">Responsável Técnico / Brasília Engenharia</p>
        </div>
      </div>

      <div className="mt-12 text-[8px] text-gray-400 text-center uppercase font-bold">
        Documento gerado eletronicamente via Sistema Brasília v3.0
      </div>
    </div>
  );
};

// --- Pages ---

const TaskManager: React.FC<{ tasks: Task[], projects: Project[], onSave: (t: Task) => Promise<void>, onDelete: (id: string) => Promise<void> }> = ({ tasks, projects, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'TODAS'>('TODAS');

  const handleQuickStatusChange = async (task: Task, newStatus: TaskStatus) => {
    await onSave({ ...task, status: newStatus });
  };

  const priorityColors = {
    [TaskPriority.LOW]: 'bg-blue-50 text-blue-600 border-blue-100',
    [TaskPriority.MEDIUM]: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    [TaskPriority.HIGH]: 'bg-red-50 text-red-600 border-red-100',
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'TODAS' || t.prioridade === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const renderColumn = (status: TaskStatus, icon: string, color: string) => {
    const columnTasks = filteredTasks.filter(t => t.status === status);
    return (
      <div className="flex flex-col gap-6">
        <div className={`flex items-center justify-between p-7 rounded-[2.5rem] bg-white border border-gray-100 shadow-xl shadow-gray-200/20`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color} bg-opacity-10`}>
              <i className={`fa-solid ${icon} ${color}`}></i>
            </div>
            <h3 className="font-black uppercase italic tracking-tighter text-gray-900">{status}</h3>
          </div>
          <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-4 py-1.5 rounded-full">{columnTasks.length}</span>
        </div>
        
        <div className="flex flex-col gap-5 min-h-[400px]">
          {columnTasks.map(t => {
            const completedChecklist = t.checklist?.filter(i => i.concluido).length || 0;
            const totalChecklist = t.checklist?.length || 0;
            
            return (
              <div key={t.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-[8px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest border ${priorityColors[t.prioridade]}`}>
                      {t.prioridade}
                    </span>
                    {t.tags?.map(tag => (
                      <span key={tag} className="text-[8px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest bg-gray-100 text-gray-500 border border-gray-200">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditing(t)} className="text-gray-300 hover:text-gray-900"><i className="fa-solid fa-pen text-xs"></i></button>
                    <button onClick={() => confirm('Excluir tarefa?') && onDelete(t.id)} className="text-gray-300 hover:text-red-600"><i className="fa-solid fa-trash text-xs"></i></button>
                  </div>
                </div>
                
                <h4 className="font-black text-xl text-gray-900 uppercase italic tracking-tighter mb-2 group-hover:text-red-600 transition-colors leading-tight">{t.titulo}</h4>
                <p className="text-[11px] text-gray-400 font-bold leading-relaxed mb-6 line-clamp-2">{t.descricao}</p>
                
                {totalChecklist > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between text-[8px] font-black uppercase text-gray-400 mb-1">
                      <span>Checklist</span>
                      <span>{completedChecklist}/{totalChecklist}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-600 transition-all duration-500" 
                        style={{ width: `${(completedChecklist / totalChecklist) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {t.arquivoNome && (
                  <div className="mb-6 bg-blue-50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <i className="fa-solid fa-file-pdf text-blue-500 text-lg"></i>
                      <span className="text-[10px] font-black text-blue-700 uppercase truncate max-w-[150px]">{t.arquivoNome}</span>
                    </div>
                    {t.arquivoUrl && (
                      <a href={t.arquivoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        <i className="fa-solid fa-download"></i>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-4 pt-6 border-t border-gray-50">
                  {t.projetoNome && (
                    <div className="flex items-center gap-2 text-[9px] font-black text-red-600 uppercase tracking-widest bg-red-50 p-2 rounded-xl">
                      <i className="fa-solid fa-folder-open"></i> {t.projetoNome}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                      <i className="fa-solid fa-calendar-day"></i> {new Date(t.dataVencimento).toLocaleDateString('pt-BR')}
                    </div>
                    <select 
                      value={t.status} 
                      onChange={(e) => handleQuickStatusChange(t, e.target.value as TaskStatus)}
                      className="text-[9px] font-black uppercase bg-gray-50 border-none outline-none rounded-xl px-4 py-2 cursor-pointer hover:bg-gray-100 transition"
                    >
                      {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
        <div>
          <h1 className="text-6xl font-black text-gray-950 tracking-tighter italic uppercase leading-none">
            Fluxo <span className="text-red-600">Operacional</span>
          </h1>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.5em] mt-4 flex items-center gap-3">
             <i className="fa-solid fa-list-check text-red-600"></i> Gestão de Cronograma e Prioridades
          </p>
        </div>
        <button 
          onClick={() => setEditing({ 
            titulo: '', 
            descricao: '', 
            status: TaskStatus.TODO, 
            prioridade: TaskPriority.MEDIUM, 
            dataVencimento: new Date().toISOString().split('T')[0],
            tags: [],
            checklist: []
          })}
          className="bg-gray-950 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-[11px] flex items-center gap-5 shadow-2xl transition-all hover:scale-105 active:scale-95 hover:bg-red-600"
        >
          <i className="fa-solid fa-plus-circle text-xl"></i> Nova Atividade
        </button>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 mb-12 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 relative w-full">
          <i className="fa-solid fa-magnifying-glass absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"></i>
          <input 
            type="text"
            placeholder="PESQUISAR ATIVIDADE..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border-2 border-transparent focus:border-red-600 pl-14 pr-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest outline-none transition-all"
          />
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <select 
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}
            className="bg-gray-50 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest outline-none border-2 border-transparent focus:border-red-600 cursor-pointer"
          >
            <option value="TODAS">TODAS PRIORIDADES</option>
            {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {renderColumn(TaskStatus.TODO, 'fa-circle-dot', 'text-gray-400')}
        {renderColumn(TaskStatus.DOING, 'fa-spinner animate-spin-slow', 'text-yellow-500')}
        {renderColumn(TaskStatus.DONE, 'fa-circle-check', 'text-green-500')}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto p-16 shadow-2xl relative animate-fadeIn border border-white/20">
            <div className="absolute top-0 left-0 w-full h-3 bg-red-600"></div>
            <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter text-gray-950 border-b-2 border-gray-50 pb-8">
              {editing.id ? 'Editar Registro' : 'Planejar Atividade'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <label className="block md:col-span-2">
                <span className="text-[11px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Nome da Atividade</span>
                <input 
                  autoFocus
                  value={editing.titulo} 
                  onChange={e => setEditing({...editing, titulo: e.target.value})}
                  className="w-full bg-gray-50 p-6 rounded-[2rem] font-bold border-2 border-transparent focus:border-red-600 focus:bg-white outline-none transition-all text-gray-950 text-lg" 
                  placeholder="Ex: Entrega de Material Obra Brasília"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Anotações do Cronograma</span>
                <textarea 
                  value={editing.descricao} 
                  onChange={e => setEditing({...editing, descricao: e.target.value})}
                  className="w-full bg-gray-50 p-6 rounded-[2rem] font-bold border-2 border-transparent focus:border-red-600 focus:bg-white outline-none transition-all text-gray-950 h-32" 
                  placeholder="Detalhes técnicos ou pendências..."
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Nível de Prioridade</span>
                <select 
                  value={editing.prioridade} 
                  onChange={e => setEditing({...editing, prioridade: e.target.value as TaskPriority})}
                  className="w-full bg-gray-50 p-6 rounded-[2rem] font-black border-2 border-transparent focus:border-red-600 outline-none text-gray-950 uppercase italic"
                >
                  {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Vencimento</span>
                <input 
                  type="date"
                  value={editing.dataVencimento?.split('T')[0]} 
                  onChange={e => setEditing({...editing, dataVencimento: e.target.value})}
                  className="w-full bg-gray-50 p-6 rounded-[2rem] font-black border-2 border-transparent focus:border-red-600 outline-none text-gray-950" 
                />
              </label>

              <div className="md:col-span-2 bg-gray-50 p-10 rounded-[3rem] border-2 border-dashed border-gray-200">
                <span className="text-[11px] font-black uppercase text-gray-400 block mb-6 tracking-widest text-center italic">Documentação em Anexo</span>
                <div className="flex flex-col items-center gap-6">
                  {editing.arquivoNome ? (
                    <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-2xl shadow-sm border border-blue-100">
                      <i className="fa-solid fa-file-invoice text-blue-600 text-xl"></i>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-gray-950 leading-none mb-1">{editing.arquivoNome}</p>
                        <button onClick={() => setEditing({...editing, arquivoNome: '', arquivoUrl: ''})} className="text-[8px] font-bold text-red-500 uppercase hover:underline">Remover Anexo</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="bg-white border-2 border-gray-200 px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-4 cursor-pointer hover:border-red-600 hover:text-red-600 transition-all shadow-sm">
                        <i className="fa-solid fa-cloud-arrow-up text-lg"></i> Selecionar Arquivo do Dispositivo
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setEditing({...editing, arquivoNome: file.name, arquivoUrl: '#' /* Link simulado */ });
                            }
                          }}
                        />
                      </label>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">PDF, JPG, PNG ou DOCX (MÁX. 10MB)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 mt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Etapas de Execução (Checklist)</span>
                  <button 
                    onClick={() => {
                      const newChecklist = [...(editing.checklist || []), { id: Math.random().toString(), texto: '', concluido: false }];
                      setEditing({...editing, checklist: newChecklist});
                    }}
                    className="text-red-600 text-[10px] font-black uppercase italic hover:underline"
                  >
                    + Adicionar Etapa
                  </button>
                </div>
                <div className="space-y-3">
                  {editing.checklist?.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                      <input 
                        type="checkbox" 
                        checked={item.concluido}
                        onChange={e => {
                          const newCheck = [...editing.checklist!];
                          newCheck[idx].concluido = e.target.checked;
                          setEditing({...editing, checklist: newCheck});
                        }}
                        className="w-5 h-5 rounded-lg border-gray-300 text-red-600 focus:ring-red-600"
                      />
                      <input 
                        value={item.texto}
                        onChange={e => {
                          const newCheck = [...editing.checklist!];
                          newCheck[idx].texto = e.target.value;
                          setEditing({...editing, checklist: newCheck});
                        }}
                        placeholder="Descreva a sub-tarefa..."
                        className="flex-1 bg-transparent border-none outline-none font-bold text-xs uppercase tracking-tight text-gray-950"
                      />
                      <button 
                        onClick={() => {
                          const newCheck = editing.checklist!.filter((_, i) => i !== idx);
                          setEditing({...editing, checklist: newCheck});
                        }}
                        className="text-gray-300 hover:text-red-600"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="block md:col-span-2">
                <span className="text-[11px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Tags (Separadas por vírgula)</span>
                <input 
                  value={editing.tags?.join(', ')} 
                  onChange={e => setEditing({...editing, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                  className="w-full bg-gray-50 p-5 rounded-2xl font-black text-xs border-2 border-transparent focus:border-red-600 outline-none text-gray-950 italic uppercase" 
                  placeholder="EX: TÉCNICO, VISITA, URBANO"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-[11px] font-black uppercase text-gray-400 block mb-3 tracking-widest">Projeto Relacionado</span>
                <select 
                  value={editing.projetoId || ''} 
                  onChange={e => {
                    const p = projects.find(proj => proj.id === e.target.value);
                    setEditing({...editing, projetoId: e.target.value, projetoNome: p?.cliente});
                  }}
                  className="w-full bg-gray-50 p-6 rounded-[2rem] font-black border-2 border-transparent focus:border-red-600 outline-none text-gray-950 italic"
                >
                  <option value="">Apenas Tarefa Avulsa</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.cliente} | {p.obra}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-16 flex gap-6">
              <button onClick={() => setEditing(null)} className="flex-1 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest bg-gray-100 text-gray-400 hover:bg-gray-200 transition">Descartar</button>
              <button 
                onClick={async () => {
                  if (!editing.titulo) return alert('O título é obrigatório.');
                  setIsSaving(true);
                  await onSave(editing as Task);
                  setIsSaving(false);
                  setEditing(null);
                }}
                disabled={isSaving}
                className="flex-[2] bg-red-600 text-white py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSaving ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
                {isSaving ? 'Gravando...' : 'Salvar Atividade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard: React.FC<{ projects: Project[], onDelete: (id: string) => void }> = ({ projects, onDelete }) => {
  const navigate = useNavigate();
  const totalProjects = projects.length;
  const totalValue = projects.reduce((acc, p) => acc + (p.financeiro?.precoVendaFinal || 0), 0);
  const approvedCount = projects.filter(p => p.status === ProjectStatus.APPROVED).length;
  const draftCount = projects.filter(p => p.status === ProjectStatus.DRAFT).length;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16">
        <div>
          <h1 className="text-7xl font-black text-gray-950 tracking-tighter italic uppercase leading-none">
            Visão <span className="text-red-600">Premium</span>
          </h1>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.6em] mt-6 flex items-center gap-4">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></span>
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
            </span> 
            Ecossistema Brasília Engenharia v3.0
          </p>
        </div>
        <div className="flex gap-4">
            <button onClick={() => navigate('/tasks')} className="bg-white border-2 border-gray-100 px-8 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center gap-3 shadow-xl hover:border-red-600 transition-all">
                <i className="fa-solid fa-list-check text-red-600"></i> Ver Tarefas
            </button>
            <Link 
              to="/project/new" 
              className="bg-gray-950 text-white px-12 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center gap-4 shadow-2xl transition-all hover:scale-105 active:scale-95 hover:bg-red-600"
            >
              <i className="fa-solid fa-plus-circle text-lg"></i> Nova Cotação
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-2xl shadow-gray-200/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -right-6 -top-6 text-gray-50 text-8xl font-black group-hover:text-red-50 transition-colors">
            <i className="fa-solid fa-folder-tree"></i>
          </div>
          <span className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-[0.3em] relative z-10">Carteira Ativa</span>
          <span className="font-black text-5xl text-gray-950 tracking-tighter relative z-10">{totalProjects}</span>
        </div>

        <div className="bg-red-600 p-10 rounded-[4rem] shadow-2xl shadow-red-600/30 relative overflow-hidden group text-white hover:scale-[1.02] transition-transform">
          <div className="absolute -right-6 -top-6 text-white/10 text-8xl font-black group-hover:text-white/20 transition-colors">
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
          <span className="text-[10px] font-black uppercase text-red-100 block mb-3 tracking-[0.3em] relative z-10">Valor Global</span>
          <span className="font-black text-3xl text-white tracking-tighter italic relative z-10">{formatCurrency(totalValue)}</span>
        </div>

        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-2xl shadow-gray-200/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -right-6 -top-6 text-gray-50 text-8xl font-black group-hover:text-green-50 transition-colors">
            <i className="fa-solid fa-shield-check"></i>
          </div>
          <span className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-[0.3em] relative z-10">Fechamentos</span>
          <span className="font-black text-5xl text-green-600 tracking-tighter relative z-10">{approvedCount}</span>
        </div>

        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-2xl shadow-gray-200/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
          <div className="absolute -right-6 -top-6 text-gray-50 text-8xl font-black group-hover:text-orange-50 transition-colors">
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <span className="text-[10px] font-black uppercase text-gray-400 block mb-3 tracking-[0.3em] relative z-10">Pendências</span>
          <span className="font-black text-5xl text-orange-500 tracking-tighter relative z-10">{draftCount}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-10 px-6">
        <h2 className="text-[14px] font-black uppercase text-gray-950 tracking-[0.6em] italic bg-gray-100/50 px-8 py-3 rounded-full">Histórico de Cotações</h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-gray-200 to-transparent mx-10"></div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-48 bg-white rounded-[5rem] border-4 border-dashed border-gray-50 shadow-inner flex flex-col items-center">
          <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-10 shadow-lg">
            <i className="fa-solid fa-folder-open text-6xl text-gray-200"></i>
          </div>
          <h3 className="text-3xl font-black uppercase italic text-gray-300 tracking-tighter">Nenhum Registro</h3>
          <Link to="/project/new" className="mt-12 bg-red-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-105 transition">Criar Cotação Agora</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-12">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-[4rem] shadow-2xl shadow-gray-200/30 border border-gray-100 hover:shadow-red-600/10 hover:-translate-y-3 transition-all group overflow-hidden flex flex-col">
              <div className="p-12 flex-1">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex-1 pr-6">
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-3 italic bg-red-50 inline-block px-3 py-1 rounded-lg">REF: {p.id.slice(0, 8).toUpperCase()}</p>
                    <h3 className="font-black text-3xl text-gray-950 uppercase italic tracking-tighter leading-[1.1] group-hover:text-red-600 transition-colors truncate">{p.cliente || 'Consumidor Final'}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[9px] px-5 py-2.5 rounded-full font-black uppercase tracking-widest border-2 ${p.status === ProjectStatus.APPROVED ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>{p.status}</span>
                    <Link 
                      to={`/project/${p.id}?view=proposal`} 
                      className="text-red-600 text-[10px] font-black hover:bg-red-50 px-3 py-1.5 rounded-full transition flex items-center gap-2"
                    >
                      <i className="fa-solid fa-file-pdf"></i> ACESSAR PDF
                    </Link>
                  </div>
                </div>
                <div className="bg-gray-900 p-10 rounded-[3rem] shadow-inner relative overflow-hidden">
                    <span className="text-[9px] font-black uppercase text-gray-400 block mb-2 tracking-[0.3em]">Total Materiais</span>
                    <span className="font-black text-3xl text-white italic tracking-tighter">{formatCurrency(p.financeiro?.precoVendaFinal || 0)}</span>
                </div>
              </div>
              <div className="bg-gray-50 px-12 py-8 flex justify-between items-center">
                <button onClick={() => onDelete(p.id)} className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 hover:text-red-600 transition-all"><i className="fa-solid fa-trash-can text-lg"></i></button>
                <Link to={`/project/${p.id}`} className="text-[11px] font-black uppercase text-gray-950 hover:text-red-600 tracking-[0.2em] italic flex items-center gap-3">Detalhes do Projeto <i className="fa-solid fa-arrow-right-long text-red-600"></i></Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Page Components ---

const ProductManager: React.FC<{ products: Product[], onSave: (p: Product) => Promise<void>, onDelete: (id: string) => Promise<void> }> = ({ products, onSave, onDelete }) => {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  return (
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl font-black uppercase italic tracking-tighter text-gray-950 leading-none">Catálogo <span className="text-red-600">Produtos</span></h1>
        <button onClick={() => setEditing({ nome: '', preco: 0 })} className="bg-gray-950 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-red-600 transition-all">+ Novo Cadastro</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {products.map(p => (
          <div key={p.id} className="bg-white p-10 rounded-[4rem] shadow-xl border border-gray-100 flex flex-col items-center group hover:scale-105 transition-all">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:bg-red-50 transition-colors">
              {p.imagem ? <img src={p.imagem} className="w-16 h-16 object-contain" /> : <i className="fa-solid fa-box-open text-3xl text-gray-200 group-hover:text-red-200"></i>}
            </div>
            <h3 className="font-black text-center mb-2 uppercase text-[10px] tracking-widest text-gray-400">{p.nome}</h3>
            <span className="text-gray-950 font-black text-xl italic mb-6 tracking-tighter">{formatCurrency(p.preco)}</span>
            <div className="flex gap-4">
               <button onClick={() => setEditing(p)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 hover:text-gray-950 hover:bg-white border border-transparent hover:border-gray-100 transition-all shadow-sm"><i className="fa-solid fa-pen-to-square"></i></button>
               <button onClick={() => confirm('Remover do catálogo?') && onDelete(p.id)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-white border border-transparent hover:border-gray-100 transition-all shadow-sm"><i className="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-16 rounded-[4rem] w-full max-w-md shadow-2xl border border-white/20 animate-fadeIn">
            <h2 className="text-3xl font-black uppercase italic mb-10 tracking-tighter border-b-2 border-gray-50 pb-6">Detalhes do <span className="text-red-600">Produto</span></h2>
            <div className="space-y-6">
              <label className="block">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Identificação</span>
                <input value={editing.nome} onChange={e => setEditing({...editing, nome: e.target.value})} placeholder="Ex: Central de Alarme" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none transition-all" />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Preço Unitário (R$)</span>
                <input type="number" value={editing.preco} onChange={e => setEditing({...editing, preco: parseFloat(e.target.value)})} placeholder="0.00" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none transition-all" />
              </label>
              <label className="block">
                <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">URL da Imagem</span>
                <input value={editing.imagem} onChange={e => setEditing({...editing, imagem: e.target.value})} placeholder="http://..." className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none transition-all" />
              </label>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setEditing(null)} className="flex-1 py-5 bg-gray-100 rounded-[2rem] font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={async () => { await onSave(editing as Product); setEditing(null); }} className="flex-[2] py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-red-700 transition">Salvar Produto</button>
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
    <div className="p-8 max-w-7xl mx-auto animate-fadeIn no-print">
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-6xl font-black uppercase italic tracking-tighter text-gray-950 leading-none">Padrões <span className="text-red-600">Engenharia</span></h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {kits.map(k => (
          <div key={k.id} className="bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 -mr-16 -mt-16 rounded-full group-hover:bg-red-50 transition-colors"></div>
            <div className="flex justify-between items-start mb-10 relative z-10">
               <div>
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1 italic">TIPO: {k.tipoInfra}</p>
                 <h3 className="font-black uppercase italic text-3xl tracking-tighter text-gray-950">{k.nomeKit}</h3>
               </div>
               <button onClick={() => setEditing(k)} className="bg-gray-950 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-red-600 transition-all shadow-xl"><i className="fa-solid fa-gears"></i></button>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-b pb-2 mb-4">Composição de Materiais</p>
              {k.componentes.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-[11px] font-bold text-gray-600">
                  <span className="uppercase">{c.produtoNome}</span>
                  <span className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">Fator: {c.fatorConversao} {c.unidade}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl z-[5000] flex items-center justify-center p-4">
          <div className="bg-white p-16 rounded-[4rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 animate-fadeIn">
            <h2 className="text-4xl font-black uppercase italic mb-10 tracking-tighter border-b-2 border-gray-50 pb-8">Configurar <span className="text-red-600">Composição</span></h2>
            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Nome do Kit</span>
                  <input value={editing.nomeKit} onChange={e => setEditing({...editing, nomeKit: e.target.value})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Perda Estimada (%)</span>
                  <input type="number" value={editing.percentualPerda} onChange={e => setEditing({...editing, percentualPerda: parseFloat(e.target.value)})} className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none" />
                </label>
              </div>
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <p className="font-black text-[10px] uppercase text-gray-400 tracking-widest">Insumos do Cálculo</p>
                  <button onClick={() => setEditing({...editing, componentes: [...editing.componentes, { produtoNome: products[0]?.nome || '', fatorConversao: 1, unidade: 'UN' }]})} className="text-[10px] font-black uppercase text-red-600 hover:underline">+ Adicionar Item</button>
                </div>
                {editing.componentes.map((c, i) => (
                  <div key={i} className="flex gap-4 items-center bg-gray-50 p-4 rounded-3xl border border-transparent hover:border-gray-200 transition-all">
                    <select value={c.produtoNome} onChange={e => {
                      const newComps = [...editing.componentes];
                      newComps[i].produtoNome = e.target.value;
                      setEditing({...editing, componentes: newComps});
                    }} className="flex-1 bg-transparent border-none outline-none font-bold text-xs uppercase text-gray-950">
                      {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-gray-400 uppercase">Fator</span>
                      <input type="number" step="0.01" value={c.fatorConversao} onChange={e => {
                        const newComps = [...editing.componentes];
                        newComps[i].fatorConversao = parseFloat(e.target.value);
                        setEditing({...editing, componentes: newComps});
                      }} className="w-20 bg-white p-2 rounded-xl font-black text-center border-none shadow-sm" />
                    </div>
                    <select value={c.unidade} onChange={e => {
                        const newComps = [...editing.componentes];
                        newComps[i].unidade = e.target.value as 'UN' | 'M';
                        setEditing({...editing, componentes: newComps});
                    }} className="bg-white p-2 rounded-xl font-black text-[10px] border-none shadow-sm uppercase">
                        <option value="UN">UN</option>
                        <option value="M">M</option>
                    </select>
                    <button onClick={() => {
                      const newComps = editing.componentes.filter((_, idx) => idx !== i);
                      setEditing({...editing, componentes: newComps});
                    }} className="text-gray-300 hover:text-red-600"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-6 mt-16">
              <button onClick={() => setEditing(null)} className="flex-1 py-6 bg-gray-100 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest text-gray-400 hover:bg-gray-200 transition">Descartar Alterações</button>
              <button onClick={async () => { await onSave(editing); setEditing(null); }} className="flex-[2] py-6 bg-red-600 text-white rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-red-700 transition">Salvar nos Padrões</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectEditor: React.FC<{ projects: Project[], products: Product[], kits: Kit[], customers: Customer[], onSave: (p: Project) => Promise<void>, onSaveCustomer: (c: Customer) => Promise<any>, isPrinting: boolean, setIsPrinting: (v: boolean) => void }> = ({ projects, products, kits, customers, onSave, onSaveCustomer, isPrinting, setIsPrinting }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'proposal'>('editor');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('view') === 'proposal') {
      setViewMode('proposal');
    }
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
        financeiro: {
          custoMateriais: 0,
          bdiPercentual: 25,
          bdiValor: 0,
          margemLucroPercentual: 15,
          margemLucroValor: 0,
          descontoPercentual: 0,
          descontoValor: 0,
          precoVendaFinal: 0
        },
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

  const handleAddFloor = () => {
    const newFloor: Floor = {
      id: Math.random().toString(36).substr(2, 9),
      nome: `Pavimento ${project.pavimentos.length + 1}`,
      tipo: FloorType.TIPO,
      referenciaPrancha: '',
      largura: 0,
      comprimento: 0,
      altura: 3,
      itensCentrais: [],
      infraestruturas: []
    };
    setProject({ ...project, pavimentos: [...project.pavimentos, newFloor] });
  };

  const handleGeneratePDF = async () => {
    if (!project) return;
    setIsGenerating(true);
    
    // Define o título da página para o nome do arquivo sugerido no PDF
    const oldTitle = document.title;
    document.title = `PROPOSTA_${project.cliente || 'CLIENTE'}_${project.obra || 'OBRA'}`.replace(/\s+/g, '_').toUpperCase();

    // Atualiza status e marca que a proposta foi gerada
    const updatedProject = { 
      ...project, 
      status: ProjectStatus.SENT, 
      propostaUrl: `/proposal/${project.id}` 
    };
    
    setProject(updatedProject);
    await onSave(updatedProject);
    
    // Dispara fluxo de impressão com delay para garantir renderização total
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      setIsGenerating(false);
      document.title = oldTitle; // Restaura título original após impressão
    }, 800);
  };

  if (viewMode === 'proposal') {
    return (
      <>
        {/* Versão real para window.print() (Sempre fora de contêineres no-print) */}
        <ProposalDocument project={project} />
        
        {/* Interface de Visualização (no-print) */}
        <div className="animate-fadeIn p-8 flex flex-col items-center gap-12 no-print">
          <div className="w-full max-w-4xl flex justify-between items-center">
            <button 
              onClick={() => setViewMode('editor')} 
              className="flex items-center gap-3 font-black uppercase text-[10px] text-gray-400 hover:text-gray-950 transition-all"
            >
              <i className="fa-solid fa-chevron-left"></i> Voltar ao Editor
            </button>
            <div className="flex gap-4">
              <button 
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="bg-red-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
              >
                {isGenerating ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-download"></i>}
                {isGenerating ? 'PREPARANDO PDF...' : 'BAIXAR / IMPRIMIR PDF'}
              </button>
            </div>
          </div>
          
          <div className="bg-gray-200 p-8 rounded-[3rem] shadow-inner overflow-auto w-full flex justify-center">
              <ProposalDocument project={project} isPreview={true} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Versão real para window.print() */}
      <ProposalDocument project={project} />
      
      {/* Interface do Editor */}
      <div className="p-8 max-w-7xl mx-auto space-y-12 animate-fadeIn no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-8">
           <div>
             <h1 className="text-6xl font-black uppercase italic tracking-tighter text-gray-950 leading-none">Editor <span className="text-red-600">Cotação</span></h1>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] mt-3">ID REF: {project.id.toUpperCase()}</p>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={() => setViewMode('proposal')}
                className="bg-white border-2 border-gray-100 px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:border-red-600 shadow-xl transition-all flex items-center gap-3"
              >
                <i className="fa-solid fa-eye text-gray-400"></i> VISUALIZAR PDF
              </button>
              <button 
                onClick={handleGeneratePDF} 
                disabled={isGenerating}
                className="bg-white border-2 border-gray-100 px-8 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:border-red-600 shadow-xl transition-all flex items-center gap-3"
              >
                {isGenerating ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-file-pdf text-red-600"></i>}
                {isGenerating ? 'PROCESSANDO...' : 'GERAR PDF'}
              </button>
              <button onClick={handleCalculate} className="bg-red-600 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:scale-105 transition-all">Recalcular Engenharia</button>
              <button onClick={async () => { await onSave(project); navigate('/'); }} className="bg-gray-950 text-white px-10 py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-red-600 transition-all">Salvar Projeto</button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-xl border border-gray-100">
             <h3 className="font-black uppercase italic text-gray-400 text-[10px] mb-8 tracking-[0.4em] border-b pb-4">Escopo do Projeto</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <label className="block col-span-2">
                 <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Identificação do Cliente</span>
                 <input value={project.cliente} onChange={e => setProject({...project, cliente: e.target.value})} placeholder="Nome Completo ou Razão Social" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none" />
               </label>
               <label className="block">
                 <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Nome da Obra</span>
                 <input value={project.obra} onChange={e => setProject({...project, obra: e.target.value})} placeholder="Ex: Residencial Brasília" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none" />
               </label>
               <label className="block">
                 <span className="text-[10px] font-black uppercase text-gray-400 block mb-2 tracking-widest">Endereço da Execução</span>
                 <input value={project.endereco} onChange={e => setProject({...project, endereco: e.target.value})} placeholder="Localização completa" className="w-full bg-gray-50 p-5 rounded-2xl font-bold border-2 border-transparent focus:border-red-600 outline-none" />
               </label>
             </div>
          </div>

          <div className="bg-gray-950 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full -mr-24 -mt-24 group-hover:scale-110 transition-transform"></div>
             <h3 className="font-black uppercase italic text-red-600 text-[10px] mb-10 tracking-[0.4em]">Resumo Comercial</h3>
             <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                  <span className="text-[10px] font-black uppercase text-gray-400">Total Materiais</span>
                  <p className="font-black text-2xl italic text-white tracking-tighter">{formatCurrency(project.financeiro.custoMateriais)}</p>
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-4">
                  <span className="text-[10px] font-black uppercase text-red-500">Valor Final Venda</span>
                  <p className="font-black text-4xl italic text-white tracking-tighter">{formatCurrency(project.financeiro.precoVendaFinal)}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4 mt-12 relative z-10">
                <label>
                  <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">BDI %</span>
                  <input type="number" value={project.financeiro.bdiPercentual} onChange={e => setProject({...project, financeiro: updateFinancialTotals({...project.financeiro, bdiPercentual: parseFloat(e.target.value)})})} className="w-full bg-white/5 text-white p-3 rounded-xl font-bold border border-white/10 outline-none" />
                </label>
                <label>
                  <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">MARGEM %</span>
                  <input type="number" value={project.financeiro.margemLucroPercentual} onChange={e => setProject({...project, financeiro: updateFinancialTotals({...project.financeiro, margemLucroPercentual: parseFloat(e.target.value)})})} className="w-full bg-white/5 text-white p-3 rounded-xl font-bold border border-white/10 outline-none" />
                </label>
             </div>
          </div>
        </div>

        <div className="space-y-10">
          <div className="flex justify-between items-center px-6">
             <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-950">Engenharia <span className="text-red-600">Pavimentação</span></h2>
             <button onClick={handleAddFloor} className="bg-gray-950 text-white px-8 py-3 rounded-full font-black uppercase text-[9px] tracking-[0.3em] hover:bg-red-600 transition shadow-xl">+ Novo Pavimento</button>
          </div>
          
          {project.pavimentos.map((floor, fIdx) => (
            <div key={floor.id} className="bg-white p-12 rounded-[5rem] shadow-xl border border-gray-100 hover:shadow-2xl transition-all relative">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                 <input value={floor.nome} onChange={e => {
                   const newPavs = [...project.pavimentos];
                   newPavs[fIdx].nome = e.target.value;
                   setProject({...project, pavimentos: newPavs});
                 }} className="font-black uppercase italic text-3xl bg-transparent border-b-4 border-red-600/10 focus:border-red-600 outline-none w-full md:w-auto tracking-tighter pb-2" />
                 <div className="flex gap-4">
                    <select value={floor.tipo} onChange={e => {
                      const newPavs = [...project.pavimentos];
                      newPavs[fIdx].tipo = e.target.value as FloorType;
                      setProject({...project, pavimentos: newPavs});
                    }} className="bg-gray-50 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border-none outline-none shadow-sm">
                      {Object.values(FloorType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button onClick={() => setProject({...project, pavimentos: project.pavimentos.filter((_, idx) => idx !== fIdx)})} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><i className="fa-solid fa-trash-can"></i></button>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-red-600 mb-6 tracking-[0.3em] flex items-center gap-3">
                    <i className="fa-solid fa-ruler-combined"></i> Metragem de Infraestrutura
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kits.map(k => (
                      <div key={k.id} className="bg-gray-50 p-6 rounded-[2.5rem] flex flex-col gap-3 group hover:bg-white border border-transparent hover:border-gray-100 transition-all shadow-sm">
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{k.nomeKit} (M)</span>
                        <input 
                          type="number" 
                          value={floor.infraestruturas.find(i => i.tipo === k.tipoInfra)?.metragem || 0}
                          onChange={e => {
                            const newPavs = [...project.pavimentos];
                            const idx = newPavs[fIdx].infraestruturas.findIndex(i => i.tipo === k.tipoInfra);
                            if (idx >= 0) newPavs[fIdx].infraestruturas[idx].metragem = parseFloat(e.target.value);
                            else newPavs[fIdx].infraestruturas.push({ tipo: k.tipoInfra, metragem: parseFloat(e.target.value) });
                            setProject({...project, pavimentos: newPavs});
                          }}
                          className="bg-white p-3 rounded-2xl font-black text-xl italic text-gray-950 border-none outline-none shadow-sm text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[10px] font-black uppercase text-gray-950 tracking-[0.3em] flex items-center gap-3">
                      <i className="fa-solid fa-microchip"></i> Itens Centrais / Painéis
                    </h4>
                    <button onClick={() => {
                      const newPavs = [...project.pavimentos];
                      newPavs[fIdx].itensCentrais.push({ id: Math.random().toString(), produtoNome: products[0]?.nome || '', quantidade: 1 });
                      setProject({...project, pavimentos: newPavs});
                    }} className="text-[9px] font-black uppercase text-red-600 hover:underline">+ Adicionar Item</button>
                  </div>
                  <div className="space-y-3">
                    {floor.itensCentrais.length === 0 && (
                      <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-[9px] font-black text-gray-300 uppercase italic">Nenhum item central cadastrado</div>
                    )}
                    {floor.itensCentrais.map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-3xl border border-transparent hover:border-gray-200 transition-all">
                        <select value={item.produtoNome} onChange={e => {
                          const newPavs = [...project.pavimentos];
                          newPavs[fIdx].itensCentrais[iIdx].produtoNome = e.target.value;
                          setProject({...project, pavimentos: newPavs});
                        }} className="flex-1 bg-transparent border-none outline-none text-xs font-black uppercase text-gray-950">
                          {products.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-gray-400">QTD</span>
                           <input type="number" value={item.quantidade} onChange={e => {
                             const newPavs = [...project.pavimentos];
                             newPavs[fIdx].itensCentrais[iIdx].quantidade = parseFloat(e.target.value);
                             setProject({...project, pavimentos: newPavs});
                           }} className="w-16 bg-white p-2 rounded-xl text-center font-black text-sm border-none shadow-sm" />
                        </div>
                        <button onClick={() => {
                          const newPavs = [...project.pavimentos];
                          newPavs[fIdx].itensCentrais = newPavs[fIdx].itensCentrais.filter((_, idx) => idx !== iIdx);
                          setProject({...project, pavimentos: newPavs});
                        }} className="text-gray-300 hover:text-red-600"><i className="fa-solid fa-xmark"></i></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {project.orcamentoItens.length > 0 && (
          <div className="bg-white p-12 rounded-[5rem] shadow-2xl border border-gray-100 mt-16 animate-fadeIn no-print">
            <div className="flex justify-between items-center mb-10 border-b pb-6">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter text-gray-950">Composição <span className="text-red-600">Materiais</span></h3>
              <span className="bg-gray-950 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">{project.orcamentoItens.length} ITENS CALCULADOS</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] border-b">
                    <th className="pb-6">Descrição Técnica do Material</th>
                    <th className="pb-6 text-center">Origem</th>
                    <th className="pb-6 text-center">Qtd. Projeto</th>
                    <th className="pb-6 text-right">Preço Unit.</th>
                    <th className="pb-6 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {project.orcamentoItens.map(item => (
                    <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-6 font-black uppercase text-xs text-gray-950 tracking-tight">{item.produtoNome}</td>
                      <td className="py-6 text-center">
                        <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${item.origem === 'calculado' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                          {item.origem}
                        </span>
                      </td>
                      <td className="py-6 text-center font-black text-gray-600">{item.qtdFinal}</td>
                      <td className="py-6 text-right font-bold text-gray-400">{formatCurrency(item.custoUnitario)}</td>
                      <td className="py-6 text-right font-black text-gray-950 italic">{formatCurrency(item.custoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="py-8 text-right font-black uppercase text-gray-400 text-[10px] tracking-[0.3em]">Custo Bruto de Aquisição:</td>
                    <td className="py-8 text-right font-black text-3xl italic text-gray-950 tracking-tighter">{formatCurrency(project.financeiro.custoMateriais)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const location = useLocation();

  const loadData = useCallback(async () => {
    try {
      const [proj, prod, k, cust, t] = await Promise.all([
        fetchProjects(),
        fetchProducts(),
        fetchKits(),
        fetchCustomers(),
        fetchTasks()
      ]);
      setProjects(proj);
      setProducts(prod);
      setKits(k.length > 0 ? k : DEFAULT_KITS);
      setCustomers(cust);
      setTasks(t);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProject = async (p: Project) => {
    await saveProject(p);
    await loadData();
  };

  const handleDeleteProject = async (id: string) => {
    if (confirm('Deseja realmente remover este projeto?')) {
      await deleteProject(id);
      await loadData();
    }
  };

  const handleSaveProduct = async (p: Product) => {
    await saveProduct(p);
    await loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    await loadData();
  };

  const handleSaveKit = async (k: Kit) => {
    await saveKit(k);
    await loadData();
  };

  const handleSaveCustomer = async (c: Customer) => {
    const res = await saveCustomer(c);
    await loadData();
    return res;
  };

  const handleSaveTask = async (t: Task) => {
    await saveTask(t);
    await loadData();
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <i className="fa-solid fa-bolt-lightning text-6xl text-red-600 animate-pulse transform -skew-x-12"></i>
          <p className="font-black uppercase tracking-[0.5em] text-[10px] text-gray-400">Sincronizando dados...</p>
        </div>
      </div>
    );
  }

  const showNav = !isPrinting && !location.pathname.includes('/proposal/');

  return (
    <div className={`min-h-screen ${isPrinting ? 'bg-white' : 'bg-gray-50'}`}>
      {showNav && (
        <nav className="no-print bg-gray-950 p-6 flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/5 sticky top-0 z-[1000] backdrop-blur-md bg-opacity-95">
          <Logo />
          <div className="flex flex-wrap justify-center gap-4">
            <NavTab to="/" label="Dashboard" icon="fa-chart-pie" active={location.pathname === '/'} />
            <NavTab to="/tasks" label="Operacional" icon="fa-list-check" active={location.pathname === '/tasks'} />
            <NavTab to="/products" label="Produtos" icon="fa-box-open" active={location.pathname === '/products'} />
            <NavTab to="/kits" label="Engenharia" icon="fa-gears" active={location.pathname === '/kits'} />
          </div>
          <div className="hidden lg:flex items-center gap-4 text-white/40 text-[9px] font-black uppercase tracking-widest">
            <div className="flex flex-col items-end">
              <span className="text-green-500 flex items-center gap-2">Online <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span></span>
              <span>v3.0 Production</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
              <i className="fa-solid fa-user-shield text-red-600"></i>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Dashboard projects={projects} onDelete={handleDeleteProject} />} />
        <Route path="/tasks" element={<TaskManager tasks={tasks} projects={projects} onSave={handleSaveTask} onDelete={handleDeleteTask} />} />
        <Route path="/products" element={<ProductManager products={products} onSave={handleSaveProduct} onDelete={handleDeleteProduct} />} />
        <Route path="/kits" element={<KitManager kits={kits} products={products} onSave={handleSaveKit} />} />
        <Route path="/project/:id" element={
          <ProjectEditor 
            projects={projects} 
            products={products} 
            kits={kits} 
            customers={customers} 
            onSave={handleSaveProject}
            onSaveCustomer={handleSaveCustomer}
            isPrinting={isPrinting}
            setIsPrinting={setIsPrinting}
          />
        } />
      </Routes>
    </div>
  );
};

export default App;
