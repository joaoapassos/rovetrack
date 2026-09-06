import { matchRoutes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from './router'

describe('rotas do renderer', () => {
  it.each(['/', '/history', '/config', '/about', '/terms'])('registra a rota %s', (path) => {
    const matches = matchRoutes(APP_ROUTES, path)
    expect(matches).not.toBeNull()
    expect(matches?.some((match) => match.route.path === '*')).toBe(false)
  })

  it.each([
    '/options',
    '/options/config',
    '/options/history',
    '/options/about',
    '/options/terms'
  ])('mantém redirecionamento da rota legada %s', (path) => {
    const matches = matchRoutes(APP_ROUTES, path)
    expect(matches).not.toBeNull()
    expect(matches?.at(-1)?.route.path).toBe(path.slice(1))
  })

  it('usa fallback seguro para rota desconhecida', () => {
    const matches = matchRoutes(APP_ROUTES, '/nao-existe')
    expect(matches?.at(-1)?.route.path).toBe('*')
  })
})
