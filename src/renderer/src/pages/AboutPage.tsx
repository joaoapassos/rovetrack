export function AboutPage(): React.JSX.Element {
  return (
    <article className="space-y-5 border border-[#32363f] bg-[#222222] p-6">
      <h2 className="text-2xl font-bold">Sobre o RoveTrack</h2>
      <p className="text-[#a0a4a8]">
        RoveTrack é um aplicativo desktop local para adquirir, processar e organizar mídia com uma
        arquitetura extensível de políticas, providers, processors e storage.
      </p>
      <dl className="grid gap-3 font-mono text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#6f767d]">Versão</dt>
          <dd>0.2.0-beta</dd>
        </div>
        <div>
          <dt className="text-[#6f767d]">Licença de uso</dt>
          <dd>Consulte os Termos de Uso</dd>
        </div>
      </dl>
      <button
        type="button"
        title="Abrir o projeto RoveTrack no GitHub"
        onClick={() => void window.api.openExternal('https://github.com/joaoapassos/rovetrack')}
        className="border border-[#A2ECFB] px-4 py-2 text-xs font-bold uppercase text-[#A2ECFB]"
      >
        Abrir projeto no GitHub
      </button>
    </article>
  )
}
