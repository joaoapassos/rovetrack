import type { PipelineReport } from '@shared/contracts/pipeline'
import { Download, History, Menu } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  HashRouter,
  Navigate,
  Outlet,
  type RouteObject,
  useLocation,
  useNavigate,
  useRoutes
} from 'react-router-dom'
import { DownloadPage } from './App'
import { HistoryModal } from './components/HistoryModal'
import { ReportModal } from './components/ReportModal'
import { AboutPage } from './pages/AboutPage'
import { ConfigPage } from './pages/ConfigPage'
import { HistoryPage } from './pages/HistoryPage'
import { OptionsLayout } from './pages/OptionsLayout'
import { TermsPage } from './pages/TermsPage'
import { AppSettingsProvider } from './settings/AppSettingsContext'
import {
  getDownloadTelemetry,
  publishDownloadTelemetry,
  subscribeDownloadActivity
} from './state/downloadActivity'
import { calculateGlobalProgress } from './utils'

function RootLayout(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [telemetry, setTelemetry] = useState(getDownloadTelemetry)
  const [pending, setPending] = useState(false)
  const acknowledgedRunRef = useRef<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<PipelineReport | null>(null)
  const isOptions = location.pathname.startsWith('/options')
  const isActive = ['preparing', 'downloading', 'forging'].includes(telemetry?.status ?? '')
  const progress = calculateGlobalProgress(telemetry)

  useEffect(() => {
    const unsubscribeTelemetry = window.api.onPipelineTelemetry(publishDownloadTelemetry)
    const unsubscribeActivity = subscribeDownloadActivity(setTelemetry)
    const openHistory = () => setIsHistoryOpen(true)
    window.addEventListener('rovetrack:open-history', openHistory)
    return () => {
      unsubscribeTelemetry()
      unsubscribeActivity()
      window.removeEventListener('rovetrack:open-history', openHistory)
    }
  }, [])

  useEffect(() => {
    const isTerminal =
      telemetry && ['success', 'partial', 'interrupted', 'error'].includes(telemetry.status)
    if (!isOptions) {
      setPending(false)
      if (isTerminal) acknowledgedRunRef.current = telemetry.runId
      return
    }
    if (isTerminal && acknowledgedRunRef.current !== telemetry.runId) {
      setPending(true)
      acknowledgedRunRef.current = telemetry.runId
    }
  }, [isOptions, telemetry])

  return (
    <>
      <nav className="fixed left-5 top-5 z-40 flex gap-2" aria-label="Navegação principal">
        <button
          type="button"
          title={
            isOptions
              ? `Voltar para a tela de download${pending ? ' — há uma conclusão pendente' : ''}`
              : 'Ir para a área de opções'
          }
          aria-label={isOptions ? 'Voltar para a tela de download' : 'Ir para a área de opções'}
          onClick={() => navigate(isOptions ? '/' : '/options/config')}
          className="relative flex h-10 w-10 cursor-pointer items-center justify-center overflow-visible border border-[#32363f] bg-[#222222] text-[#a0a4a8] transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
        >
          {isOptions ? (
            <span className="relative h-5 w-5" aria-hidden="true">
              <Download className="absolute inset-0 h-5 w-5" />
              {isActive && (
                <span
                  className="absolute inset-x-0 bottom-0 overflow-hidden text-[#A2ECFB] transition-[height] duration-300"
                  style={{ height: `${Math.max(4, progress)}%` }}
                >
                  <Download className="absolute bottom-0 left-0 h-5 w-5" />
                </span>
              )}
            </span>
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
          {isOptions && pending && !isActive && (
            <span
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#222222] bg-[#A2ECFB]"
              title="Download concluído ou pendente de revisão"
            >
              <span className="sr-only">Download concluído ou pendente de revisão</span>
            </span>
          )}
        </button>
        <button
          type="button"
          title="Abrir histórico de downloads"
          aria-label="Abrir histórico de downloads"
          onClick={() => setIsHistoryOpen(true)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center border border-[#32363f] bg-[#222222] text-[#a0a4a8] transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
        >
          <History className="h-5 w-5" aria-hidden="true" />
        </button>
      </nav>
      <Outlet />
      <HistoryModal
        open={isHistoryOpen}
        isProcessing={isActive}
        onClose={() => setIsHistoryOpen(false)}
        onRetry={(entry) => {
          setIsHistoryOpen(false)
          navigate('/', { state: { retryRequest: entry.request } })
        }}
        onViewReport={(report) => {
          setIsHistoryOpen(false)
          setSelectedReport(report)
        }}
      />
      {selectedReport && (
        <ReportModal
          open
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onOpenHistory={() => {
            setSelectedReport(null)
            setIsHistoryOpen(true)
          }}
        />
      )}
    </>
  )
}

export function AppRouter(): React.JSX.Element {
  return (
    <AppSettingsProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppSettingsProvider>
  )
}

export const APP_ROUTES: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <DownloadPage /> },
      {
        path: 'options',
        element: <OptionsLayout />,
        children: [
          { index: true, element: <Navigate to="config" replace /> },
          { path: 'config', element: <ConfigPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'about', element: <AboutPage /> },
          { path: 'terms', element: <TermsPage /> }
        ]
      },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]

export function AppRoutes(): React.JSX.Element | null {
  return useRoutes(APP_ROUTES)
}
