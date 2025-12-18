
export enum ProjectStatus {
  DRAFT = 'Rascunho',
  CALCULATED = 'Calculado',
  SENT = 'Enviado',
  APPROVED = 'Aprovado'
}

export enum FloorType {
  GARAGEM = 'Garagem',
  PILOTIS = 'Pilotis',
  TIPO = 'Tipo',
  COBERTURA = 'Cobertura',
  SUBSOLO = 'Subsolo',
  TERREO = 'Térreo'
}

export interface Customer {
  id: string;
  nome: string;
  documento: string;
  contato: string;
  email: string;
  endereco: string;
  isLocal?: boolean;
}

export interface Product {
  id: string;
  nome: string;
  imagem?: string;
  preco: number;
  isLocal?: boolean;
}

export interface ManualItem {
  id: string;
  produtoNome: string;
  quantidade: number;
}

export interface InfraMeter {
  tipo: string; 
  metragem: number;
}

export interface Floor {
  id: string;
  nome: string;
  tipo: FloorType;
  referenciaPrancha: string;
  largura: number;
  comprimento: number;
  altura: number;
  itensCentrais: ManualItem[];
  infraestruturas: InfraMeter[];
}

export interface KitComponent {
  produtoId?: string;
  produtoNome: string;
  fatorConversao: number;
  unidade: 'UN' | 'M';
}

export interface Kit {
  id: string;
  nomeKit: string;
  tipoInfra: string; 
  percentualPerda: number;
  componentes: KitComponent[];
  ativo: boolean;
}

export interface BudgetItem {
  id: string;
  produtoNome: string;
  origem: 'manual' | 'calculado';
  qtdSistema: number;
  qtdFinal: number;
  custoUnitario: number;
  custoTotal: number;
}

export interface FinancialSummary {
  custoMateriais: number;
  bdiPercentual: number;
  bdiValor: number;
  margemLucroPercentual: number;
  margemLucroValor: number;
  descontoPercentual: number;
  descontoValor: number;
  precoVendaFinal: number;
}

export interface Project {
  id: string;
  cliente: string;
  clienteId?: string;
  obra: string;
  endereco: string;
  status: ProjectStatus;
  pavimentos: Floor[];
  condicoesPagamento: string; // Forma de Pagamento
  cronograma: string;         // Prazo de Entrega
  observacoes: string;
  validadeDias: number;
  orcamentoItens: BudgetItem[];
  financeiro: FinancialSummary;
  dataCriacao: string;
}
