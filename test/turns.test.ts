import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  addPlayer,
  allRevealed,
  chooseWinner,
  createGame,
  nextCzarId,
  nextRound,
  pendingPlayers,
  playCards,
  revealNext,
  setConnected,
  startGame,
} from '../src/game/engine.ts'
import { RANDO_ID, type GameState } from '../src/game/types.ts'

const SEED = 99

function tableOf(names: string[], options = {}): GameState {
  const state = createGame('TURN', options, SEED)
  for (const name of names) addPlayer(state, `id-${name}`, name)
  return state
}

function everyonePlays(state: GameState) {
  for (const player of pendingPlayers(state).slice()) {
    playCards(state, player.id, player.hand.slice(0, state.black!.p))
  }
}

function revealAll(state: GameState) {
  while (!allRevealed(state)) revealNext(state)
}

/* ── Whose turn it is ───────────────────────────────────────────
   "Someone won but someone else got the turn" is how the printed rules
   work: the Czar goes round the table and winning has nothing to do with
   it. Meritocracy is the house rule that changes that, and the table now
   says out loud who is judging next either way. */

test('the Czar job goes round the table, not to the winner', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  assert.equal(state.czarId, 'id-Ann')

  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Dee')

  assert.equal(nextCzarId(state), 'id-Ben', 'the seat after Ann judges next, not the winner')
  nextRound(state)
  assert.equal(state.czarId, 'id-Ben')
})

test('the job keeps going round, one seat at a time', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'], { targetScore: 999 })
  startGame(state)
  const order: string[] = []

  for (let round = 0; round < 8; round++) {
    order.push(state.czarId!)
    everyonePlays(state)
    revealAll(state)
    chooseWinner(state, state.submissions.find((s) => s.playerId !== state.czarId)!.playerId)
    nextRound(state)
  }

  assert.deepEqual(order, [
    'id-Ann', 'id-Ben', 'id-Cal', 'id-Dee',
    'id-Ann', 'id-Ben', 'id-Cal', 'id-Dee',
  ])
})

test('under Meritocracy the winner judges the next round', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'], { meritocracy: true })
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Dee')

  assert.equal(nextCzarId(state), 'id-Dee')
  nextRound(state)
  assert.equal(state.czarId, 'id-Dee')
})

test('Meritocracy never hands the job to Rando', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'], { meritocracy: true, rando: true })
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, RANDO_ID)

  assert.notEqual(nextCzarId(state), RANDO_ID)
  nextRound(state)
  assert.ok(
    state.players.some((p) => p.id === state.czarId),
    'an imaginary player cannot judge a round',
  )
})

test('Meritocracy never hands the job to somebody who has left', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'], { meritocracy: true })
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  const winner = state.players.find((p) => p.id !== state.czarId)!
  chooseWinner(state, winner.id)

  setConnected(state, winner.id, false)
  nextRound(state)

  assert.equal(state.players.find((p) => p.id === state.czarId)!.connected, true)
})

test('the table can always say who judges next while a winner is up', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, state.submissions[0].playerId)

  const next = nextCzarId(state)
  assert.ok(next, 'somebody has to be next')
  nextRound(state)
  assert.equal(state.czarId, next, 'and it has to be the one that was announced')
})
