import { readFileSync } from 'node:fs'
import sharp from 'sharp'

export async function createSquareCover(inputPath: string, outputPath: string): Promise<void> {
  try {
    // 1. Lê o arquivo para a memória (Buffer)
    const imageBuffer = readFileSync(inputPath)

    // 2. O Sharp processa a partir da memória, deixando o arquivo físico livre
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
    console.error('[ImageProcessor] Erro estrutural ao processar a imagem:', error)
    throw error
  }
}