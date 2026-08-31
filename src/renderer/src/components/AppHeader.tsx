import Icon from '../assets/icon.png'

export function AppHeader(): React.JSX.Element {
  return (
    <header className="mb-8 flex flex-col items-center gap-3 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border-2 border-[#414853] bg-[#282828] shadow-lg">
        <img src={Icon} alt="Ícone do RoveTrack" className="mb-4 h-16 w-16" />
      </div>
      <h1 className="text-3xl font-bold uppercase tracking-tight text-white">
        RoveTrack <span className="text-sm text-blue-400">BETA</span>
      </h1>
    </header>
  )
}
