import { useEffect, useState } from 'react'
import { MarkdownContent } from '../components/MarkdownContent'

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
      <MarkdownContent>{terms}</MarkdownContent>
    </article>
  )
}
