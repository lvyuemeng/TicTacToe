import { TicTacToe } from "./game";
import { Effect as E } from "effect";

const prog = E.gen(function* () {
	const tic = yield* TicTacToe.init(3)
	const moves = [0, 1,2].map(col => tic.makeMove([0, col]));
	yield* E.all(moves)

	tic.displayBoard();
	tic.displayStatus();
})
E.runPromise(prog)

