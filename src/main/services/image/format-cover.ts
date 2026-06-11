import { readFileToBuffer } from '@main/utils'
import sharp from 'sharp'

/**
 * Processa a miniatura original do vídeo (frequentemente retangular e em .webp),
 * aplicando um recorte perfeitamente centralizado em formato quadrado (1:1).
 * Toda a operação de leitura é feita via Buffer de memória para evitar lock (EBUSY) no disco.
 *
 * @param inputPath Caminho absoluto da imagem bruta original baixada.
 * @param outputPath Caminho absoluto de onde o arquivo .jpeg final deve ser salvo.
 * @returns Uma Promise resolvida após a gravação da nova imagem formatada.
 * @throws {Error} Caso a imagem bruta esteja corrompida ou ilegível.
 */
export async function formatCoverImage(inputPath: string, outputPath: string): Promise<void> {
  try {
    const imageBuffer = await readFileToBuffer(inputPath)
    
    await sharp(imageBuffer)
      .resize({
        width: 600,
        height: 600,
        fit: 'cover',
        position: 'center'
      })
      .toFormat('jpeg', { quality: 100 })
      .toFile(outputPath)
  } catch (error) {
    console.error('[image.formatCoverImage] Erro estrutural ao processar a imagem:', error)
    throw error
  }
}