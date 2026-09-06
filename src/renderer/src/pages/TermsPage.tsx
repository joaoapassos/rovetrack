import { useEffect, useState } from 'react'

export function TermsPage(): React.JSX.Element {
  const [terms, setTerms] = useState('A carregar Termos de Uso...')
  useEffect(() => {
    window.api
      .getTerms()
      .then(setTerms)
      .catch(() => setTerms('Não foi possível carregar os Termos de Uso.'))
  }, [])
  return (
    <article className="mx-auto border border-[#32363f] bg-[#222222] p-7 sm:p-9">
      <h2 className="mb-7 text-center text-2xl font-bold">Termos de Uso</h2>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[#c5c9ce]">{terms}</pre>
    </article>
  )
}
