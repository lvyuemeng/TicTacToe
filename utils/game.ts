import { Console, Effect as E, Option as O, pipe } from 'effect';
import { Match as M } from "effect";

export type GameSlot = 'X' | 'O' | ' '
export type Board = GameSlot[][]
export type Pos = readonly [number, number]

export const Player = {
	X: 'X',
	O: 'O'
} as const

export type Player = typeof Player[keyof typeof Player]

// ADT for Game Status
export type GameStatus =
	| { readonly _tag: 'Winner'; readonly player: Player }
	| { readonly _tag: 'Draw' }
	| { readonly _tag: 'Progress' }

export interface GameState<T> {
	readonly game: T
	readonly currentPlayer: Player
	readonly status: GameStatus
}

export const TicTactoe = {
	// Constructor
	make: (size: number): E.Effect<GameState<Board>, Error> =>
		pipe(
			validateSize(size),
			E.map((size: number) => ({
				game: createEmptyBoard(size),
				currentPlayer: Math.random() < 0.5 ? Player.X : Player.O,
				status: { _tag: 'Progress' }
			}))
		),

	makeMove: (pos: Pos) => (state: GameState<Board>): E.Effect<GameState<Board>, Error> =>
		pipe(
			state,
			validMove(pos),
			E.map(updateBoard(pos)),
			E.map(switchPlayer),
			E.flatMap(updateGameStatus)
		),

	getAvailableMoves: (state: GameState<Board>) =>
		E.succeed(
			pipe(
				state.game,
				getEmptyPos,
				moves => moves.length > 0 ? O.some(moves) : O.none()
			)
		),

	opponent: (player: Player): Player =>
		player === Player.X ? Player.O : Player.X,

	display: {
		board: (state: GameState<Board>) =>
			pipe(
				state.game,
				formatBoard,
				Console.log
			),

		status: (state: GameState<Board>) =>
			pipe(
				state.status,
				formatStatus,
				Console.log
			)
	}
}

// Board State
const createEmptyBoard = (size: number): Board =>
	Array.from({ length: size }, () => Array(size).fill(' '))

const updateBoard = ([row, col]: Pos) => (state: GameState<Board>) => ({
	...state,
	game: state.game.map((r, i) =>
		i === row ? r.map((c, j) => j === col ? state.currentPlayer : c) : r
	)
})

// Player State
const switchPlayer = (state: GameState<Board>) => ({
	...state,
	currentPlayer: TicTactoe.opponent(state.currentPlayer)
})

// Vaild Operation
const validateSize = (size: number) =>
	size < 3
		? E.fail(new Error("Board size must be at least 3"))
		: E.succeed(size)

const validPos = ([row, col]: Pos, board: Board): boolean =>
	row >= 0 && row < board.length && col >= 0 && col < board.length

const EmptyPos = ([row, col]: Pos, board: Board): boolean =>
	board[row][col] === ' '

const validMove = (pos: Pos) => (state: GameState<Board>) =>
	pipe(
		E.succeed(state),
		E.filterOrFail(
			s => s.status._tag === 'Progress',
			() => new Error("Game is already finished")
		),
		E.filterOrFail(
			s => validPos(pos, s.game),
			() => new Error("Invalid position")
		),
		E.filterOrFail(
			s => EmptyPos(pos, s.game),
			() => new Error("Position already taken")
		)
	)

// Status Manage
const updateGameStatus = (state: GameState<Board>) =>
	pipe(
		E.succeed(state),
		E.map(s => ({
			...s,
			status: checkGameStatus(s.game)
		}))
	)

const checkGameStatus = (board: Board): GameStatus => {
	// Check for winner
	const winner = pipe(
		getAllLines(board),
		lines => lines.find(isWinningLine),
		O.fromNullable,
		O.map(line => ({ _tag: 'Winner' as const, player: line[0] as Player }))
	)

	if (O.isSome(winner)) return winner.value

	// Check for draw
	return board.every(row => row.every(cell => cell !== ' '))
		? { _tag: 'Draw' }
		: { _tag: 'Progress' }
}

// Status Manage helper function
const getAllLines = (board: Board): GameSlot[][] => [
	...getRows(board),
	...getColumns(board),
	...getDiagonals(board)
]

const getRows = (board: Board): GameSlot[][] => board

const getColumns = (board: Board): GameSlot[][] =>
	board[0].map((_, i) => board.map(row => row[i]))

const getDiagonals = (board: Board): GameSlot[][] => [
	board.map((row, i) => row[i]),
	board.map((row, i) => row[board.length - 1 - i])
]

const getEmptyPos = (board: Board): Pos[] =>
	board.flatMap((row, i) =>
		row.map((cell, j) => cell === ' ' ? [i, j] as const : null)
	).filter((pos): pos is Pos => pos !== null)

const isWinningLine = (line: GameSlot[]): boolean =>
	line[0] !== ' ' && line.every(cell => cell === line[0])

// Display formatting
const formatBoard = (board: Board): string =>
	board
		.map(row => row.join('|'))
		.join('\n' + '-'.repeat(board.length * 2 - 1) + '\n')

const formatStatus = (status: GameStatus): string =>
	pipe(
		status,
		M.type<GameStatus>()
			.pipe(
				M.when({ _tag: 'Draw' }, () => "The Game is a draw!"),
				M.when({ _tag: 'Progress' }, () => "The Game is in progress!"),
				M.when({ _tag: 'Winner' }, ({ player }) => `The winner is ${player}!`),
				M.exhaustive
			)
	)