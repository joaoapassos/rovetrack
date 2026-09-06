import {
  CircleArrowUp,
  Download,
  History,
  Home,
  Info,
  Menu,
  ScrollText,
  Settings,
  X
} from 'lucide-react'
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
import notificationSound from './assets/notification.mp3'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './components/DropdownMenu'
import { AboutPage } from './pages/AboutPage'
import { ConfigPage } from './pages/ConfigPage'
import { HistoryPage } from './pages/HistoryPage'
import { TermsPage } from './pages/TermsPage'
import { AppSettingsProvider, useAppSettings } from './settings/AppSettingsContext'
import {
  getDownloadTelemetry,
  publishDownloadTelemetry,
  subscribeDownloadActivity
} from './state/downloadActivity'
import { calculateGlobalProgress } from './utils'

const menuItems = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/history', label: 'Histórico', icon: History },
  { to: '/config', label: 'Configuração', icon: Settings },
  { to: '/about', label: 'Sobre', icon: Info },
  { to: '/terms', label: 'Termos', icon: ScrollText }
] as const

function RootLayout(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [telemetry, setTelemetry] = useState(getDownloadTelemetry)
  const { settings, updateState } = useAppSettings()
  const notificationVolumeRef = useRef(settings.notifications.volume)
  const lastNotifiedRunIdRef = useRef<string | null>(null)
  const isHome = location.pathname === '/'
  const isActive = ['preparing', 'downloading', 'forging'].includes(telemetry?.status ?? '')
  const progress = calculateGlobalProgress(telemetry)

  useEffect(() => {
    const unsubscribeTelemetry = window.api.onPipelineTelemetry(publishDownloadTelemetry)
    const unsubscribeActivity = subscribeDownloadActivity(setTelemetry)
    return () => {
      unsubscribeTelemetry()
      unsubscribeActivity()
    }
  }, [])

  useEffect(() => {
    notificationVolumeRef.current = settings.notifications.volume
  }, [settings.notifications.volume])

  useEffect(() => {
    if (
      !telemetry ||
      !['success', 'partial', 'interrupted', 'error'].includes(telemetry.status) ||
      lastNotifiedRunIdRef.current === telemetry.runId
    ) {
      return
    }

    lastNotifiedRunIdRef.current = telemetry.runId
    if (notificationVolumeRef.current === 0) return

    const audio = new Audio(notificationSound)
    audio.volume = notificationVolumeRef.current / 100
    audio.play().catch(console.error)
  }, [telemetry])

  return (
    <>
      <nav
        className="fixed left-5 top-5 z-40 flex items-center gap-2"
        aria-label="Navegação principal"
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
              aria-label={menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
              className="flex h-10 w-10 items-center justify-center border border-[#32363f] bg-[#222222] text-[#a0a4a8] shadow-lg transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <div className="border-b border-[#32363f] px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#A2ECFB]">
                Rovetrack
              </p>
              <p className="mt-1 text-xs text-[#6f767d]">Navegação</p>
            </div>
            <div className="p-2">
              {menuItems.map(({ to, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={to}
                  title={`Ir para ${label}`}
                  onSelect={() => navigate(to)}
                  className={`flex cursor-pointer items-center gap-3 border-l-2 px-3 py-2.5 text-xs font-bold uppercase transition-colors ${
                    location.pathname === to
                      ? 'border-[#A2ECFB] bg-[#1b1b1f] text-[#A2ECFB]'
                      : 'border-transparent text-[#a0a4a8] hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  {to === '/config' && updateState?.hasAvailableUpdate && (
                    <span
                      className="ml-auto h-2 w-2 rounded-full bg-[#A2ECFB]"
                      title="Atualização disponível"
                    />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        {updateState?.hasAvailableUpdate && (
          <button
            type="button"
            title="Abrir configurações de atualizações"
            aria-label="Atualização disponível; abrir configurações"
            onClick={() => navigate('/config?section=updates')}
            className="flex h-10 w-10 animate-pulse items-center justify-center border border-[#A2ECFB] bg-[#222222] text-[#A2ECFB] shadow-lg transition-colors hover:bg-[#A2ECFB]/10"
          >
            <CircleArrowUp className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </nav>

      <Outlet />
{/* !isHome && isActive */}
      { true && (
        <button
          type="button"
          title={`Voltar ao download em andamento — ${Math.round(progress)}% concluído`}
          aria-label={`Voltar ao download em andamento, ${Math.round(progress)}% concluído`}
          onClick={() => navigate('/')}
          className="fixed bottom-5 left-5 z-40 flex h-15 w-15 items-center justify-center rounded-full border border-[#414853] bg-[#222222] text-[#a0a4a8] shadow-2xl transition-all hover:scale-105 hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
        >
          <svg
            className="absolute inset-1 h-12 w-12 -rotate-90"
            viewBox="0 0 36 36"
            aria-hidden="true"
          >
            <circle
              cx="17"
              cy="19"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeWidth="2"
            />
            <circle
              cx="17"
              cy="19"
              r="16"
              fill="none"
              pathLength="100"
              stroke="#A2ECFB"
              strokeDasharray="100"
              strokeDashoffset={100 - progress}
              strokeLinecap="round"
              strokeWidth="2"
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
          <span className="relative h-5 w-5 animate-pulse" aria-hidden="true">
            <Download className="absolute inset-0 h-5 w-5" />
            <span
              className="absolute inset-x-0 bottom-0 overflow-hidden text-[#A2ECFB] transition-[height] duration-300"
              style={{ height: `${Math.max(5, progress)}%` }}
            >
              <Download className="absolute bottom-0 left-0 h-5 w-5" />
            </span>
          </span>
        </button>
      )}
    </>
  )
}

function ContentLayout(): React.JSX.Element {
  return (
    <main className="flex min-h-screen justify-center bg-[#1b1b1f] px-5 pb-16 pt-24 text-[#f8f8f8] sm:px-8">
      <div className="w-full max-w-4xl">
        <header className="mb-10 border-b border-[#32363f] pb-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#A2ECFB]">Rovetrack</p>
        </header>
        <Outlet />
      </div>
    </main>
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
        element: <ContentLayout />,
        children: [
          { path: 'history', element: <HistoryPage /> },
          { path: 'config', element: <ConfigPage /> },
          { path: 'about', element: <AboutPage /> },
          { path: 'terms', element: <TermsPage /> }
        ]
      },
      { path: 'options', element: <Navigate to="/config" replace /> },
      { path: 'options/config', element: <Navigate to="/config" replace /> },
      { path: 'options/history', element: <Navigate to="/history" replace /> },
      { path: 'options/about', element: <Navigate to="/about" replace /> },
      { path: 'options/terms', element: <Navigate to="/terms" replace /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
]

export function AppRoutes(): React.JSX.Element | null {
  return useRoutes(APP_ROUTES)
}
