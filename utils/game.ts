import { Effect, Option as O } from "effect";
import { Effect as E } from "effect";
import { Match as M } from "effect";

export type { GameState, GameStatus }
export { TicTacToe }

type GameSlot = 'X' | 'O' | ' ';
type Board = GameSlot[][]
type Pos = [number, number]

enum Player {
	X = 'X',
	O = 'O'
}

type GameStatus = { type: 'Winner'; Player: Player } | { type: 'Draw' } | { type: 'Progress' }

type GameState<T> = {
	readonly game: T;
	readonly currentPlayer: Player;
	readonly status: GameStatus;
};

class TicTacToe {
	private _state: GameState<Board>;

	constructor(size: number) {
		this._state = {
			game: Array.from({ length: size }, () => Array(size).fill(' ')),
			currentPlayer: Math.random() < 0.5 ? Player.X : Player.O,
			status: { type: 'Progress' }
		}
	}
	static init(size: number): E.Effect<TicTacToe, Error> {
		if (size < 3) {
			return Effect.fail(new Error("Board size must be at least 3"))
		}
		return Effect.succeed(new TicTacToe(size))
	}

	boundCheck(row: number, col: number): boolean {
		return !(row < 0 || row >= this._state.game.length || col < 0 || col >= this._state.game.length)
	}

	makeMove(pos: Pos) {
		const [row, col] = pos;

		if (this._state.status.type !== "Progress") {
			return Effect.fail(new Error("Game is already finished"));
		}

		if (!this.boundCheck(row, col)) {
			return Effect.fail(new Error("Invalid Position"));
		}

		if (this._state.game[row][col] !== ' ') {
			return Effect.fail(new Error("Pos already taken"))
		}

		this._state.game[row][col] = this._state.currentPlayer;

		return Effect.succeed(this._state)
	}


	displayBoard(): void {
		const state = this._state.game

		state.forEach(row => {
			console.log(row.join('|'))
			console.log('-'.repeat(state.length * 2 - 1))
		})
	}

	displayStatus(): void {
		const status = this._state.status
		const match = M.type<GameStatus>().pipe(
			M.when({ type: 'Draw' }, (_) => "The Game is on draw!"),
			M.when({ type: "Progress" }, (_) => "The Game is on progress!"),
			M.when({ type: "Winner" }, (winner) => `The winner of the game is ${winner}`),
			M.exhaustive
		)

		console.log(match(status))
	}
}
