import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { App } from '../src/App'

test('the starter renders its identity and accurately reports its status', () => {
  const html = renderToStaticMarkup(<App />)

  expect(html).toContain('<h1>The Last Ember</h1>')
  expect(html).toContain('The game is not implemented yet.')
  expect(html).toContain('BUILD_HANDOFF.md')
})
