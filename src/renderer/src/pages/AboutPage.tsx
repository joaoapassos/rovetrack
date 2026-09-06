import { Link } from 'react-router-dom'
import { useAppSettings } from '../settings/AppSettingsContext'

export function AboutPage(): React.JSX.Element {
  const { applicationVersion } = useAppSettings()
  return (
    <article className="mx-auto flex flex-col gap-3 border border-[#32363f] bg-[#222222] p-7 sm:p-9">
      <h2 className="text-center text-2xl font-bold">Sobre o Rovetrack</h2>
      <p className="text-[#a0a4a8]">
        Rovetrack é um aplicativo desktop local para adquirir, processar e organizar mídia com uma
        arquitetura extensível de políticas, providers, processors e storage.
      </p>
      <dl className="grid gap-3 font-mono text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#6f767d]">Versão</dt>
          <dd>{applicationVersion}</dd>
        </div>
        <div>
          <dt className="text-[#6f767d]">Termos e licença</dt>
          <dd className="flex flex-wrap gap-x-2">
            <Link
              to="/terms"
              title="Consultar os Termos de Uso"
              className="text-[#A2ECFB] underline decoration-[#A2ECFB]/40 underline-offset-4 transition-colors hover:text-white"
            >
              Termos de Uso
            </Link>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              title="Consultar a Apache License 2.0 no GitHub"
              onClick={() =>
                void window.api.openExternal(
                  'https://github.com/joaoapassos/rovetrack/blob/master/LICENSE'
                )
              }
              className="text-[#A2ECFB] underline decoration-[#A2ECFB]/40 underline-offset-4 transition-colors hover:text-white"
            >
              Apache 2.0
            </button>
          </dd>
        </div>
      </dl>
      <button
        type="button"
        title="Abrir o projeto Rovetrack no GitHub"
        onClick={() => void window.api.openExternal('https://github.com/joaoapassos/rovetrack')}
        className="border border-[#A2ECFB] px-4 py-2 w-fit text-xs font-bold uppercase text-[#A2ECFB]"
      >
        Abrir projeto no GitHub
      </button>
    </article>
  )
}
