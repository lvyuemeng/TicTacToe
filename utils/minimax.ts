import { Match as M, Option as O, Effect as E, pipe } from "effect"
import type { Effect } from "effect/Effect"
import type { Board, GameState, GameStatus, Pos, Player as Playertype } from "./game"
import { Player, TicTactoe } from "./game"

// Types
type MinimaxScore = number
type MinimaxRecord = {
	readonly moveScore: MinimaxScore,
	readonly pos: O.Option<Pos>
}

// Main Service
export const Minimax = {
	make: (maxDepth: number) => ({
		isMaximizing: (player: Player): boolean =>
			pipe(
				player,
				M.type<Playertype>().pipe(
					M.when(p => p === Player.X, () => true),
					M.when(p => p === Player.O, () => false),

					// wierd type check
					M.orElse(() => false)
				)
			),

		evaluate: (state: GameStatus): MinimaxScore =>
			pipe(
				state,
				M.type<GameStatus>().pipe(
					M.when({ _tag: 'Winner' }, ({ player }) =>
						Minimax.make(maxDepth).isMaximizing(player) ? 1 : -1
					),
					M.when({ _tag: 'Draw' }, () => 0),
					M.when({ _tag: 'Progress' }, () => 0),
					M.exhaustive
				)
			),

		getBestMove: (gameState: GameState<Board>) =>
			pipe(
				minimax(gameState, maxDepth, gameState.currentPlayer),
				E.map(result => result.pos)
			)
	})
}

// Core minimax algorithm
const minimax = (
	gameState: GameState<Board>,
	depth: number,
	player: Player
): E.Effect<MinimaxRecord, Error> =>
	E.gen(function* (_) {
		const score = Minimax.make(depth).evaluate(gameState.status)

		if (gameState.status._tag !== 'Progress' || depth === 0) {
			return { moveScore: score, pos: O.none() }
		}

		const moves = yield* TicTactoe.getAvailableMoves(gameState)

		if (O.isNone(moves)) {
			return { moveScore: score, pos: O.none() }
		}

		const { bestScore, scoreFn } = getSearchParams(player)

		return yield* pipe(
			moves.value,
			E.reduce(
				{ moveScore: bestScore, pos: O.none<Pos>() },
				(acc, move) => evaluateMove(gameState, move, depth, player, acc, scoreFn)
			)
		)
	})

// Helper functions
const getSearchParams = (player: Player) =>
	Minimax.make(0).isMaximizing(player)
		? { bestScore: -Infinity, scoreFn: Math.max }
		: { bestScore: Infinity, scoreFn: Math.min }

const evaluateMove = (
	state: GameState<Board>,
	move: Pos,
	depth: number,
	player: Player,
	acc: MinimaxRecord,
	scoreFn: (a: number, b: number) => number
) =>
	pipe(
		TicTactoe.makeMove(move)(state),
		E.flatMap(newState =>
			minimax(newState, depth - 1, TicTactoe.opponent(player))
		),
		E.map(({ moveScore: score }) =>
			scoreFn(score, acc.moveScore) === score
				? { moveScore: score, pos: O.some(move) }
				: acc
		)
	)