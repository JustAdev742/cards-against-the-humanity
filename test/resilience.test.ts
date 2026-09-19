import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  addPlayer,
  allRevealed,
  chooseWinner,
  createGame,
  nextRound,
  pendingPlayers,
  playAgain,
  playCards,
  isShortHanded,
  removePlayer,
  revealNext,
  setConnected,
  startGame,
} from '../src/game/engine.ts'
import type { GameState } from '../src/game/types.ts'

const SEED = 4242

function tableOf(names: string[], options = {}): GameState {
  const state = createGame('TEST', options, SEED)
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

/* ── People leaving at the worst moment ─────────────────────────
   A phone locks, a battery dies, someone walks out of the room. None
   of it should be able to wedge the table. */

test('a Czar who drops during writing does not wedge the round', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  assert.equal(state.czarId, 'id-Ann')

  setConnected(state, 'id-Ann', false)
  everyonePlays(state)

  assert.notEqual(state.phase, 'writing', 'the round must not sit in writing forever')
  assert.notEqual(state.czarId, 'id-Ann', 'a disconnected Czar must hand the job on')
})

test('a Czar who drops during judging does not wedge the round', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  everyonePlays(state)
  assert.equal(state.phase, 'judging')

  setConnected(state, state.czarId!, false)

  assert.notEqual(
    state.czarId,
    'id-Ann',
    'judging cannot wait on a phone that is gone: pass the job on or void the round',
  )
})

test('a Czar who drops during the winner card does not wedge the table', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Ben')
  assert.equal(state.phase, 'roundEnd')

  setConnected(state, 'id-Ann', false)
  nextRound(state)

  assert.equal(state.phase, 'writing', 'the next round should still deal')
  assert.equal(
    state.players.find((p) => p.id === state.czarId)!.connected,
    true,
    'the new Czar must be someone who is actually here',
  )
})

test('the Czar job never lands on someone who is not connected', () => {
  // Five seats so that losing two still leaves a playable table.
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee', 'Eve'])
  startGame(state)
  setConnected(state, 'id-Ben', false)
  setConnected(state, 'id-Cal', false)
  assert.equal(state.phase, 'writing', 'three players left is still a game')

  for (let round = 0; round < 6; round++) {
    assert.equal(
      state.players.find((p) => p.id === state.czarId)?.connected,
      true,
      `round ${round + 1} handed the Czar job to a disconnected player`,
    )
    everyonePlays(state)
    revealAll(state)
    const winner = state.submissions.find((s) => s.playerId !== state.czarId)
    if (winner) chooseWinner(state, winner.playerId)
    nextRound(state)
  }
})

test('a short-handed table waits rather than throwing the game away', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Ben')
  nextRound(state)
  const scores = state.players.map((p) => `${p.name}:${p.score}`).join(' ')

  setConnected(state, 'id-Cal', false)
  setConnected(state, 'id-Dee', false)

  assert.equal(isShortHanded(state), true, 'the table knows it is short')
  assert.notEqual(state.phase, 'lobby', 'a locked phone must not end the game')
  assert.equal(state.players.map((p) => `${p.name}:${p.score}`).join(' '), scores, 'scores stand')

  setConnected(state, 'id-Cal', true)
  setConnected(state, 'id-Dee', true)
  assert.equal(isShortHanded(state), false)
  assert.equal(state.players.map((p) => `${p.name}:${p.score}`).join(' '), scores, 'still stand')
})

test('a table left empty picks up where it was when someone returns', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  const round = state.round
  for (const player of state.players.slice()) setConnected(state, player.id, false)

  assert.notEqual(state.phase, 'gameOver')
  addPlayer(state, 'id-Ben', 'Ben')
  addPlayer(state, 'id-Cal', 'Cal')
  addPlayer(state, 'id-Ann', 'Ann')

  assert.equal(state.phase, 'writing', 'the table should be playable again')
  assert.ok(state.round >= round, 'the round counter never goes backwards')
  assert.equal(state.players.find((p) => p.id === state.czarId)!.connected, true)
})

test('a game is never restarted out from under its scores', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Ben')

  setConnected(state, 'id-Ann', false)
  setConnected(state, 'id-Ben', false)
  setConnected(state, 'id-Ann', true)
  setConnected(state, 'id-Ben', true)

  assert.equal(state.players.find((p) => p.id === 'id-Ben')!.score, 1, 'the point stands')
})

test('a player who drops after playing still has their card judged', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  const ben = state.players.find((p) => p.id === 'id-Ben')!
  playCards(state, ben.id, ben.hand.slice(0, state.black!.p))

  setConnected(state, 'id-Ben', false)
  everyonePlays(state)
  revealAll(state)

  assert.equal(
    state.revealOrder.includes('id-Ben'),
    true,
    'a card that was played stays in the round even if its owner leaves',
  )
  chooseWinner(state, 'id-Ben')
  assert.equal(state.players.find((p) => p.id === 'id-Ben')!.score, 1)
})

test('someone reconnecting mid-round does not re-open a closed round', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  setConnected(state, 'id-Dee', false)
  everyonePlays(state)
  assert.equal(state.phase, 'judging')

  addPlayer(state, 'id-Dee', 'Dee')

  assert.equal(state.phase, 'judging', 'a late arrival must not drag the table back to writing')
  assert.equal(pendingPlayers(state).length, 0)
})

test('a player who leaves during judging is taken out of the running', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)

  removePlayer(state, 'id-Ben')

  assert.equal(state.revealOrder.includes('id-Ben'), false)
  assert.ok(state.revealed <= state.revealOrder.length, 'reveal count must not outrun the pile')
  chooseWinner(state, 'id-Ben')
  assert.notEqual(state.winnerId, 'id-Ben', 'a player who left cannot win the round')
})

test('everyone dropping at once does not throw', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal', 'Dee'])
  startGame(state)
  for (const player of state.players.slice()) setConnected(state, player.id, false)

  assert.doesNotThrow(() => {
    nextRound(state)
    revealNext(state)
    chooseWinner(state, 'id-Ann')
  })
})

test('a hand is always refilled before a player has to use it', () => {
  // Ten players, the small deck, and a long night: the deck has to keep up.
  const state = tableOf(
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    { deck: 'family', targetScore: 999 },
  )
  startGame(state)

  for (let round = 0; round < 80; round++) {
    for (const player of state.players) {
      assert.equal(player.hand.length, 10, `round ${round + 1}: ${player.name} is short`)
    }
    assert.ok(state.black, `round ${round + 1} dealt no black card`)
    everyonePlays(state)
    revealAll(state)
    const winner = state.submissions.find((s) => s.playerId !== state.czarId)!
    chooseWinner(state, winner.playerId)
    nextRound(state)
  }
})

/* ── Two buttons, one table ─────────────────────────────────────
   The TV and the first player's phone carry the same controls. Pressing
   both must not be different from pressing one. */

test('starting twice does not reshuffle a game in progress', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Ben')
  nextRound(state)

  const round = state.round
  const hands = state.players.map((p) => p.hand.join('|'))
  const scores = state.players.map((p) => p.score)

  startGame(state)

  assert.equal(state.round, round, 'the round counter must not reset')
  assert.deepEqual(state.players.map((p) => p.hand.join('|')), hands, 'hands must not be redealt')
  assert.deepEqual(state.players.map((p) => p.score), scores, 'scores must survive')
})

test('play again cannot be used to wipe a live scoreboard', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  everyonePlays(state)
  revealAll(state)
  chooseWinner(state, 'id-Ben')

  playAgain(state)

  assert.equal(state.phase, 'roundEnd', 'mid-game play again is ignored')
  assert.equal(state.players.find((p) => p.id === 'id-Ben')!.score, 1)
})

test('playing the same card twice in one round is refused', () => {
  const state = tableOf(['Ann', 'Ben', 'Cal'])
  startGame(state)
  state.black = { t: '_ and _.', p: 2 }
  const ben = state.players.find((p) => p.id === 'id-Ben')!
  const card = ben.hand[0]

  const result = playCards(state, ben.id, [card, card])

  assert.equal(result.ok, false, 'one card cannot fill two blanks')
  assert.equal(ben.hand.length, 10, 'a refused play costs nothing')
})
