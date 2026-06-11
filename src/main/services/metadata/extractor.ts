import { readJsonFile } from '@main/utils'

/**
 * Contrato temporário e privado para tipar as chaves específicas que
 * extraímos do enorme JSON gerado pelo yt-dlp.
 */
interface YtInfoJson {
  title?: string
  uploader?: string
}

/**
 * Lê o ficheiro de metadados bruto do YouTube, filtra as informações irrelevantes
 * e constrói o Payload padronizado que será usado para a estampa ID3.
 *
 * @param jsonPath Caminho absoluto do arquivo .info.json gerado no workspace.
 * @param coverPath Caminho absoluto da imagem de capa já processada.
 * @returns Um objeto TrackMetadata perfeitamente estruturado.
 */
export async function extractMetadataFromJson(jsonPath: string, coverPath: string): Promise<TrackMetadata> {
  const infoData = await readJsonFile<YtInfoJson>(jsonPath)
  
  return {
    title: infoData.title || 'Título Desconhecido',
    artist: infoData.uploader || 'Artista Desconhecido',
    coverImagePath: coverPath
  }
}