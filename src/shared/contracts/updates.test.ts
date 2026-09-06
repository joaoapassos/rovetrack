import { describe, expect, it } from 'vitest'
import {
  componentIdSchema,
  DEFAULT_UPDATE_SETTINGS,
  updateSettingsSchema,
  ytDlpChannelSchema
} from './updates'

describe('contratos de atualização', () => {
  it('usa managed e autoInstall desligado por padrão', () => {
    expect(DEFAULT_UPDATE_SETTINGS).toMatchObject({
      mode: 'managed',
      advanced: { ytDlp: { channel: 'nightly', autoInstall: false } }
    })
  })

  it('aceita somente modos, canais e componente conhecidos', () => {
    expect(updateSettingsSchema.safeParse(DEFAULT_UPDATE_SETTINGS).success).toBe(true)
    expect(ytDlpChannelSchema.safeParse('custom').success).toBe(false)
    expect(componentIdSchema.safeParse('ffmpeg').success).toBe(false)
    expect(componentIdSchema.safeParse('../../arquivo').success).toBe(false)
    expect(
      updateSettingsSchema.safeParse({
        ...DEFAULT_UPDATE_SETTINGS,
        releaseUrl: 'https://evil.test'
      }).success
    ).toBe(false)
  })
})
