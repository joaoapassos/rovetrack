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
    <article className="border border-[#32363f] bg-[#222222] p-6">
      <h2 className="mb-5 text-2xl font-bold">Termos de Uso</h2>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[#c5c9ce]">{terms}</pre>
    </article>
  )
}
