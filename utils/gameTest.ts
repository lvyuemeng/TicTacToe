import { TicTactoe } from "./game"
import { Console, Effect as E } from "effect"

const prog = E.gen(function* (_) {
	yield* _(Console.log("Initial board:"))
	const tic = yield* TicTactoe.make(3)
	const tic2 = yield* TicTactoe.makeMove([1, 2])(tic)
	yield* TicTactoe.display.board(tic)
	yield* TicTactoe.display.board(tic2)
	yield* TicTactoe.display.status(tic)
})

E.runPromise(prog)
