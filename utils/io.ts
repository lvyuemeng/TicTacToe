import { Terminal as T } from "@effect/platform"
import { Effect as E } from "effect"
import { Match as M } from "effect"
import { Option as O } from "effect"

export { display, askQuestion, parseLoop }

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

const parseSelection = (selection: string, type: "Mode" | "Diff") => {
	const n = parseInt(selection, 10)
	return M.value(type).pipe(
		M.when("Mode", (selection) => {
			return n === 1 ? O.some(Mode.PVP) : n === 2 ? O.some(Mode.PVE) : O.none()
		}),
		M.when("Diff", (selection) => {
			return (n >= 1 && n <= 3) ? O.some(n as Difficulty) : O.none()
		}),
		M.exhaustive
	)
}

const diffSelection = "Choose your difficulty: Easy: 1; Medium: 2; Hard:3"
const modeSelection = "Choose your mode: PVP: 1 or PVE: 2"

const retryQuestion = (question: string, type: "Mode" | "Diff") =>
	E.gen(function* () {
		let result: O.Option<Mode | Difficulty> = O.none()
		while (O.isNone(result)) {
			const answer = yield* askQuestion(question)
			result = parseSelection(answer, type)
		}
		return result.value
	})

const parseLoop = E.gen(function* () {
	yield* display("Game Option:\n")
	const mode = yield* retryQuestion(modeSelection, "Mode")

	const context = yield* M.value(mode).pipe(
		M.when((selectedMode) => selectedMode === Mode.PVP, (selectedMode) =>
			E.succeed({ mode: selectedMode } as GameContext)
		),
		M.when((selectedMode) => selectedMode === Mode.PVE, function* (selectedMode) {
			const diff = yield* retryQuestion(diffSelection, "Diff")
			return { mode: selectedMode, diff } as GameContext
		}),
		M.orElse(() => E.fail("Error: Invalid selection"))
	)
	// console.log(context)
	return context
})