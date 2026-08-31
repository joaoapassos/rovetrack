import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

export async function formatCoverImage(inputPath: string, outputPath: string): Promise<void> {
  const imageBuffer = await readFile(inputPath)
  await sharp(imageBuffer)
    .resize({ width: 600, height: 600, fit: 'cover', position: 'center' })
    .jpeg({ quality: 100 })
    .toFile(outputPath)
}
