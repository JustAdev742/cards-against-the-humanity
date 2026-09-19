# Cards Against The Humanity

Cards Against Humanity for a living room. Put the TV on the big screen, everyone
else joins from their phone. No app to install, no account, and no game server:
the TV hosts the game and the phones talk to it directly.

The full 2022 print-and-play deck is included — 100 black cards and 500 white
cards, transcribed from the official PDF.

## How a game goes

1. Open the site on whatever is plugged into the TV and pick **I'm the TV**.
   It shows a four-letter code and a QR code.
2. Everyone else opens the same site on their phone, scans the code or types the
   four letters, and picks a name. Three players minimum, ten maximum.
3. The first person to sit down starts the game.
4. Each round, the TV shows a black card. Everyone except the Card Czar picks an
   answer on their phone. Nobody sees anyone else's pick.
5. Once every answer is in, the Czar turns them over one at a time from their
   phone. Each card fills into the black card on the TV as it is read out.
6. The Czar picks the funniest one. That player gets a point. First to seven
   wins.

The Czar rotates each round, and hands refill to ten cards automatically.

## Two decks

| Deck | Cards | For |
| --- | --- | --- |
| Full | 500 white, 100 black | The game as printed. Adults. |
| Family | 237 white, 84 black | About twelve and up. |

The family deck removes the adult cards rather than bleeping them: a starred-out
word is not a joke any more, so those cards are simply never dealt. Anything
sexual, any drug reference, any slur, and the cards about suicide, self-harm and
real atrocities are all out. What is left is the absurd half of the deck, which
is most of what makes the game funny.

Pick the deck in the lobby, before the game starts. Everyone's phone shows which
deck is in play.

`test/engine.test.ts` enforces this: every family card has to exist in the
printed deck, the deck has to be big enough for ten players, and no family card
may match a list of adult terms. If a card is ever misfiled, the tests fail.

## House rules

**Rando Cardrissian** can be dealt in from the lobby. A random card is played for
an imaginary player every round. If Rando wins, everyone should feel bad. Rando
cannot win the game, only individual rounds.

## Running it

```bash
npm install
npm run dev
```

Then open the address it prints. To play across devices on the same wifi, use
the network address Vite shows rather than `localhost`.

```bash
npm test          # game rules and deck integrity
npm run build     # production build into dist/
npm run typecheck
```

## Deploying

The build is a static site with a relative base, so it works from any path.
Pushing to `main` publishes it to GitHub Pages through
`.github/workflows/deploy.yml`. Enable it once under **Settings → Pages → Build
and deployment → Source → GitHub Actions**.

Anything that serves static files will do.

## How it works without a server

The TV is the host and the only authority. It owns the deck, the hands and the
scores, and it re-checks every move a phone sends: a phone cannot play a card it
does not hold, play twice, play out of turn, or judge a round it is not judging.

Phones reach the TV over WebRTC data channels, brokered by the public PeerJS
signalling server. The room code becomes the peer id. Signalling is the only
thing that touches the network; the game itself is peer to peer, so no card text
and no player name ever reaches a server we run. There isn't one.

If a phone reloads or drops off wifi, it reconnects to the same seat with the
same hand and score, because its player id is kept in `localStorage`.

To point at your own PeerJS broker instead of the public one, add
`?peer=host:port` to the URL.

### Layout

```
src/
  data/          The decks. black.json and white.json are the printed deck;
                 family-*.json are allowlists of exact card text.
  game/          Rules. Pure functions, no network, no React.
  net/           Host (TV), client (phone), and the message protocol.
  ui/            Cards, buttons, the code input, the deck picker.
  screens/       Home, Tv, Phone.
```

The rules layer knows nothing about the network, and the network layer knows
nothing about React, so the whole game can be played out in tests.

## Known limits

- **Three players minimum.** Two people cannot play: someone has to judge.
- **One player per browser profile.** Seats are keyed to `localStorage`, so two
  people on one phone would share a seat. In practice everyone has their own.
- **WebRTC needs to get through.** On most home wifi this is fine. On a locked
  down corporate or guest network the phones may not reach the TV, since there
  is no TURN relay configured.
- **The public signalling broker is free and occasionally busy.** If a table
  will not open, reload. The TV takes a new code automatically if the one it
  picked is taken.

## Credits and licence

*Cards Against Humanity* is by Cards Against Humanity LLC and is distributed
under a [Creative Commons BY-NC-SA 2.0 licence][cc]. The card text here was
transcribed from their official 2022 print-and-play PDF.

This is an unofficial, non-commercial fan implementation. It is not affiliated
with, endorsed by, or connected to Cards Against Humanity LLC. Under Share
Alike, it is released under the same licence: see [LICENSE.md](LICENSE.md). You
may not sell it or any derivative of it.

The room code input is adapted from the [21st.dev][21st] OTP input component.

[cc]: https://creativecommons.org/licenses/by-nc-sa/2.0/
[21st]: https://21st.dev/@ddoemonn/components/otp-input
