/**
 * Plays a whole game for real: one TV page plus three phone pages, each in its
 * own browser context so each gets its own localStorage, and therefore its own
 * seat. Needs a dev server running and a working network path to the PeerJS
 * broker, so it is kept out of `npm test` and CI.
 *
 *   npm run dev
 *   npx playwright install chromium
 *   npm run e2e
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5177'
const SHOTS = process.env.SHOTS ?? 'test/screenshots'
mkdirSync(SHOTS, { recursive: true })

const log = (...a) => console.log('•', ...a)
let shotIndex = 0
const shot = async (page, name) => {
  const file = `${SHOTS}/${String(++shotIndex).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: file })
  log('shot', file)
}

/** Waits for a condition on a page, with a clear failure message. */
async function until(page, fn, what, timeout = 25000) {
  try {
    await page.waitForFunction(fn, null, { timeout, polling: 250 })
  } catch {
    const text = await page.locator('body').innerText()
    throw new Error(`Timed out waiting for ${what}.\n--- page text ---\n${text.slice(0, 900)}`)
  }
}

const browser = await chromium.launch()

try {
  /* ── The TV ───────────────────────────────────────────────── */
  const tvContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const tv = await tvContext.newPage()
  tv.on('pageerror', (e) => console.error('  TV page error:', e.message))
  await tv.goto(BASE)
  await shot(tv, 'home')

  await tv.getByRole('button', { name: /Start a table/i }).click()
  await until(
    tv,
    () => /^[A-Y]{4}$/.test(document.querySelector('p.mono')?.textContent?.trim() ?? ''),
    'the TV to show a code',
  )

  const code = (await tv.locator('p.mono').first().innerText()).trim()
  log('table code:', code)
  await shot(tv, 'tv-lobby-empty')

  /* ── Three phones ─────────────────────────────────────────── */
  const names = ['Ann', 'Ben', 'Cal']
  const phones = []
  for (const name of names) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => console.error(`  ${name} page error:`, e.message))
    await page.goto(`${BASE}/?r=${code}`)
    await page.getByLabel('Your name').fill(name)
    await page.getByRole('button', { name: /Take a seat/i }).click()
    await until(page, () => document.body.innerText.includes('You’re in'), `${name} to be seated`)
    log(name, 'is seated')
    phones.push({ name, page })
  }

  await until(
    tv,
    () => document.body.innerText.includes('3 PLAYERS IN'),
    'the TV to show all three players',
  )
  await shot(tv, 'tv-lobby-full')
  await shot(phones[0].page, 'phone-lobby-host')

  /* ── Switch to the family deck ────────────────────────────── */
  // Click the label, the way a person does — the radio itself is sr-only.
  await tv.locator('label').filter({ hasText: 'Family deck' }).click()
  await until(
    tv,
    () => document.querySelector('input[value="family"]')?.checked === true,
    'the family radio to be selected',
  )
  await until(
    tv,
    () => /237 white cards and 84 black cards/.test(document.body.innerText),
    'the TV to show the family deck counts',
  )
  await until(
    phones[0].page,
    () => /Family deck/i.test(document.body.innerText),
    'the phones to hear about the deck change',
  )
  log('switched to the family deck')
  await shot(tv, 'tv-lobby-family')
  await shot(phones[0].page, 'phone-lobby-family')

  /* ── Start ────────────────────────────────────────────────── */
  await phones[0].page.getByRole('button', { name: /Start the game/i }).click()
  await until(tv, () => document.body.innerText.includes('ROUND'), 'the first round to deal')
  log('game started')
  await shot(tv, 'tv-round-writing')

  /** The player whose phone says they are the Czar. */
  const findCzar = async () => {
    for (const phone of phones) {
      const text = await phone.page.locator('body').innerText()
      if (/you’re the card czar/i.test(text)) return phone
    }
    return null
  }

  const czar = await findCzar()
  if (!czar) throw new Error('No phone reported being the Card Czar.')
  log('Card Czar is', czar.name)
  await shot(czar.page, 'phone-czar-waiting')

  /* ── Everyone plays ───────────────────────────────────────── */
  const players = phones.filter((p) => p !== czar)
  await shot(players[0].page, 'phone-hand')

  for (const { name, page } of players) {
    // Pick however many the black card takes, in hand order.
    const label = await page.getByRole('button', { name: /^Pick \d+ more$|^Play it$/ }).innerText()
    const need = /Pick (\d+) more/.exec(label)?.[1]
    const count = need ? Number(need) : 1
    const cards = page.locator('ul > li > button[aria-pressed]')
    for (let i = 0; i < count; i++) await cards.nth(i).click()
    await shot(page, `phone-${name.toLowerCase()}-picked`)
    await page.getByRole('button', { name: /^Play it$/ }).click()
    // The last player to hand in skips straight past "handed in" to judging.
    await until(
      page,
      () => /handed in|the czar is reading/i.test(document.body.innerText),
      `${name}'s play to land`,
    )
    log(name, 'played')
  }

  await until(
    tv,
    () => document.body.innerText.includes('read out') || document.body.innerText.includes('READ OUT'),
    'judging to open on the TV',
  )
  log('judging opened')

  /* ── The Czar reads them out ──────────────────────────────── */
  await shot(czar.page, 'phone-czar-reveal')
  for (let i = 0; i < 2; i++) {
    await czar.page.getByRole('button', { name: /Turn the first one over|Next one/i }).click()
    await czar.page.waitForTimeout(700)
    await shot(tv, `tv-reveal-${i + 1}`)
  }

  await until(czar.page, () => /pick the funniest/i.test(document.body.innerText), 'the choice UI')
  await shot(czar.page, 'phone-czar-choosing')

  /* ── And picks a winner ───────────────────────────────────── */
  await czar.page.locator('ul > li > button[aria-pressed]').first().click()
  await czar.page.getByRole('button', { name: /Give them the point/i }).click()

  await until(tv, () => /takes the point|wins the round/i.test(document.body.innerText), 'the winner')
  await shot(tv, 'tv-winner')
  await shot(phones.find((p) => p !== czar).page, 'phone-round-end')
  log('round complete')

  /* ── And the next round deals ─────────────────────────────── */
  await until(tv, () => /ROUND\s*2/i.test(document.body.innerText), 'round 2 to deal', 20000)
  log('round 2 dealt — full loop verified')
  await shot(tv, 'tv-round-2')

  console.log('\nPASS: home → lobby → deal → play → judge → winner → next round')
} finally {
  await browser.close()
}
