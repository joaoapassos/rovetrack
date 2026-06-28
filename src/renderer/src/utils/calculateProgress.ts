/**
 * Calcula uma percentagem de progresso linear (0-100%) para a interface do utilizador,
 * baseada no estado atual da expedição (pipeline).
 * 
 * A lógica divide o progresso total em 4 etapas lógicas:
 * 1. Preparação (Workspace): 0% - 5%
 * 2. Download (Em lote): 5% - 50%
 * 3. Forja (Processamento de cada faixa): 50% - 95%
 * 4. Limpeza e Finalização: 95% - 100%
 *
 * @param state O estado atual da pipeline (PipelineState) enviado pelo motor.
 * @returns Um número entre 0 e 100 representando a barra de progresso visual.
 */
export const calculateGlobalProgress = (state: PipelineState | null): number => {
  // Se o estado for nulo, ainda não iniciámos
  if (!state) return 0;
  
  // Estados terminais preenchem a barra
  if (state.status === 'success') return 100;
  if (state.status === 'error') return 100;

  const { step, batch, progress } = state;
  // Prevenção de erro matemático caso o total de faixas seja zero
  const safeTotalBatch = Math.max(batch.total, 1); 

  // Etapa 1: Preparação do Workspace (0% -> 5%)
  if (step.current === 1) return 5;
  
  // Etapa 2: Downloads (5% -> 50%)
  // O progresso aqui é a soma do índice da faixa atual + a percentagem de download dessa faixa
  if (step.current === 2) {
    const currentItemIndex = Math.max(0, batch.current - 1);
    const currentItemProgress = (progress || 0) / 100;
    // Calcula a fração de conclusão baseada no número total de ficheiros
    const batchFraction = (currentItemIndex + currentItemProgress) / safeTotalBatch;
    return 5 + (45 * batchFraction);
  }
  
  // Etapa 3: Forja ID3 e Capas (50% -> 95%)
  if (step.current === 3) {
    // Calculamos o progresso baseado em quantas faixas já foram totalmente forjadas
    const batchFraction = batch.current / safeTotalBatch;
    return 50 + (45 * batchFraction);
  }
  
  // Etapa 4: Limpeza e Transferência (95% -> 100%)
  if (step.current === 4) return 95;

  return 0;
}