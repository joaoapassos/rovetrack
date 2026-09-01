import type { PipelineReport } from '@shared/contracts/pipeline'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HistoryModal } from '../components/HistoryModal'
import { ReportModal } from '../components/ReportModal'

export function HistoryPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [report, setReport] = useState<PipelineReport | null>(null)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Histórico</h2>
          <p className="text-sm text-[#a0a4a8]">
            Todas as operações armazenadas neste dispositivo.
          </p>
        </div>
        <Link
          title="Ir para as opções de backup"
          to="/options/config#backup"
          className="text-xs font-bold uppercase text-[#A2ECFB]"
        >
          Dados / Backup
        </Link>
      </div>
      <HistoryModal
        open
        variant="page"
        isProcessing={false}
        onClose={() => undefined}
        onRetry={(entry) => navigate('/', { state: { retryRequest: entry.request } })}
        onViewReport={setReport}
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
