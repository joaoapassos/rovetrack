import type { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    
    api: {
      /**
       * Abre a caixa de diálogo nativa do sistema operacional para seleção de diretórios.
       * @returns Uma Promise com o caminho (path) absoluto da pasta selecionada, ou null se o usuário cancelar.
       */
      selectFolder: () => Promise<string | null>
      
      /**
       * Envia as coordenadas (link e destino) para o motor Node.js iniciar a forja do áudio.
       * @param payload O objeto TrackPayload contendo a url e o diretório de saída.
       * @returns Uma Promise resolvida quando todo o pipeline de processamento é finalizado.
       */
      processAudio: (payload: TrackPayload) => Promise<void>

      /**
       * Permite ao React registar uma função para escutar a telemetria do back-end em tempo real.
       */
      onPipelineTelemetry: (callback: (state: PipelineState) => void) => void
    }
  }
}