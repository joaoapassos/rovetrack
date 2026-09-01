import { readFile } from 'node:fs/promises'
import type { ThumbnailOptions } from '@shared/contracts/media'
import sharp from 'sharp'

const dimensions = {
  '1:1': { width: 600, height: 600 },
  '16:9': { width: 1280, height: 720 }
} as const

const qualityValues = { best: 100, high: 90, medium: 75, low: 60 } as const

export async function formatThumbnail(
  inputPath: string,
  outputPath: string,
  options: ThumbnailOptions
): Promise<void> {
  const image = sharp(await readFile(inputPath)).resize({
    ...dimensions[options.aspectRatio],
    fit: 'cover',
    position: 'center'
  })
  const quality = qualityValues[options.quality]
  if (options.outputFormat === 'png') await image.png({ quality }).toFile(outputPath)
  else if (options.outputFormat === 'webp') await image.webp({ quality }).toFile(outputPath)
  else await image.jpeg({ quality }).toFile(outputPath)
}
