import { NavLink, Outlet } from 'react-router-dom'

const links = [
  ['/options/config', 'Configurações'],
  ['/options/history', 'Histórico'],
  ['/options/about', 'Sobre'],
  ['/options/terms', 'Termos de Uso']
] as const

export function OptionsLayout(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-[#1b1b1f] px-6 pb-10 pt-24 text-[#f8f8f8]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-[#32363f] pb-5">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#A2ECFB]">RoveTrack</p>
          <h1 className="mt-2 text-3xl font-black uppercase">Opções</h1>
        </header>
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <nav className="flex flex-col gap-2" aria-label="Seções de opções">
            {links.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                title={`Ir para ${label}`}
                className={({ isActive }) =>
                  `border-l-2 px-4 py-3 text-sm font-bold uppercase ${
                    isActive
                      ? 'border-[#A2ECFB] bg-[#222222] text-[#A2ECFB]'
                      : 'border-[#32363f] text-[#a0a4a8] hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <section className="min-w-0">
            <Outlet />
          </section>
        </div>
      </div>
    </main>
  )
}
