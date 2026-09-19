import { chooseCards, judge, learnFrom, personalityFor, type JudgeModel } from '../bots/taste.ts'
import type { GameState, Player } from '../game/types.ts'

/** Long enough to look like reading the card, short enough not to drag. */
const THINK_MS = [1400, 3600]
const TURN_OVER_MS = [900, 1700]
const DECIDE_MS = [1600, 3200]

const between = ([lo, hi]: number[]) => lo + Math.random() * (hi - lo)

export interface BotHooks {
  play(botId: string, cards: string[]): void
  reveal(): void
  choose(botId: string, winnerId: string): void
}

/**
 * Drives the bots sitting at a table.
 *
 * Everything a bot does goes through the same rules as everybody else: it
 * plays cards out of its own hand and judges what it can see. The only thing
 * this adds is timing, because a bot that answered the instant the card
 * appeared would make the table feel like a spreadsheet.
 */
export function createBots(hooks: BotHooks) {
  /** What each bot has worked out about each judge, keyed bot → judge. */
  const models = new Map<string, Map<string, JudgeModel>>()
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  /** Rounds already learned from, so a re-broadcast does not teach twice. */
  let learnedRound = -1
  let destroyed = false

  function schedule(key: string, delay: number, run: () => void) {
    if (destroyed || timers.has(key)) return
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key)
        if (!destroyed) run()
      }, delay),
    )
  }

  function modelFor(botId: string, judgeId: string): JudgeModel | undefined {
    return models.get(botId)?.get(judgeId)
  }

  function remember(botId: string, judgeId: string, model: JudgeModel) {
    let forBot = models.get(botId)
    if (!forBot) {
      forBot = new Map()
      models.set(botId, forBot)
    }
    forBot.set(judgeId, model)
  }

  /** Anything scheduled for an earlier round is no longer wanted. */
  function dropStaleTimers(round: number, phase: string) {
    for (const [key, timer] of timers) {
      if (!key.startsWith(`${round}:${phase}:`)) {
        clearTimeout(timer)
        timers.delete(key)
      }
    }
  }

  function sync(state: GameState) {
    if (destroyed) return
    dropStaleTimers(state.round, state.phase)

    const bots = state.players.filter((p): p is Player & { bot: string } => Boolean(p.bot))
    if (bots.length === 0) return
    // With nobody human left there is nothing to play for. The bots stop
    // rather than quietly finishing the game among themselves.
    if (!state.players.some((p) => !p.bot && p.connected)) return

    if (state.phase === 'writing' && state.black) {
      const card = state.black
      for (const bot of bots) {
        if (bot.id === state.czarId) continue
        if (state.submissions.some((s) => s.playerId === bot.id)) continue
        if (bot.hand.length === 0) continue

        const { taste } = personalityFor(bot.bot)
        schedule(`${state.round}:writing:${bot.id}`, between(THINK_MS), () => {
          const cards = chooseCards(
            card,
            bot.hand,
            taste,
            state.czarId ? modelFor(bot.id, state.czarId) : undefined,
          )
          if (cards.length) hooks.play(bot.id, cards)
        })
      }
      return
    }

    if (state.phase === 'judging' && state.black) {
      const czar = bots.find((b) => b.id === state.czarId)
      if (!czar) return
      const card = state.black
      const faceUp = state.revealed >= state.revealOrder.length

      if (!faceUp) {
        schedule(`${state.round}:judging:reveal:${state.revealed}`, between(TURN_OVER_MS), () =>
          hooks.reveal(),
        )
        return
      }
      if (state.submissions.length === 0) return

      const { taste } = personalityFor(czar.bot)
      schedule(`${state.round}:judging:choose`, between(DECIDE_MS), () => {
        const winner = judge(card, state.submissions, taste)
        hooks.choose(czar.id, winner)
      })
      return
    }

    // A round has just been decided: every bot watches what this judge liked,
    // including the bots who were not playing, because taste is public.
    if (state.phase === 'roundEnd' && state.round !== learnedRound && state.black) {
      learnedRound = state.round
      const judgeId = state.czarId
      const winning = state.winningCards
      if (!judgeId || !winning) return
      const losers = state.submissions
        .filter((s) => s.playerId !== state.winnerId)
        .map((s) => s.cards)
      if (losers.length === 0) return

      for (const bot of bots) {
        if (bot.id === judgeId) continue
        const next = learnFrom(modelFor(bot.id, judgeId) ?? {}, state.black, winning, losers)
        remember(bot.id, judgeId, next)
      }
    }
  }

  return {
    sync,
    destroy() {
      destroyed = true
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    },
  }
}
