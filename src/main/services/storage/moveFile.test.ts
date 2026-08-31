import type { randomUUID } from 'node:crypto'
import type { copyFile, rename, rm, unlink } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { type MoveFileOperations, moveFileSafely } from './moveFile'

function operations(): MoveFileOperations {
  return {
    rename: vi.fn() as unknown as typeof rename,
    copyFile: vi.fn() as unknown as typeof copyFile,
    unlink: vi.fn() as unknown as typeof unlink,
    rm: vi.fn().mockResolvedValue(undefined) as unknown as typeof rm,
    randomUUID: vi.fn().mockReturnValue('uuid') as unknown as typeof randomUUID
  }
}

describe('moveFileSafely', () => {
  it('usa rename no mesmo volume', async () => {
    const fs = operations()
    await moveFileSafely('source', 'destination', fs)
    expect(fs.rename).toHaveBeenCalledOnce()
    expect(fs.copyFile).not.toHaveBeenCalled()
  })

  it('faz fallback de EXDEV e remove a origem somente após finalizar', async () => {
    const fs = operations()
    vi.mocked(fs.rename).mockRejectedValueOnce(
      Object.assign(new Error('cross-device'), { code: 'EXDEV' })
    )
    await moveFileSafely('source', 'destination', fs)
    expect(fs.copyFile).toHaveBeenCalledWith('source', 'destination.part-uuid', expect.any(Number))
    expect(fs.rename).toHaveBeenLastCalledWith('destination.part-uuid', 'destination')
    expect(fs.unlink).toHaveBeenCalledWith('source')
  })

  it('preserva a origem e remove o temporário se a cópia falhar', async () => {
    const fs = operations()
    vi.mocked(fs.rename).mockRejectedValueOnce(
      Object.assign(new Error('cross-device'), { code: 'EXDEV' })
    )
    vi.mocked(fs.copyFile).mockRejectedValueOnce(new Error('disk full'))
    await expect(moveFileSafely('source', 'destination', fs)).rejects.toThrow('disk full')
    expect(fs.unlink).not.toHaveBeenCalled()
    expect(fs.rm).toHaveBeenCalledWith('destination.part-uuid', { force: true })
  })
})
