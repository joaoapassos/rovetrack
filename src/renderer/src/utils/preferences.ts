export const readBooleanPreference = (key: string): boolean => localStorage.getItem(key) !== 'false'

export const readVolumePreference = (): number => {
  const rawVolume = localStorage.getItem('rovetrack:notification-volume')
  const savedVolume = Number(rawVolume)
  if (
    rawVolume !== null &&
    Number.isFinite(savedVolume) &&
    savedVolume >= 0 &&
    savedVolume <= 100
  ) {
    return savedVolume
  }
  return readBooleanPreference('rovetrack:sound') ? 50 : 0
}

export const readLastAudibleVolume = (currentVolume: number): number => {
  const rawVolume = localStorage.getItem('rovetrack:last-audible-volume')
  const savedVolume = Number(rawVolume)
  if (rawVolume !== null && Number.isFinite(savedVolume) && savedVolume > 0 && savedVolume <= 100) {
    return savedVolume
  }
  return currentVolume > 0 ? currentVolume : 50
}
