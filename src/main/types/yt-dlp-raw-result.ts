/**
 * Representa o estado temporário e os artefatos brutos gerados logo após o download do YouTube.
 * Este contrato é de uso estrito do Back-end (main) e mapeia os ficheiros 
 * que estão na área de trabalho temporária antes de serem processados, limpos e carimbados.
 */
export interface YtDlpRawResult {
  /**
   * O identificador base comum a todos os ficheiros baixados deste vídeo específico.
   * Usado para localizar com precisão a imagem, o áudio e o JSON correspondentes na pasta.
   * @example "rovetrack_temp_aB1cD2eF3g"
   */
  baseName: string

  /**
   * O caminho absoluto para o ficheiro JSON temporário que contém os metadados nativos extraídos pelo yt-dlp.
   * @example "C:/Users/Nome/Downloads/RoveTrack/rovetrack_temp_aB1cD2eF3g.info.json"
   */
  infoPath: string

  /**
   * O caminho absoluto para o ficheiro de áudio bruto recém-extraído (ainda limpo, sem as tags ID3).
   * @example "C:/Users/Nome/Downloads/RoveTrack/rovetrack_temp_aB1cD2eF3g.mp3"
   */
  mp3Path: string

  /**
   * O caminho absoluto para a miniatura original descarregada. 
   * Geralmente em proporção retangular 16:9 e frequentemente no formato .webp.
   * @example "C:/Users/Nome/Downloads/RoveTrack/rovetrack_temp_aB1cD2eF3g.webp"
   */
  imagePath: string
}