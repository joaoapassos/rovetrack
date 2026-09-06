import { Download, History, Home, Info, Menu, ScrollText, Settings, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  HashRouter,
  Navigate,
  NavLink,
  Outlet,
  type RouteObject,
  useLocation,
  useNavigate,
  useRoutes
} from 'react-router-dom'
import { DownloadPage } from './App'
import { AboutPage } from './pages/AboutPage'
import { ConfigPage } from './pages/ConfigPage'
import { HistoryPage } from './pages/HistoryPage'
import { TermsPage } from './pages/TermsPage'
import { AppSettingsProvider } from './settings/AppSettingsContext'
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
  const menuRef = useRef<HTMLElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [telemetry, setTelemetry] = useState(getDownloadTelemetry)
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
    if (!menuOpen) return

    const closeMenu = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('pointerdown', closeMenu)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeMenu)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [menuOpen])

  return (
    <>
      <nav ref={menuRef} className="fixed left-5 top-5 z-40" aria-label="Navegação principal">
        <button
          type="button"
          title={menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
          aria-label={menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation-menu"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center border border-[#32363f] bg-[#222222] text-[#a0a4a8] shadow-lg transition-colors hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
        >
          {menuOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {menuOpen && (
          <div
            id="main-navigation-menu"
            className="absolute left-0 top-12 w-56 overflow-hidden border border-[#414853] bg-[#222222] shadow-2xl"
          >
            <div className="border-b border-[#32363f] px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#A2ECFB]">
                RoveTrack
              </p>
              <p className="mt-1 text-xs text-[#6f767d]">Navegação</p>
            </div>
            <ul className="p-2">
              {menuItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    title={`Ir para ${label}`}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive: active }) =>
                      `flex items-center gap-3 border-l-2 px-3 py-2.5 text-xs font-bold uppercase transition-colors ${
                        active
                          ? 'border-[#A2ECFB] bg-[#1b1b1f] text-[#A2ECFB]'
                          : 'border-transparent text-[#a0a4a8] hover:bg-[#282828] hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <Outlet />

      {!isHome && isActive && (
        <button
          type="button"
          title={`Voltar ao download em andamento — ${Math.round(progress)}% concluído`}
          aria-label={`Voltar ao download em andamento, ${Math.round(progress)}% concluído`}
          onClick={() => navigate('/')}
          className="group fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[#414853] bg-[#222222] text-[#a0a4a8] shadow-2xl transition-all hover:scale-105 hover:border-[#A2ECFB] hover:text-[#A2ECFB]"
        >
          <svg
            className="absolute inset-1 h-12 w-12 -rotate-90"
            viewBox="0 0 36 36"
            aria-hidden="true"
          >
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
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
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#A2ECFB]">RoveTrack</p>
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
