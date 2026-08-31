import type { PipelineReportError } from '@shared/contracts/pipeline'

export class LineBuffer {
  private remainder = ''

  push(chunk: string): string[] {
    const parts = `${this.remainder}${chunk}`.split(/\r?\n/)
    this.remainder = parts.pop() ?? ''
    return parts
  }

  flush(): string[] {
    const line = this.remainder
    this.remainder = ''
    return line ? [line] : []
  }
}

export function normaliseYtDlpError(line: string): string {
  return line.replace(/^ERROR:\s*/i, '').trim()
}

export function extractVideoId(line: string): string | undefined {
  return line.match(/\[(?:youtube|youtu\.be)\]\s+([\w-]{6,}):/i)?.[1]
}

export function parseProgress(line: string): number | undefined {
  const value = line.match(/\[download\]\s+([\d.]+)%/)?.[1]
  return value ? Number.parseFloat(value) : undefined
}

export function parsePlaylistPosition(
  line: string
): { current: number; total: number } | undefined {
  const match = line.match(/Downloading item (\d+) of (\d+)/)
  if (!match) return undefined
  return {
    current: Number.parseInt(match[1], 10),
    total: Number.parseInt(match[2], 10)
  }
}

export function parseWarning(line: string): string | undefined {
  if (!/^WARNING:/i.test(line.trim())) return undefined
  return line.replace(/^WARNING:\s*/i, '').trim()
}

interface InterpretedError {
  reason: string
  category: NonNullable<PipelineReportError['category']>
  suggestion: string
  retryable: boolean
}

export function classifyYtDlpError(rawReason: string): InterpretedError {
  const reason = rawReason.toLowerCase()

  if (/http error 403|forbidden|po token/.test(reason)) {
    return {
      reason: 'O YouTube recusou o acesso ao ficheiro de áudio desta faixa (HTTP 403).',
      category: 'access',
      suggestion:
        'A playlist continuará. Se a tentativa individual também falhar, atualize o yt-dlp e tente novamente.',
      retryable: true
    }
  }

  if (/sign in|login required|confirm your age|age.restrict|cookies/.test(reason)) {
    return {
      reason: 'Esta faixa exige autenticação ou confirmação de idade no YouTube.',
      category: 'authentication',
      suggestion:
        'Abra o vídeo no navegador para confirmar a restrição. As outras faixas continuarão normalmente.',
      retryable: false
    }
  }

  if (/private video|members.only|premium|not available|unavailable|removed/.test(reason)) {
    return {
      reason: 'Esta faixa está privada, removida ou indisponível para a sua região/conta.',
      category: 'availability',
      suggestion: 'Confirme se o vídeo abre normalmente no navegador.',
      retryable: false
    }
  }

  if (/http error 429|too many requests|rate.?limit/.test(reason)) {
    return {
      reason: 'O YouTube limitou temporariamente a quantidade de pedidos desta conexão (HTTP 429).',
      category: 'network',
      suggestion: 'Aguarde alguns minutos antes de repetir.',
      retryable: true
    }
  }

  if (/timed? out|timeout|connection|network|temporary failure|remote end closed/.test(reason)) {
    return {
      reason: 'A ligação foi interrompida durante o download desta faixa.',
      category: 'network',
      suggestion: 'Verifique a conexão e tente novamente.',
      retryable: true
    }
  }

  if (/requested format|no video formats|only images/.test(reason)) {
    return {
      reason: 'O YouTube não disponibilizou um formato de áudio compatível para esta faixa.',
      category: 'availability',
      suggestion: 'Atualize o yt-dlp e tente novamente.',
      retryable: true
    }
  }

  return {
    reason: 'O yt-dlp não conseguiu descarregar esta faixa.',
    category: 'unknown',
    suggestion: 'Consulte os detalhes técnicos. A falha foi isolada das outras faixas.',
    retryable: true
  }
}
