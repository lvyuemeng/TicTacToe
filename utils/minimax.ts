import { Match as M, Option, pipe } from "effect";
import { Option as O } from "effect";
import { Effect as E } from "effect";
import { TicTacToe, Player } from "./game";
import { type GameStatus, type Pos } from "./game";
import type { Effect } from "effect/Effect";
import { gen, bind } from "effect/Option";

export { TicTacToeMinimax }

type MinimaxScore = number
type MinimaxRecord = {
	moveScore: MinimaxScore,
	pos: O.Option<Pos>
}
interface Minimax<T> {
	isMaximizing(player: Player): boolean
	eval(gameState: T): MinimaxScore
	minimax(gameState: TicTacToe, depth: number, palyer: Player): E.Effect<MinimaxRecord>
}

class TicTacToeMinimax implements Minimax<TicTacToe> {
	private max_depth: number

	constructor(max_depth: number) {
		this.max_depth = max_depth
	}

	isMaximizing(player: Player): boolean {
		return M.value<Player>(player).pipe(
			M.when((p: Player) => p === Player.X, (_) => true),
			M.when((p: Player) => p === Player.O, (_) => false),
			M.exhaustive
		)
	}

	eval(gameState: TicTacToe): MinimaxScore {
		const status = gameState.Status

		return M.value<GameStatus>(status).pipe(
			M.when({ type: 'Winner' }, (winner) => {
				if (this.isMaximizing(winner.Player)) {
					return 1
				} else {
					return -1
				}
			}),
			M.when({ type: 'Draw' }, (_) => 0),
			M.when({ type: "Progress" }, (_) => 0),
			M.exhaustive
		)

	}

	minimax(gameState: TicTacToe, depth: number, player: Player): E.Effect<MinimaxRecord> {
		return E.gen(function* (this: TicTacToeMinimax) {
			const score = this.eval(gameState);
			const moves = yield* gameState.getMove();

			const isMax = () => {
				if (this.isMaximizing(player)) {
					return { bestScore: -Infinity, nextPlayer: gameState.opponent(), scoreFn: Math.max };
				} else {
					return { bestScore: Infinity, nextPlayer: gameState.opponent(), scoreFn: Math.min };
				}
			};

			if (gameState.Status.type !== 'Progress' || depth === 0) {
				return { moveScore: score, pos: O.none() };
			}

			if (O.isSome(moves)) {
				const movesIn = moves.value;
				const { bestScore, nextPlayer, scoreFn } = isMax();

				return yield* E.reduce(
					movesIn,
					{ moveScore: bestScore, pos: O.none<Pos>() },
					(acc, move) =>
						E.gen(function* (this: TicTacToeMinimax) {
							const newState = yield* gameState.copy();
							newState.makeMove(move);
							const { moveScore: score } = yield* this.minimax(newState, depth - 1, nextPlayer);

							// Update the best score and position if the current move is better
							return scoreFn(score, acc.moveScore) === score
								? { moveScore: score, pos: O.some(move) }
								: acc;
						}.bind(this))
				);
			} else {
				return { moveScore: score, pos: O.none() };
			}
		}.bind(this));
	}

	public getBestPos(gameState: TicTacToe): E.Effect<O.Option<Pos>> {
		return E.gen(function* (this: TicTacToeMinimax) {
			const player = gameState.currentPlayer;
			const { moveScore: _, pos } = yield* this.minimax(gameState, this.max_depth, player);
			return pos;
		}.bind(this));
	}

}