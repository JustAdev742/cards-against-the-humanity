import { test } from 'node:test'
import assert from 'node:assert/strict'

import fullBlack from '../src/data/black.json' with { type: 'json' }
import fullWhite from '../src/data/white.json' with { type: 'json' }
import familyBlack from '../src/data/family-black.json' with { type: 'json' }
import familyWhite from '../src/data/family-white.json' with { type: 'json' }
import {
  addPlayer,
  allRevealed,
  canStart,
  chooseWinner,
  createGame,
  deckCounts,
  deckSize,
  makeRoomCode,
  nextRound,
  pendingPlayers,
  playAgain,
  playCards,
  removePlayer,
  revealNext,
  setConnected,
  setDeck,
  standings,
  startGame,
} from '../src/game/engine.ts'
import { MAX_PLAYERS, RANDO_ID, type GameState } from '../src/game/types.ts'
import { DECK_COUNTS } from '../src/data/counts.ts'

const SEED = 12345

function tableOf(names: string[], options = {}): GameState {
  const state = createGame('TEST', options, SEED)
  for (const name of names) addPlayer(state, `id-${name}`, name)
  return state
}

/** Every non-Czar plays whatever is at the front of their hand. */
function everyonePlays(state: GameState) {
  for (const player of pendingPlayers(state).slice()) {
    const result = playCards(state, player.id, player.hand.slice(0, state.black!.p))
    assert.equal(result.ok, true, `${player.name} should be able to play`)
  }
}

function revealAll(state: GameState) {
  while (!allRevealed(state)) revealNext(state)
}

test('the deck is the full 2022 print-and-play', () => {
  assert.equal(deckSize.black, 100)
  assert.equal(deckSize.white, 500)
})

test('room codes avoid letters that get misread across a room', () => {
  for (let i = 0; i < 400; i++) {
    const code = makeRoomCode()
    assert.match(code, /^[A-Y]{4}$/)
    assert.equal(/[IOQSZ]/.test(code), false, `${code} contains a confusable letter`)
  }
})

test('a table needs three players before it can start', () => {
  const state = tableOf(['Ann', 'Ben'])
  assert.equal(canStart(state), false)
  startGame(state)
  assert.equal(state.phase, 'lobby')

  addPlayer(state, 'id-Cal', 'Cal')
  assert.equal(canStart(state), true)
  startGame(state)
  assert.equal(state.phase, 'writing')
})

test('starting deals ten cards to everyone and puts a black card up', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)

  assert.equal(state.round, 1)
  assert.ok(state.black)
  assert.equal(state.czarId, 'id-Ann')
  for (const player of state.players) assert.equal(player.hand.length, 10)
})

test('duplicate names are turned away and a full table is turned away', () => {
  const state = tableOf(['Ann'])
  assert.deepEqual(addPlayer(state, 'other', 'ann'), { ok: false, reason: 'nameTaken' })

  const big = createGame('FULL', {}, SEED)
  for (let i = 0; i < 10; i++) addPlayer(big, `p${i}`, `P${i}`)
  assert.deepEqual(addPlayer(big, 'p10', 'P10'), { ok: false, reason: 'full' })
})

test('the Card Czar does not play a card', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)

  const czar = state.players.find((p) => p.id === state.czarId)!
  const result = playCards(state, czar.id, czar.hand.slice(0, 1))
  assert.deepEqual(result, { ok: false, reason: 'The Card Czar does not play a card.' })
  assert.equal(pendingPlayers(state).length, 2)
})

test('a play has to use cards actually in your hand, and the right number', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  const ben = state.players.find((p) => p.id === 'id-Ben')!

  assert.deepEqual(playCards(state, ben.id, ['A card that does not exist.']), {
    ok: false,
    reason: 'That card is not in your hand.',
  })
  const need = state.black!.p
  assert.deepEqual(playCards(state, ben.id, ben.hand.slice(0, need + 1)), {
    ok: false,
    reason: `This one takes ${need}.`,
  })
  assert.equal(ben.hand.length, 10, 'a rejected play must not cost cards')
})

test('you cannot play twice in a round', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  const ben = state.players.find((p) => p.id === 'id-Ben')!

  assert.equal(playCards(state, ben.id, ben.hand.slice(0, state.black!.p)).ok, true)
  assert.deepEqual(playCards(state, ben.id, ben.hand.slice(0, state.black!.p)), {
    ok: false,
    reason: 'You already played this round.',
  })
})

test('judging opens only once every play is in', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  const ben = state.players.find((p) => p.id === 'id-Ben')!

  playCards(state, ben.id, ben.hand.slice(0, state.black!.p))
  assert.equal(state.phase, 'writing')

  const cal = state.players.find((p) => p.id === 'id-Cal')!
  playCards(state, cal.id, cal.hand.slice(0, state.black!.p))
  assert.equal(state.phase, 'judging')
  assert.equal(state.revealOrder.length, 2)
  assert.equal(state.revealed, 0)
})

test('a winner can only be picked once every card is face up', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  everyonePlays(state)

  chooseWinner(state, 'id-Ben')
  assert.equal(state.phase, 'judging', 'picking early must not end the round')

  revealNext(state)
  chooseWinner(state, 'id-Ben')
  assert.equal(state.phase, 'judging')

  revealAll(state)
  chooseWinner(state, 'id-Ben')
  assert.equal(state.phase, 'roundEnd')
  assert.equal(state.winnerId, 'id-Ben')
  assert.equal(state.players.find((p) => p.id === 'id-Ben')!.score, 1)
})

test('the Czar passes on and hands refill to ten', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Ben')
  nextRound(state)

  assert.equal(state.round, 2)
  assert.equal(state.czarId, 'id-Ben')
  assert.equal(state.phase, 'writing')
  for (const player of state.players) assert.equal(player.hand.length, 10)
})

test('the game ends when someone reaches the target score', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'], { targetScore: 2 })
  startGame(state)

  let rounds = 0
  while (state.phase !== 'gameOver' && rounds++ < 10) {
    everyonePlays(state)
    revealAll(state)
    // Hand the point to Cal every round Cal is not judging, so someone
    // actually reaches the target instead of the lead rotating forever.
    const winner =
      state.czarId === 'id-Cal'
        ? state.players.find((p) => p.id !== state.czarId)!
        : state.players.find((p) => p.id === 'id-Cal')!
    chooseWinner(state, winner.id)
    nextRound(state)
  }

  assert.equal(state.phase, 'gameOver')
  assert.equal(standings(state)[0].score, 2)
})

test('Rando Cardrissian plays every round but never scores', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'], { rando: true })
  startGame(state)

  assert.equal(state.submissions.length, 1)
  assert.equal(state.submissions[0].playerId, RANDO_ID)
  assert.equal(state.submissions[0].cards.length, state.black!.p)

  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, RANDO_ID)

  assert.equal(state.winnerId, RANDO_ID)
  assert.equal(state.players.every((p) => p.score === 0), true)
})

test('a dropped connection does not stall the round', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  const ben = state.players.find((p) => p.id === 'id-Ben')!
  playCards(state, ben.id, ben.hand.slice(0, state.black!.p))

  setConnected(state, 'id-Cal', false)
  assert.equal(state.phase, 'judging', 'the round moves on without the player who left')
})

test('a player who leaves gives their cards back and vacates the round', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  const discardBefore = state.whiteDiscard.length

  removePlayer(state, 'id-Dee')
  assert.equal(state.players.length, 3)
  assert.equal(state.whiteDiscard.length, discardBefore + 10)
  assert.equal(state.submissions.some((s) => s.playerId === 'id-Dee'), false)
})

test('if the Czar leaves, the round restarts under a new Czar', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  assert.equal(state.czarId, 'id-Ann')

  removePlayer(state, 'id-Ann')
  assert.equal(state.phase, 'writing')
  assert.notEqual(state.czarId, 'id-Ann')
  assert.equal(state.submissions.length, 0)
})

test('dropping below three players sends the table back to the lobby', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  removePlayer(state, 'id-Cal')

  assert.equal(state.phase, 'lobby')
  assert.equal(state.czarId, null)
})

test('a phone that reconnects keeps its seat, hand and score', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  const ben = state.players.find((p) => p.id === 'id-Ben')!
  ben.score = 3
  const hand = ben.hand.slice()

  setConnected(state, 'id-Ben', false)
  const result = addPlayer(state, 'id-Ben', 'Ben')

  assert.equal(result.ok, true)
  assert.equal(state.players.length, 3)
  assert.equal(ben.score, 3)
  assert.deepEqual(ben.hand, hand)
  assert.equal(ben.connected, true)
})

test('someone joining mid-game is dealt in straight away', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  addPlayer(state, 'id-Dee', 'Dee')

  assert.equal(state.players.find((p) => p.id === 'id-Dee')!.hand.length, 10)
})

test('the deck keeps dealing across a long game', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee', 'Eve'], { targetScore: 999 })
  startGame(state)

  for (let round = 0; round < 120; round++) {
    everyonePlays(state)
    revealAll(state)
    const winner = state.players.find((p) => p.id !== state.czarId)!
    chooseWinner(state, winner.id)
    nextRound(state)
    assert.equal(state.phase, 'writing', `round ${round + 2} should deal`)
    assert.ok(state.black, 'a black card should always be available')
    for (const player of state.players) {
      assert.equal(player.hand.length, 10, `${player.name} should hold ten cards`)
    }
  }
})

test('play again clears the score but keeps everyone seated', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'], { targetScore: 1 })
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Ben')
  nextRound(state)
  assert.equal(state.phase, 'gameOver')

  playAgain(state)
  assert.equal(state.phase, 'lobby')
  assert.equal(state.round, 0)
  assert.equal(state.players.length, 3)
  assert.equal(state.players.every((p) => p.score === 0 && p.hand.length === 0), true)
})

test('pick 2 and pick 3 cards take exactly that many, in order', () => {
  const state = createGame('PICK', {}, SEED)
  for (const name of ['Ann', 'Ben', 'Cal']) addPlayer(state, `id-${name}`, name)
  startGame(state)

  state.black = { t: '_ + _ = _.', p: 3 }
  const ben = state.players.find((p) => p.id === 'id-Ben')!
  const chosen = [ben.hand[4], ben.hand[0], ben.hand[7]]

  assert.deepEqual(playCards(state, ben.id, chosen.slice(0, 2)), {
    ok: false,
    reason: 'This one takes 3.',
  })
  assert.equal(playCards(state, ben.id, chosen).ok, true)
  assert.deepEqual(state.submissions.find((s) => s.playerId === ben.id)!.cards, chosen)
  assert.equal(ben.hand.length, 7)
})

/* ── The family deck ───────────────────────────────────────────
   The adult cards are removed, not bleeped. These tests guard the
   two ways that can go wrong: a card that should not be in it, and
   a deck too small to actually play with. */

test('every family card is a real card from the printed deck', () => {
  const white = new Set(fullWhite as string[])
  const black = new Set((fullBlack as { t: string }[]).map((c) => c.t))

  for (const card of familyWhite as string[]) {
    assert.equal(white.has(card), true, `white card not in the deck: ${card}`)
  }
  for (const card of familyBlack as string[]) {
    assert.equal(black.has(card), true, `black card not in the deck: ${card}`)
  }
})

test('the family deck is big enough for a full table', () => {
  const counts = deckCounts('family')
  // Ten players holding ten cards each, with room left to keep dealing.
  assert.ok(counts.white >= MAX_PLAYERS * 10 + 50, `only ${counts.white} white cards`)
  assert.ok(counts.black >= 40, `only ${counts.black} black cards`)
  assert.ok(counts.white < deckCounts('full').white, 'the family deck should be smaller')
})

test('no family card carries adult content', () => {
  // A blunt net: it catches a mistyped index, which is the realistic failure.
  const banned =
    /\b(sex|sexual|sexy|penis|penises|vagina|vaginas|clitoris|dick|dicks|cock|cum|cums|cummed|jizz|semen|sperm bank|orgasm|masturbat|porn|erotica|boob|boobs|tit|tits|titty|nipple|nipples|anus|anal|asshole|butthole|foreskin|smegma|queef|bukkake|handjob|blowjob|gloryhole|dildo|condom|virgin|virginity|erection|foreplay|threesome|incest|pedophile|pedophiles|slut|sluts|whore|hoes|rape|abortion|heroin|cocaine|meth|weed|opioid|opium|adderall|xanax|zoloft|viagra|acid trip|suicide|kill myself|nazi|nazis|kkk|auschwitz|holocaust|slavery|lynch|fuck|fucking|fucked|shit|shitty|bitch|bastard|cunt|nigg)\b/i

  for (const card of familyWhite as string[]) {
    assert.equal(banned.test(card), false, `family white card is not family-safe: ${card}`)
  }
  for (const card of familyBlack as string[]) {
    assert.equal(banned.test(card), false, `family black card is not family-safe: ${card}`)
  }
})

test('a family game only ever deals family cards', () => {
  const allowed = new Set(familyWhite as string[])
  const allowedBlack = new Set(familyBlack as string[])
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'], { deck: 'family', targetScore: 999 })
  startGame(state)

  for (let round = 0; round < 60; round++) {
    assert.equal(allowedBlack.has(state.black!.t), true, `black card escaped: ${state.black!.t}`)
    for (const player of state.players) {
      for (const card of player.hand) {
        assert.equal(allowed.has(card), true, `white card escaped: ${card}`)
      }
    }
    everyonePlays(state)
    revealAll(state)
    chooseWinner(state, state.players.find((p) => p.id !== state.czarId)!.id)
    nextRound(state)
  }
})

test('switching decks in the lobby swaps the cards out', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  assert.equal(state.options.deck, 'full')
  assert.equal(state.whiteDeck.length, deckCounts('full').white)

  setDeck(state, 'family')
  assert.equal(state.options.deck, 'family')
  assert.equal(state.whiteDeck.length, deckCounts('family').white)

  // Once cards are dealt the deck is locked, so a mid-game swap is ignored.
  startGame(state)
  setDeck(state, 'full')
  assert.equal(state.options.deck, 'family')
})

test('the published deck counts match the decks', () => {
  // Home shows these as literals to keep the decks out of the first chunk.
  assert.deepEqual(
    { ...DECK_COUNTS },
    {
      black: deckSize.black,
      white: deckSize.white,
      familyBlack: deckCounts('family').black,
      familyWhite: deckCounts('family').white,
    },
  )
})
