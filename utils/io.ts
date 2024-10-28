import { Terminal as T } from "@effect/platform"
import { Effect as E } from "effect"
import { Match as M } from "effect"
import { Option as O } from "effect"

export { display, askQuestion, parseLoop, evalGame }

enum Mode {
	PVP = 1,
	PVE = 2,
}

enum Difficulty {
	easy = 1,
	medium = 2,
	hard = 3,
}
type GameContext = { readonly mode: Mode.PVP } | { readonly mode: Mode.PVE; readonly diff: Difficulty }

const display = (msg: string) => E.gen(function* () {
	const terminal = yield* T.Terminal
	yield* terminal.display(`${msg}\n`)
})

const askQuestion = (question: string) => E.gen(function* () {
	const terminal = yield* T.Terminal
	yield* display(question)
	return yield* terminal.readLine
})

type Parser<A> = (input: string) => O.Option<A>

const retryQuestion = <A>(question: string) => (parser: Parser<A>) =>
	E.gen(function* () {
		let result: O.Option<A> = O.none()
		while (O.isNone(result)) {
			const answer = yield* askQuestion(question)
			result = parser(answer)
		}
		return result.value
	})

const parseMode = (input: string): O.Option<Mode> => {
	const num = parseInt(input, 10)
	return num === 1 || num === 2
		? O.some(num as Mode)
		: O.none()
}

const parseDifficulty = (input: string): O.Option<Difficulty> => {
	const num = parseInt(input, 10)
	return num >= 1 && num <= 3
		? O.some(num as Difficulty)
		: O.none()
}

const diffSelection = "Choose your difficulty: Easy: 1; Medium: 2; Hard:3"
const modeSelection = "Choose your mode: PVP: 1 or PVE: 2"

const retryMode = retryQuestion<Mode>(modeSelection)(parseMode)
const retryDiff = retryQuestion<Difficulty>(diffSelection)(parseDifficulty)

const parseLoop = E.gen(function* () {
	yield* display("Game Option:\n")
	const mode = yield* retryMode

	const context = yield* M.value(mode).pipe(
		M.when((selectedMode) => selectedMode === Mode.PVP, (selectedMode) =>
			E.succeed({ mode: selectedMode } as GameContext)
		),
		M.when((selectedMode) => selectedMode === Mode.PVE, function* (selectedMode) {
			const diff = yield* retryDiff
			return { mode: selectedMode, diff } as GameContext
		}),
		M.orElse(() => E.fail("Error: Invalid selection"))
	)
	// console.log(context)
	return context
})

import { TicTactoe, type Player, type Board, type GameState, type Pos } from './game';
import { Minimax } from './minimax';
import { gen } from "effect/FastCheck"
const initialPlayers = (ctx: GameContext) => {
	if (ctx.mode === Mode.PVP) {
		return {
			"X": "Human",
			"O": "Human",
		}
	} else {
		const isHumanFirst = Math.random() > 0.5
		return {
			"X": isHumanFirst ? "Human" : "AI",
			"O": isHumanFirst ? "AI" : "Human",
		}
	}
}

const parseCoord = (size: number) => (input: string) => {
	const coord = parseInt(input, 10)
	return !isNaN(coord) && coord >= 0 && coord < size ? O.some(coord) : O.none()
}

const retryCoord = (coordType: 'row' | 'col', size: number) => retryQuestion<number>(`Input ${coordType} for (0-${size - 1})`)(parseCoord(size))

const retryCoords = (size: number) => E.gen(function* () {
	const row = yield* retryCoord('row', size)
	const col = yield* retryCoord('col', size)
	return [row, col] as Pos
})

const parseSize = (input: string) => {
	const size = parseInt(input, 10)
	return !isNaN(size) && size >= 3 && size <= 10 ? O.some(size) : O.none()
}

const retrySize = retryQuestion<number>("Input a board size: (3 <= number <= 10 )")(parseSize)

const initialGame = (ctx: GameContext) => E.gen(function* () {
	const players = initialPlayers(ctx)
	const size = yield* retrySize

	const game = yield* TicTactoe.make(size)
	const currPlayer = game.currentPlayer
	const opCurrPlayer = TicTactoe.opponent(currPlayer)

	yield* display(`Player 1 (${currPlayer}) will be ${players[currPlayer]}`)
	yield* display(`Player 2 (${opCurrPlayer}) will be ${players[opCurrPlayer]}`)

	return {
		game,
		players
	}
})

const getPlayerMove = (game: GameState<Board>) => E.gen(function* () {
	const size = game.game.length

	const move = yield* retryCoords(size)
	return O.some(move)
})

const getAIMove = (game: GameState<Board>, diff: Difficulty) => E.gen(function* () {
	const depth = diff + 2
	const AI = Minimax.make(depth)

	const move = yield* E.suspend(() => AI.getBestMove(game))
	yield* display("AI make the move!")
	return move
})

const evalGame = (ctx: GameContext) => E.gen(function* () {
	const { game, players } = yield* initialGame(ctx)
	console.log(game)
	const getMove = (game: GameState<Board>) => {
		if (players[game.currentPlayer] === "AI" && ctx.mode === Mode.PVE) {
			return getAIMove(game, ctx.diff)
		} else {
			return getPlayerMove(game)
		}
	}
	const final = yield* E.iterate(
		game,
		{
			while: (game) => game.status._tag === "Progress",
			body: (game) => E.gen(function* () {
				yield* TicTactoe.display.board(game)
				const move = yield* getMove(game)

				return yield* O.match(move, {
					onNone: () => E.succeed(game),
					onSome: (pos) => TicTactoe.makeMove(pos)(game).pipe(
						E.catchAll((err) =>
							E.gen(function* () {
								yield* display("The place has already been filled!")
								return game
							})
						))
				})
			})
		})

	yield* TicTactoe.display.board(final)
	yield* display(`The Game is Over!`)
	yield* TicTactoe.display.status(final)
	if (final.status._tag === "Winner") {
		yield* display(`${players[TicTactoe.opponent(final.currentPlayer)]} Champion!`)
	}
})
