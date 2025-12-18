
import { Project, Product, Kit, BudgetItem, FinancialSummary } from '../types';

export const calculateComposition = (
  project: Project, 
  catalog: Product[], 
  kits: Kit[]
): { items: BudgetItem[], financial: FinancialSummary } => {
  const itemsMap: Map<string, BudgetItem> = new Map();

  // B.1 - Itens Centrais (Manual)
  project.pavimentos.forEach(floor => {
    floor.itensCentrais.forEach(item => {
      // Busca preço atualizado do catálogo pelo nome
      const product = catalog.find(p => p.nome === item.produtoNome);
      const unitPrice = product?.preco || 0;
      
      const existing = itemsMap.get(item.produtoNome);
      if (existing) {
        existing.qtdSistema += item.quantidade;
        existing.qtdFinal += item.quantidade;
        existing.custoTotal = existing.qtdFinal * existing.custoUnitario;
      } else {
        itemsMap.set(item.produtoNome, {
          id: Math.random().toString(36).substr(2, 9),
          produtoNome: item.produtoNome,
          origem: 'manual',
          qtdSistema: item.quantidade,
          qtdFinal: item.quantidade,
          custoUnitario: unitPrice,
          custoTotal: item.quantidade * unitPrice
        });
      }
    });
  });

  // B.2 - Infraestrutura (Calculado)
  const infraTotals = new Map<string, number>();
  project.pavimentos.forEach(floor => {
    floor.infraestruturas.forEach(infra => {
      infraTotals.set(infra.tipo, (infraTotals.get(infra.tipo) || 0) + infra.metragem);
    });
  });

  infraTotals.forEach((totalMeters, type) => {
    const kit = kits.find(k => k.tipoInfra === type && k.ativo);
    if (kit) {
      kit.componentes.forEach(comp => {
        // Busca preço atualizado do catálogo pelo nome
        const product = catalog.find(p => p.nome === comp.produtoNome);
        const unitPrice = product?.preco || 0;
        
        const baseQty = totalMeters * comp.fatorConversao;
        const qtyWithLoss = baseQty * (1 + (kit.percentualPerda / 100));
        const finalQty = Math.ceil(qtyWithLoss);

        const existing = itemsMap.get(comp.produtoNome);
        if (existing) {
          existing.qtdSistema += finalQty;
          existing.qtdFinal += finalQty;
          existing.custoTotal = existing.qtdFinal * existing.custoUnitario;
        } else {
          itemsMap.set(comp.produtoNome, {
            id: Math.random().toString(36).substr(2, 9),
            produtoNome: comp.produtoNome,
            origem: 'calculado',
            qtdSistema: finalQty,
            qtdFinal: finalQty,
            custoUnitario: unitPrice,
            custoTotal: finalQty * unitPrice
          });
        }
      });
    }
  });

  const allItems = Array.from(itemsMap.values());
  const materialCost = allItems.reduce((acc, item) => acc + item.custoTotal, 0);

  // Recalcula Financeiro
  const financial = updateFinancialTotals({
    ...project.financeiro,
    custoMateriais: materialCost
  });

  return {
    items: allItems,
    financial: financial
  };
};

export const updateFinancialTotals = (fin: FinancialSummary): FinancialSummary => {
  const bdiVal = fin.custoMateriais * (fin.bdiPercentual / 100);
  const subtotal = fin.custoMateriais + bdiVal;
  const profitVal = subtotal * (fin.margemLucroPercentual / 100);
  const basePrice = subtotal + profitVal;
  
  // Aplica desconto
  const finalPrice = basePrice - (fin.descontoValor || 0);

  return {
    ...fin,
    bdiValor: bdiVal,
    margemLucroValor: profitVal,
    precoVendaFinal: finalPrice > 0 ? finalPrice : 0
  };
};
