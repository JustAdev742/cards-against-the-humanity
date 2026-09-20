import { test } from 'node:test'
import assert from 'node:assert/strict'

import whiteCards from '../src/data/white.json' with { type: 'json' }
import { answerFeatures } from '../src/bots/features.ts'

/**
 * Can it tell a picture from an idea?
 *
 * This is the third benchmark and the bluntest. Both of the others compare a
 * card against a particular setup; this one asks something simpler and more
 * fundamental, because getting it wrong is what puts "Boomers." and "The
 * death penalty." into a round where somebody else played nipple blades.
 *
 * Every card below is real. The split is not a matter of taste: one column
 * you could photograph, the other you could only argue about.
 */

/** Things you could point a camera at. */
const PICTURES = [
  'Many bats.',
  'Boogers.',
  'Explosions.',
  'Nipple blades.',
  'A tiny horse.',
  'Sperm whales.',
  'Hot cheese.',
  'Boneless buffalo wings.',
  'The Hamburglar.',
  'A live studio audience.',
  'A bowl of mayonnaise and human teeth.',
  'A crucifixion.',
  'Former President George W. Bush.',
  'The Kool-Aid Man.',
  'Stuffing my peehole with Tic Tacs.',
  'A fart so powerful that it wakes the giants from their thousand-year slumber.',
  'Emerging from the sea and rampaging through Tokyo.',
  'Nachos for the table.',
  'A horde of Vikings.',
  'Pooping in a laptop and closing it.',
  'The tampon from my vagina.',
  'An octopus giving seven handjobs and smoking a cigarette.',
]

/** Things you could only argue about. */
const IDEAS = [
  'Shame.',
  'Hope.',
  'Silence.',
  'Poverty.',
  'The past.',
  'A mistake.',
  'Natural selection.',
  'White privilege.',
  'Crippling debt.',
  'Daddy issues.',
  'Critical race theory.',
  'The illusion of choice in a late-stage capitalist society.',
  'Emotions.',
  'Racism.',
  'A positive attitude!',
  'Poor life choices.',
  'Completely unwarranted confidence.',
  'Being a woman.',
  'The death penalty.',
  'Pretending to care.',
  'Having big dreams but no realistic way to achieve them.',
  'Complaining.',
  'Nobody giving a shit about anything anymore.',
  'Fading away into nothingness.',
]

test('every card in the abstraction benchmark ships in the deck', () => {
  const white = new Set(whiteCards as string[])
  const missing = [...PICTURES, ...IDEAS].filter((c) => !white.has(c))
  assert.deepEqual(missing, [])
})

const vivid = (text: string) => answerFeatures(text).image

/**
 * Every picture against every idea. Reporting the share of pairs that come out
 * the right way round says more than any single threshold, and it cannot be
 * satisfied by shifting a constant until one card moves.
 */
function separation() {
  let right = 0
  let ties = 0
  const wrong: string[] = []
  for (const picture of PICTURES) {
    for (const idea of IDEAS) {
      const a = vivid(picture)
      const b = vivid(idea)
      if (a > b) right++
      else if (a === b) ties++
      else wrong.push(`  ${idea} (${b.toFixed(2)}) scored above ${picture} (${a.toFixed(2)})`)
    }
  }
  const total = PICTURES.length * IDEAS.length
  return { share: right / total, right, ties, total, wrong }
}

test('a picture outscores an idea nearly every time', () => {
  const { share, right, ties, total, wrong } = separation()
  assert.ok(
    share >= 0.93,
    `only ${right} of ${total} pairs came out right (${(100 * share).toFixed(1)}%, ${ties} ties).\n` +
      `worst offenders:\n${wrong.slice(0, 12).join('\n')}`,
  )
})

test('no idea scores as vividly as the most pictorial cards', () => {
  // Saturation is its own failure: when a dozen cards all sit on the clamp,
  // the model has stopped discriminating and simply cannot rank them.
  const best = Math.max(...PICTURES.map(vivid))
  const offenders = IDEAS.filter((i) => vivid(i) >= best * 0.85)
  assert.deepEqual(
    offenders.map((i) => `${i} (${vivid(i).toFixed(2)} vs best picture ${best.toFixed(2)})`),
    [],
  )
})

test('the deck does not pile up on the top of the scale', () => {
  const all = (whiteCards as string[]).map(vivid)
  const top = Math.max(...all)
  const onTheClamp = all.filter((v) => v >= top - 0.001).length
  assert.ok(
    onTheClamp <= 8,
    `${onTheClamp} cards are tied at ${top.toFixed(2)}, so the model cannot tell them apart`,
  )
})
