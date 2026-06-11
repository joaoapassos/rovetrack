import { readdir } from 'node:fs/promises'

/**
 * Localiza o ficheiro de imagem de capa original baixado pelo yt-dlp.
 * Funciona por eliminação: procura ficheiros que começam com o ID do vídeo, 
 * mas ignora as extensões conhecidas de áudio (.mp3) e os metadados JSON.
 * * @param dir O caminho da pasta onde ocorreu o download.
 * @param baseName O prefixo base do ficheiro (ex: "rovetrack_temp_aB1cD2eF3g").
 * @param ignoreJson O nome completo do ficheiro JSON que deve ser ignorado na busca.
 * @returns O nome do ficheiro de imagem encontrado (ex: "rovetrack_temp_aB1cD2eF3g.webp"), ou undefined se não existir.
 */
export async function findCoverImage(dir: string, baseName: string, ignoreJson: string): Promise<string | undefined> {
  const files = await readdir(dir)
  return files.find(f => f.startsWith(baseName) && f !== ignoreJson && !f.endsWith('.mp3'))
}