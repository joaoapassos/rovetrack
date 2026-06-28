/**
 * Representa o estado atualizado da máquina de extração.
 */
declare interface PipelineState {
    /**
     * Status geral para controlar a cor da UI e os Loaders
     */
    status: 'idle' | 'preparing' | 'downloading' | 'forging' | 'success' | 'error'
    
    /**
     * A mensagem atual de log
     */
    message: string
    
    /**
     * Progresso de download 0 a 100
     */
    progress: number,
    
    /**
     * Controle de Etapas do motor
     */
    step: {
        current: number
        total: number
    }
    
    /**
     * Controle de Playlist
     */
    batch: {
        current: number
        total: number
    }
    
    /**
     * Detalhes extras, como o nome da música se ocorrer algum erro ou sucesso
     */
    metadata?: {
        title?: string
    }
}