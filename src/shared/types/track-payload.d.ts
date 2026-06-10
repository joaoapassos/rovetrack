/**
 * Representa o contrato de entrada principal (Payload) para o motor do RoveTrack.
 * Contém as diretrizes mínimas necessárias para iniciar a expedição de download
 * e forja de um arquivo de áudio.
 */
declare interface TrackPayload {
  /**
   * O link bruto fornecido pelo usuário.
   * @example "https://www.youtube.com/watch?v=..."
   */
  url: string

  /**
   * O caminho absoluto do diretório no sistema de arquivos local onde 
   * o arquivo resultante (.mp3) será salvo após o processamento.
   * @example "C:/Users/Nome/Downloads/RoveTrack"
   */
  outputDir: string

  /**
   *  Representa os metadados da faixa de áudio que podem ser enviados no payload.
   */
  metadata?: TrackMetadata
}