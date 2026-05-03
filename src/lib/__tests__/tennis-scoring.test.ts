import {
  applyPoint,
  createInitialState,
  getDisplayScore,
  isMatchFinished,
  replayEvents,
  undoLastPoint,
  type MatchConfig,
  type MatchState,
  type ScoreEventRecord,
} from '../tennis-scoring'

const defaultConfig: MatchConfig = {
  numSets: 3,
  gamesPerSet: 6,
  tiebreakSets: true,
  matchTiebreak: true,
  noAd: false,
}

function pointsTo(state: MatchState, team: 1 | 2, n: number): MatchState {
  for (let i = 0; i < n; i++) {
    state = applyPoint(state, team)
  }
  return state
}

function winGame(state: MatchState, team: 1 | 2): MatchState {
  return pointsTo(state, team, 4)
}

function winGames(state: MatchState, team: 1 | 2, n: number): MatchState {
  for (let i = 0; i < n; i++) {
    state = winGame(state, team)
  }
  return state
}

// ─── createInitialState ───────────────────────────────────────────────────────

describe('createInitialState', () => {
  it('creates correct initial state', () => {
    const state = createInitialState(defaultConfig, 1)
    expect(state.status).toBe('pending')
    expect(state.winner).toBeNull()
    expect(state.sets).toHaveLength(0)
    expect(state.currentGame.points).toEqual([0, 0])
    expect(state.servingTeam).toBe(1)
  })
})

// ─── Normal game scoring ──────────────────────────────────────────────────────

describe('normal game scoring', () => {
  let state: MatchState

  beforeEach(() => {
    state = createInitialState(defaultConfig, 1)
  })

  it('advances status to running on first point', () => {
    state = applyPoint(state, 1)
    expect(state.status).toBe('running')
  })

  it('wins a game cleanly (4 points, no deuce)', () => {
    state = pointsTo(state, 1, 4)
    const set = state.sets[0]
    expect(set.games[0]).toBe(1)
    expect(set.games[1]).toBe(0)
    expect(state.currentGame.points).toEqual([0, 0])
  })

  it('transitions through 0:0 → 15:0 → 30:0 → 40:0 → game', () => {
    const display0 = getDisplayScore(state)
    expect(display0.game).toBe('0:0')

    state = applyPoint(state, 1)
    expect(getDisplayScore(state).game).toBe('15:0')

    state = applyPoint(state, 1)
    expect(getDisplayScore(state).game).toBe('30:0')

    state = applyPoint(state, 1)
    expect(getDisplayScore(state).game).toBe('40:0')

    state = applyPoint(state, 1)
    // Game won, new game started
    expect(getDisplayScore(state).game).toBe('0:0')
  })

  it('scores correctly for team 2', () => {
    state = applyPoint(state, 2)
    expect(getDisplayScore(state).game).toBe('0:15')
    state = applyPoint(state, 2)
    expect(getDisplayScore(state).game).toBe('0:30')
  })

  it('mixed scoring: 15:30', () => {
    state = applyPoint(state, 1)
    state = applyPoint(state, 2)
    state = applyPoint(state, 2)
    expect(getDisplayScore(state).game).toBe('15:30')
  })
})

// ─── Deuce and advantage ──────────────────────────────────────────────────────

describe('deuce and advantage', () => {
  let state: MatchState

  beforeEach(() => {
    state = createInitialState(defaultConfig, 1)
    // Get to 40:40 (deuce): 3 points each
    state = pointsTo(state, 1, 3)
    state = pointsTo(state, 2, 3)
  })

  it('shows Einstand at 40:40', () => {
    expect(getDisplayScore(state).game).toBe('Einstand')
  })

  it('gives advantage to team 1 after scoring from deuce', () => {
    state = applyPoint(state, 1)
    expect(getDisplayScore(state).game).toBe('Vorteil')
    expect(state.currentGame.advantage).toBe(1)
  })

  it('reverts advantage to deuce when opponent scores', () => {
    state = applyPoint(state, 1) // advantage team 1
    state = applyPoint(state, 2) // back to deuce
    expect(getDisplayScore(state).game).toBe('Einstand')
    expect(state.currentGame.advantage).toBeNull()
  })

  it('wins game from advantage (team 1)', () => {
    state = applyPoint(state, 1) // advantage
    state = applyPoint(state, 1) // win
    const set = state.sets[0]
    expect(set.games[0]).toBe(1)
    expect(state.currentGame.points).toEqual([0, 0])
  })

  it('wins game from advantage (team 2)', () => {
    state = applyPoint(state, 2) // advantage team 2
    state = applyPoint(state, 2) // win
    const set = state.sets[0]
    expect(set.games[1]).toBe(1)
  })

  it('can have multiple deuce cycles', () => {
    state = applyPoint(state, 1)  // adv 1
    state = applyPoint(state, 2)  // deuce
    state = applyPoint(state, 2)  // adv 2
    state = applyPoint(state, 1)  // deuce
    state = applyPoint(state, 1)  // adv 1
    state = applyPoint(state, 1)  // win
    expect(state.sets[0].games[0]).toBe(1)
  })
})

// ─── No-Ad scoring ───────────────────────────────────────────────────────────

describe('no-ad scoring', () => {
  const noAdConfig: MatchConfig = { ...defaultConfig, noAd: true }

  it('wins game at deuce (sudden death)', () => {
    let state = createInitialState(noAdConfig, 1)
    state = pointsTo(state, 1, 3) // 40:0
    state = pointsTo(state, 2, 3) // 40:40
    state = applyPoint(state, 1)  // sudden death win
    expect(state.sets[0].games[0]).toBe(1)
    expect(state.currentGame.points).toEqual([0, 0])
  })
})

// ─── Serve changes ───────────────────────────────────────────────────────────

describe('serve changes', () => {
  let state: MatchState

  beforeEach(() => {
    state = createInitialState(defaultConfig, 1)
  })

  it('serve changes after each game', () => {
    expect(state.servingTeam).toBe(1)
    state = winGame(state, 1)
    expect(state.servingTeam).toBe(2)
    state = winGame(state, 2)
    expect(state.servingTeam).toBe(1)
  })

  it('serve stays during a game', () => {
    state = applyPoint(state, 1)
    expect(state.servingTeam).toBe(1)
    state = applyPoint(state, 2)
    expect(state.servingTeam).toBe(1)
  })
})

// ─── Set completion ──────────────────────────────────────────────────────────

describe('set completion', () => {
  let state: MatchState

  beforeEach(() => {
    state = createInitialState(defaultConfig, 1)
  })

  it('wins set 6:0', () => {
    state = winGames(state, 1, 6)
    expect(state.sets[0].games).toEqual([6, 0])
    expect(state.sets[0].winner).toBe(1)
    expect(state.currentSet).toBe(1)
  })

  it('wins set 6:4', () => {
    state = winGames(state, 1, 4)
    state = winGames(state, 2, 4)
    state = winGames(state, 1, 2)
    expect(state.sets[0].games).toEqual([6, 4])
    expect(state.sets[0].winner).toBe(1)
  })

  it('requires 2-game lead (7:5)', () => {
    state = winGames(state, 1, 5)
    state = winGames(state, 2, 5)
    // 5:5 — no set win yet
    expect(state.sets.length === 0 || state.sets[0].winner === null).toBe(true)
    state = winGames(state, 1, 2)
    expect(state.sets[0].games).toEqual([7, 5])
    expect(state.sets[0].winner).toBe(1)
  })

  it('triggers tiebreak at 6:6', () => {
    // Alternate games to reach 6:6 in set 1
    for (let i = 0; i < 6; i++) {
      state = winGame(state, 1)
      state = winGame(state, 2)
    }
    // Score is 6:6 in set 1 → tiebreak
    expect(state.currentGame.isTiebreak).toBe(true)
  })

  it('wins tiebreak 7:0', () => {
    for (let i = 0; i < 6; i++) {
      state = winGame(state, 1)
      state = winGame(state, 2)
    }
    state = pointsTo(state, 1, 7) // 7:0 tiebreak
    expect(state.sets[0].winner).toBe(1)
    expect(state.sets[0].isTiebreak).toBe(true)
    expect(state.currentSet).toBe(1)
  })

  it('requires 2-point lead in tiebreak', () => {
    for (let i = 0; i < 6; i++) {
      state = winGame(state, 1)
      state = winGame(state, 2)
    }
    // In tiebreak at 6:6; alternate to reach 6:6 in tiebreak points
    for (let i = 0; i < 6; i++) {
      state = applyPoint(state, 1)
      state = applyPoint(state, 2)
    }
    // Tiebreak: 6:6 — score one more each to reach 7:7
    state = applyPoint(state, 1)  // 7:6 — not won (lead = 1)
    state = applyPoint(state, 2)  // 7:7 — no win
    expect(state.currentGame.isTiebreak).toBe(true)
    expect(state.sets[0].winner).toBeNull()
    state = applyPoint(state, 1)  // 8:7 — not won
    expect(state.sets[0].winner).toBeNull()
    state = applyPoint(state, 1)  // 9:7 — win (lead = 2)
    expect(state.sets[0].winner).toBe(1)
  })
})

// ─── Match tiebreak ──────────────────────────────────────────────────────────

describe('match tiebreak', () => {
  it('plays match tiebreak instead of 3rd set', () => {
    let state = createInitialState(defaultConfig, 1)
    // Win first two sets, one each
    state = winGames(state, 1, 6)  // set 1: team 1 wins 6:0
    state = winGames(state, 2, 6)  // set 2: team 2 wins 6:0
    // Now in match tiebreak
    expect(state.currentGame.isMatchTiebreak).toBe(true)
  })

  it('match tiebreak won at 10 with 2-point lead', () => {
    let state = createInitialState(defaultConfig, 1)
    state = winGames(state, 1, 6)
    state = winGames(state, 2, 6)
    state = pointsTo(state, 1, 10) // 10:0
    expect(isMatchFinished(state)).toBe(true)
    expect(state.winner).toBe(1)
  })

  it('match tiebreak requires 2-point lead at 10+', () => {
    let state = createInitialState(defaultConfig, 1)
    state = winGames(state, 1, 6)
    state = winGames(state, 2, 6)
    // Score to 9:9 in match tiebreak without anyone winning
    state = pointsTo(state, 1, 9)
    state = pointsTo(state, 2, 9)  // 9:9
    expect(isMatchFinished(state)).toBe(false)
    state = applyPoint(state, 1)   // 10:9 — not enough (lead = 1)
    expect(isMatchFinished(state)).toBe(false)
    state = applyPoint(state, 2)   // 10:10
    expect(isMatchFinished(state)).toBe(false)
    state = applyPoint(state, 2)   // 10:11
    expect(isMatchFinished(state)).toBe(false)
    state = applyPoint(state, 2)   // 10:12 — team 2 wins (lead = 2)
    expect(isMatchFinished(state)).toBe(true)
    expect(state.winner).toBe(2)
  })
})

// ─── Full 3-set match ─────────────────────────────────────────────────────────

describe('full 3-set match', () => {
  it('team 1 wins 2:0 (6:0, 6:0)', () => {
    let state = createInitialState(defaultConfig, 1)
    state = winGames(state, 1, 6)
    state = winGames(state, 1, 6)
    expect(isMatchFinished(state)).toBe(true)
    expect(state.winner).toBe(1)
  })

  it('team 2 wins 2:1', () => {
    let state = createInitialState(defaultConfig, 1)
    state = winGames(state, 1, 6)  // set 1: T1
    state = winGames(state, 2, 6)  // set 2: T2
    // Match tiebreak
    state = pointsTo(state, 2, 10) // T2 wins match TB
    expect(isMatchFinished(state)).toBe(true)
    expect(state.winner).toBe(2)
  })
})

// ─── Best of 1 ───────────────────────────────────────────────────────────────

describe('best of 1', () => {
  const config: MatchConfig = { ...defaultConfig, numSets: 1, matchTiebreak: false }

  it('finishes after 1 set', () => {
    let state = createInitialState(config, 1)
    state = winGames(state, 1, 6)
    expect(isMatchFinished(state)).toBe(true)
    expect(state.winner).toBe(1)
  })
})

// ─── getDisplayScore ──────────────────────────────────────────────────────────

describe('getDisplayScore', () => {
  it('returns correct sets in display', () => {
    let state = createInitialState(defaultConfig, 1)
    state = winGames(state, 1, 6)  // set 1 done
    state = applyPoint(state, 2)   // 1 point into set 2

    const display = getDisplayScore(state)
    expect(display.sets).toHaveLength(2)
    expect(display.sets[0]).toMatchObject({ team1: 6, team2: 0, isCurrent: false })
    expect(display.sets[1]).toMatchObject({ isCurrent: true })
    expect(display.game).toBe('0:15')
  })

  it('shows server correctly', () => {
    let state = createInitialState(defaultConfig, 2)
    expect(getDisplayScore(state).server).toBe(2)
    state = winGame(state, 1) // serve switches
    expect(getDisplayScore(state).server).toBe(1)
  })
})

// ─── undoLastPoint ───────────────────────────────────────────────────────────

describe('undoLastPoint', () => {
  it('reverts to prior state', () => {
    const state0 = createInitialState(defaultConfig, 1)
    const state1 = applyPoint(state0, 1) // 15:0
    const state2 = applyPoint(state1, 1) // 30:0

    const events: ScoreEventRecord[] = [
      {
        id: '1',
        scoringTeam: 1,
        pointBefore: state0,
        pointAfter: state1,
        isUndone: false,
        eventType: 'point',
      },
      {
        id: '2',
        scoringTeam: 1,
        pointBefore: state1,  // 15:0 — this is what undo returns
        pointAfter: state2,
        isUndone: false,
        eventType: 'point',
      },
    ]

    const result = undoLastPoint(state2, events)
    expect(result.currentGame.points).toEqual([1, 0]) // back to 15:0
  })

  it('undo reverts set completion', () => {
    let state = createInitialState(defaultConfig, 1)
    // Win 5 games
    state = winGames(state, 1, 5)
    // Score 3 points of game 6
    state = pointsTo(state, 1, 3)

    const stateBefore40 = state
    state = applyPoint(state, 1) // game + set won

    expect(state.sets[0].winner).toBe(1)

    const events: ScoreEventRecord[] = [
      {
        id: '1',
        scoringTeam: 1,
        pointBefore: stateBefore40,
        pointAfter: state,
        isUndone: false,
        eventType: 'point',
      },
    ]

    state = undoLastPoint(state, events)
    expect(state.sets[0]?.winner ?? null).toBeNull()
    expect(state.currentGame.points[0]).toBe(3)
  })
})

// ─── replayEvents ─────────────────────────────────────────────────────────────

describe('replayEvents', () => {
  it('replays events to reconstruct state', () => {
    const initialState = createInitialState(defaultConfig, 1)
    let built = initialState
    const events: ScoreEventRecord[] = []

    for (let i = 0; i < 3; i++) {
      const before = built
      built = applyPoint(built, 1)
      events.push({
        id: String(i),
        scoringTeam: 1,
        pointBefore: before,
        pointAfter: built,
        isUndone: false,
        eventType: 'point',
      })
    }

    const replayed = replayEvents(defaultConfig, 1, events)
    expect(replayed.currentGame.points).toEqual([3, 0])
  })

  it('skips undone events', () => {
    const initialState = createInitialState(defaultConfig, 1)
    let s = initialState
    const before = s
    s = applyPoint(s, 1)

    const events: ScoreEventRecord[] = [
      {
        id: '1',
        scoringTeam: 1,
        pointBefore: before,
        pointAfter: s,
        isUndone: true, // undone!
        eventType: 'point',
      },
    ]

    const replayed = replayEvents(defaultConfig, 1, events)
    expect(replayed.currentGame.points).toEqual([0, 0])
  })
})
