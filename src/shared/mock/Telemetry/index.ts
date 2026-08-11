// Mocks para simular a telemetria do RoveTrack

// 1. Simulando a etapa de Download (Ex: 45% concluído da primeira faixa)
export const mockTelemetryDownloading = {
  status: 'downloading',
  message: '  └─ 45.5% of 10.2MiB at 2.5MiB/s ETA 00:04',
  progress: 45.5,
  step: { current: 2, total: 4 },
  batch: { current: 1, total: 3 },
  report: { total: 3, succeeded: 0, failed: 0, errors: [], tracks: [] }
}

// 2. Simulando a etapa de Forja (Injetando metadados na segunda faixa de três)
export const mockTelemetryForging = {
  status: 'forging',
  message: '  └─ A injetar metadados ID3...',
  progress: 100,
  step: { current: 3, total: 4 },
  batch: { current: 2, total: 3 },
  metadata: {
    title: 'Linkin Park - Numb'
  },
  report: { total: 3, succeeded: 1, failed: 0, errors: [], tracks: [] }
}

// 3. Simulando o Sucesso Final (Tudo concluído)
export const mockTelemetrySuccess = {
  status: 'success',
  message: 'Expedição concluída com SUCESSO ABSOLUTO!',
  progress: 100,
  step: { current: 4, total: 4 },
  batch: { current: 3, total: 3 },
  report: { total: 3, succeeded: 3, failed: 0, errors: [], tracks: [] }
}

// 4. Simulando uma Falha Crítica (Erro de rede ou FFmpeg)
export const mockTelemetryError = {
  status: 'error',
  message: '[FALHA CRÍTICA] Timeout Crítico: A rede falhou.',
  progress: 0,
  step: { current: 2, total: 4 },
  batch: { current: 1, total: 1 },
  report: {
    total: 1,
    succeeded: 0,
    failed: 1,
    errors: [{ trackId: 'pipeline', reason: 'Timeout crítico: a rede falhou.' }],
    tracks: [{ trackId: 'pipeline', status: 'error' }]
  }
}
