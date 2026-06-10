import { readJsonFile } from '@main/utils'

// Definimos uma interface temporária para o retorno do JSON do yt-dlp
interface YtInfoJson {
  title?: string
  uploader?: string
}

export async function extractMetadataFromJson(jsonPath: string, coverPath: string): Promise<TrackMetadata> {
  const infoData = await readJsonFile<YtInfoJson>(jsonPath)
  
  return {
    title: infoData.title || 'Título Desconhecido',
    artist: infoData.uploader || 'Artista Desconhecido',
    coverImagePath: coverPath
  }
}