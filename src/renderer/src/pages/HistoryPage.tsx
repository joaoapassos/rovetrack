import type { PipelineReport } from '@shared/contracts/pipeline'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HistoryList } from '../components/HistoryList'
import { ReportModal } from '../components/ReportModal'
import { getDownloadTelemetry, subscribeDownloadActivity } from '../state/downloadActivity'

export function HistoryPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [report, setReport] = useState<PipelineReport | null>(null)
  const [telemetry, setTelemetry] = useState(getDownloadTelemetry)
  const isProcessing = ['preparing', 'downloading', 'forging'].includes(telemetry?.status ?? '')

  useEffect(() => subscribeDownloadActivity(setTelemetry), [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col items-center gap-4 text-center">
        <div>
          <h2 className="text-2xl font-bold">Histórico</h2>
          <p className="mt-2 text-sm text-[#a0a4a8]">
            Todas as operações armazenadas neste dispositivo.
          </p>
        </div>
        <Link
          title="Ir para as opções de backup"
          to="/config#backup"
          className="border border-[#414853] px-4 py-2 text-xs font-bold uppercase text-[#A2ECFB] transition-colors hover:border-[#A2ECFB]"
        >
          Dados / Backup
        </Link>
      </div>
      <HistoryList
        isProcessing={isProcessing}
        onRetry={(entry) => navigate('/', { state: { retryRequest: entry.request } })}
        onViewReport={(entry) => setReport(entry.report)}
      />
      {report && (
        <ReportModal
          open
          report={report}
          onClose={() => setReport(null)}
          onOpenHistory={() => setReport(null)}
        />
      )}
    </div>
  )
}
