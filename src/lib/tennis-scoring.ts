// Tennis scoring engine — pure functions, no side effects

export type MatchConfig = {
  numSets: number       // 1 | 3 | 5
  gamesPerSet: number   // usually 6
  tiebreakSets: boolean // tiebreak at gamesPerSet:gamesPerSet
  matchTiebreak: boolean // 10-point match tiebreak instead of final set
  noAd: boolean         // sudden-death at deuce
}

export type GameScore = {
  points: [number, number] // raw point count for each team
  isDeuce: boolean
  advantage: 1 | 2 | null
  isTiebreak: boolean
  isMatchTiebreak: boolean
}

export type SetScore = {
  games: [number, number]
  isTiebreak: boolean
  winner: 1 | 2 | null
}

export type MatchState = {
  config: MatchConfig
  sets: SetScore[]
  currentSet: number  // 0-indexed
  currentGame: GameScore
  servingTeam: 1 | 2
  winner: 1 | 2 | null
  status: 'pending' | 'running' | 'finished'
}

export type DisplayScore = {
  sets: Array<{ team1: number; team2: number; isTiebreak: boolean; isCurrent: boolean }>
  game: string  // "0:0", "15:30", "Einstand", "Vorteil"
  server: 1 | 2
  advantage: 1 | 2 | null
}

export type ScoreEventRecord = {
  id: string
  scoringTeam: 1 | 2 | null
  pointBefore: MatchState | null
  pointAfter: MatchState | null
  isUndone: boolean
  eventType: 'point' | 'undo' | 'correction' | 'serve_change'
}

const POINT_LABELS = ['0', '15', '30', '40']

export function createInitialState(config: MatchConfig, servingTeam: 1 | 2): MatchState {
  return {
    config,
    sets: [],
    currentSet: 0,
    currentGame: makeNewGame(false, false),
    servingTeam,
    winner: null,
    status: 'pending',
  }
}

function makeNewGame(isTiebreak: boolean, isMatchTiebreak: boolean): GameScore {
  return {
    points: [0, 0],
    isDeuce: false,
    advantage: null,
    isTiebreak,
    isMatchTiebreak,
  }
}

function setsNeededToWin(config: MatchConfig): number {
  return Math.ceil(config.numSets / 2)
}

export function applyPoint(state: MatchState, scoringTeam: 1 | 2): MatchState {
  if (state.winner) return state

  const s = scoringTeam === 1 ? 0 : 1

  // Increment points for this team
  const newPoints: [number, number] = [state.currentGame.points[0], state.currentGame.points[1]]
  newPoints[s]++
  const sp = newPoints[s]    // scorer's new points
  const op = newPoints[1-s]  // opponent's points (unchanged)

  const isTb = state.currentGame.isTiebreak
  const isMTb = state.currentGame.isMatchTiebreak

  // Determine if game is won and update deuce/advantage
  let gameWon = false
  let newIsDeuce = state.currentGame.isDeuce
  let newAdvantage = state.currentGame.advantage

  if (isMTb || isTb) {
    const target = isMTb ? 10 : 7
    gameWon = sp >= target && sp - op >= 2
    // isDeuce/advantage not applicable in tiebreaks
  } else {
    // Normal game
    if (sp <= 2) {
      // 0/15/30 territory — no win possible
      newIsDeuce = false
      newAdvantage = null
    } else if (sp >= 4 && op <= 2) {
      // Simple win: 4:0, 4:1, 4:2 (opponent hasn't reached deuce territory)
      gameWon = true
    } else if (sp >= 3 && op >= 3) {
      // Both sides at 40+: deuce territory
      if (sp === op) {
        // Equal score: (back to) deuce
        newIsDeuce = true
        newAdvantage = null
      } else if (state.config.noAd) {
        // No-Ad: any point from deuce wins (scorer has sp > op)
        gameWon = true
      } else {
        const lead = sp - op
        if (lead >= 2) {
          // Win from advantage
          gameWon = true
          newAdvantage = scoringTeam
        } else {
          // lead === 1: gain advantage
          newAdvantage = scoringTeam
          newIsDeuce = false
        }
      }
    }
    // else: sp === 3 and op <= 2 (40:0/15/30) — not won yet
  }

  // Mid-tiebreak serve change (only when game not ending)
  let servingTeam = state.servingTeam
  if ((isTb || isMTb) && !gameWon) {
    const totalAfter = sp + op
    // Serve changes after odd totals: 1, 3, 5, 7, ...
    if (totalAfter % 2 === 1) {
      servingTeam = servingTeam === 1 ? 2 : 1
    }
  }

  if (!gameWon) {
    return {
      ...state,
      status: state.status === 'pending' ? 'running' : state.status,
      currentGame: {
        ...state.currentGame,
        points: newPoints,
        isDeuce: newIsDeuce,
        advantage: newAdvantage,
      },
      servingTeam,
    }
  }

  // ─── Game is won ───────────────────────────────────────────────────────────

  // Ensure sets array contains the current set
  const sets: SetScore[] = [...state.sets]
  while (sets.length <= state.currentSet) {
    sets.push({ games: [0, 0], isTiebreak: false, winner: null })
  }

  // Increment games in the current set
  const updatedGames: [number, number] = [sets[state.currentSet].games[0], sets[state.currentSet].games[1]]
  updatedGames[s]++
  const sg = updatedGames[s]    // scorer's games
  const og = updatedGames[1-s]  // opponent's games
  sets[state.currentSet] = { ...sets[state.currentSet], games: updatedGames }

  // Compute serve for next game/set
  // Tiebreak: next set's server = opposite of who served first in tiebreak
  // Normal game: simply flip
  let newServingTeam: 1 | 2
  if (isTb || isMTb) {
    // sp + op = total tiebreak points after winning point
    const totalT = sp + op
    // Number of mid-game serve changes = floor(totalT / 2)
    const numChanges = Math.floor(totalT / 2)
    // Initial tiebreak server: flip servingTeam back by numChanges
    const initialTBServer: 1 | 2 = numChanges % 2 === 0
      ? state.servingTeam
      : (state.servingTeam === 1 ? 2 : 1)
    // Next set server = opposite of initial tiebreak server
    newServingTeam = initialTBServer === 1 ? 2 : 1
  } else {
    newServingTeam = state.servingTeam === 1 ? 2 : 1
  }

  // Check if set is won
  let setWon: boolean
  let setIsTiebreak = sets[state.currentSet].isTiebreak
  if (isMTb || isTb) {
    setWon = true
    setIsTiebreak = true
  } else {
    setWon = sg >= state.config.gamesPerSet && sg - og >= 2
  }

  sets[state.currentSet] = { ...sets[state.currentSet], isTiebreak: setIsTiebreak }

  if (!setWon) {
    // Check if the next game should be a tiebreak
    const nextIsTiebreak =
      state.config.tiebreakSets &&
      updatedGames[0] === state.config.gamesPerSet &&
      updatedGames[1] === state.config.gamesPerSet

    return {
      ...state,
      status: 'running',
      sets,
      servingTeam: newServingTeam,
      currentGame: makeNewGame(nextIsTiebreak, false),
    }
  }

  // ─── Set is won ────────────────────────────────────────────────────────────
  sets[state.currentSet] = { ...sets[state.currentSet], winner: scoringTeam }

  const wins1 = sets.filter(s2 => s2.winner === 1).length
  const wins2 = sets.filter(s2 => s2.winner === 2).length
  const needed = setsNeededToWin(state.config)

  const matchWinner: 1 | 2 | null = wins1 >= needed ? 1 : wins2 >= needed ? 2 : null

  if (matchWinner) {
    return {
      ...state,
      status: 'finished',
      sets,
      winner: matchWinner,
      currentGame: makeNewGame(false, false),
      servingTeam: newServingTeam,
    }
  }

  // Start next set
  const nextSetIndex = state.currentSet + 1
  const nextIsMatchTb =
    state.config.matchTiebreak &&
    wins1 === needed - 1 &&
    wins2 === needed - 1

  return {
    ...state,
    status: 'running',
    sets,
    currentSet: nextSetIndex,
    servingTeam: newServingTeam,
    currentGame: makeNewGame(false, nextIsMatchTb),
    winner: null,
  }
}

export function undoLastPoint(state: MatchState, events: ScoreEventRecord[]): MatchState {
  // Find the last non-undone point event and return its pointBefore
  const activeEvents = events.filter(e => !e.isUndone && e.eventType === 'point')
  const lastEvent = activeEvents.at(-1)

  if (!lastEvent?.pointBefore) return state

  return lastEvent.pointBefore
}

export function getDisplayScore(state: MatchState): DisplayScore {
  const sets: DisplayScore['sets'] = state.sets.map((set, i) => ({
    team1: set.games[0],
    team2: set.games[1],
    isTiebreak: set.isTiebreak,
    isCurrent: i === state.currentSet && !set.winner,
  }))

  // If the current set hasn't been added to state.sets yet (0 games played)
  if (state.status === 'running' && sets.length <= state.currentSet) {
    sets.push({
      team1: 0,
      team2: 0,
      isTiebreak: state.currentGame.isTiebreak || state.currentGame.isMatchTiebreak,
      isCurrent: true,
    })
  }

  const game = state.status === 'finished' ? '' : gameScoreLabel(state.currentGame)

  return { sets, game, server: state.servingTeam, advantage: state.currentGame.advantage }
}

function gameScoreLabel(game: GameScore): string {
  const [p1, p2] = game.points

  if (game.isMatchTiebreak || game.isTiebreak) {
    return `${p1}:${p2}`
  }

  if (game.advantage !== null) return 'Vorteil'
  if (game.isDeuce || (p1 >= 3 && p2 >= 3 && p1 === p2)) return 'Einstand'

  const l1 = POINT_LABELS[Math.min(p1, 3)] ?? String(p1)
  const l2 = POINT_LABELS[Math.min(p2, 3)] ?? String(p2)
  return `${l1}:${l2}`
}

export function isMatchFinished(state: MatchState): boolean {
  return state.status === 'finished' && state.winner !== null
}

export function replayEvents(
  config: MatchConfig,
  servingTeam: 1 | 2,
  events: ScoreEventRecord[]
): MatchState {
  let state = createInitialState(config, servingTeam)

  for (const event of events) {
    if (event.isUndone) continue

    if (event.eventType === 'point' && event.scoringTeam) {
      state = applyPoint(state, event.scoringTeam)
    } else if (event.eventType === 'correction' && event.pointAfter) {
      state = event.pointAfter
    } else if (event.eventType === 'serve_change') {
      state = { ...state, servingTeam: state.servingTeam === 1 ? 2 : 1 }
    }
  }

  return state
}
