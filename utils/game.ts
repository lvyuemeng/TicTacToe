import { Console, Effect as E, Option as O } from 'effect';
import { Match as M } from "effect";
import type { Effect } from 'effect/Effect';
import { never } from 'effect/Fiber';
import { some } from 'effect/Predicate';

export type { GameState, GameStatus, Pos }
export { TicTacToe, Player }

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
	currentPlayer: Player;
	status: GameStatus;
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
			return E.fail(new Error("Board size must be at least 3"))
		}
		return E.succeed(new TicTacToe(size))
	}

	get currentPlayer(): Player {
		return this._state.currentPlayer
	}

	get Status(): GameStatus {
		return this._state.status
	}

	private boundCheck(row: number, col: number): boolean {
		return !(row < 0 || row >= this._state.game.length || col < 0 || col >= this._state.game.length)
	}

	private checkStatus() {
		return E.suspend(() => {
			const board = this._state.game;
			const checkWinner = (line: GameSlot[]): O.Option<Player> => {
				const [first, ...rest] = line;
				return rest.length > 0 && rest.every(slot => slot === first && slot !== ' ') ? O.some(first as Player) : O.none();
			}

			// Functional mapping to check winners for rows and columns
			const rowWinners = board.map(checkWinner);
			const colWinners = Array.from({ length: board.length }, (_, colIndex) =>
				checkWinner(board.map(row => row[colIndex]))
			);

			// Concatenate all winners
			const allWinners = [...rowWinners, ...colWinners];

			// Check if any winners exist
			const winner = O.firstSomeOf(allWinners);
			if (O.isSome(winner)) {
				this._state.status = { type: 'Winner', Player: winner.value };
				return E.succeed(never);
			}

			// Check diagonals
			const diagWinners = [
				checkWinner(board.map((row, index) => row[index])),
				checkWinner(board.map((row, index) => row[board.length - 1 - index])),
			];

			// Check for diagonal winners
			const diagWinner = diagWinners.find(O.isSome);
			if (diagWinner) {
				this._state.status = { type: 'Winner', Player: diagWinner.value };
				return E.succeed(never);
			}

			// Check for draw
			if (board.flat().every(slot => slot !== ' ')) {
				this._state.status = { type: 'Draw' };
			}

			return E.succeed(never);
		})
	}

	public getMove() {
		return E.suspend(() => {
			const moves = this._state.game.flatMap((row, rowIndex) =>
				row.map(
					(cell, colIndex) => (cell === " " ? [rowIndex, colIndex] as Pos : null)
				).filter((pos): pos is Pos => pos !== null)
			)

			if (moves.length === 0) {
				return E.succeed(O.none())
			}

			return E.succeed(O.some(moves))
		})
	}

	public makeMove(pos: Pos) {
		return E.suspend(() => {
			const [row, col] = pos;

			if (this._state.status.type !== "Progress") {
				return E.fail(new Error("Game is already finished"));
			}

			if (!this.boundCheck(row, col)) {
				return E.fail(new Error("Invalid Position"));
			}

			if (this._state.game[row][col] !== ' ') {
				return E.fail(new Error("Pos already taken"))
			}

			this._state.game[row][col] = this._state.currentPlayer;
			this._state.currentPlayer = this.opponent()
			return this.checkStatus()
		})
	}

	public opponent(): Player {
		if (this.currentPlayer === "X") {
			return ("O" as Player)
		} else {
			return ("X" as Player)
		}
	}

	public copy(): E.Effect<TicTacToe> {
		return E.suspend(() => {
			const newGame = new TicTacToe(this._state.game.length);
			newGame._state = {
				game: this._state.game.map(row => [...row]),
				currentPlayer: this._state.currentPlayer,
				status: { ...this._state.status }
			};
			return E.succeed(newGame)
		})
	}

	public displayBoard() {
		const state = this._state.game
		const boardDisplay = state.map(row => row.join('|')).join('\n' + '-'.repeat(state.length * 2 - 1) + '\n')

		return Console.log(boardDisplay)
	}

	public displayStatus() {
		const status = this._state.status
		const match = M.type<GameStatus>().pipe(
			M.when({ type: 'Draw' }, (_) => "The Game is on draw!"),
			M.when({ type: "Progress" }, (_) => "The Game is on progress!"),
			M.when({ type: "Winner" }, (winner) => `The winner of the game is ${winner.Player}!`),
			M.exhaustive
		)

		return Console.log(match(status))
	}
}
