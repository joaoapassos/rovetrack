import { readFileToBuffer } from '@main/utils'
import sharp from 'sharp'

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
    console.error('[formatCoverImage] Erro estrutural ao processar a imagem:', error)
    throw error
  }
}