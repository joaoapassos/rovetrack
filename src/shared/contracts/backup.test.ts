import { describe, expect, it } from 'vitest'
import { backupSchema } from './backup'
import { cloneDefaultSettings } from './settings'

describe('backupSchema', () => {
  it('aceita exportação seletiva e rejeita backup vazio ou desconhecido', () => {
    const base = {
      format: 'rovetrack-backup',
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      applicationVersion: 'test'
    }
    expect(
      backupSchema.safeParse({ ...base, sections: { settings: cloneDefaultSettings() } }).success
    ).toBe(true)
    expect(backupSchema.safeParse({ ...base, sections: { history: [] } }).success).toBe(true)
    expect(backupSchema.safeParse({ ...base, sections: {} }).success).toBe(false)
    expect(backupSchema.safeParse({ ...base, sections: {}, executable: 'rm -rf' }).success).toBe(
      false
    )
  })
})
