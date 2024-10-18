import { TicTacToe } from "./game";
import { TicTacToeMinimax } from "./minimax";
import { Effect as E } from "effect";

const prog = E.gen(function* () {
	const tic = yield* TicTacToe.init(3)
	const moves = [0, 1, 2].map(col => tic.makeMove([0, col]));
	yield* E.all(moves)

	yield* tic.displayBoard();
	yield* tic.displayStatus();

	const tic2 = yield* TicTacToe.init(4)
	const ticAI = new TicTacToeMinimax(5)
	yield* tic2.makeMove([1, 3])
	yield* tic2.makeMove([2, 3])
	const pos_1 = yield* ticAI.getBestPos(tic2)
	yield* tic2.makeMove([3,3])
	const pos_2 = yield* ticAI.getBestPos(tic2)
	yield* tic2.displayBoard();
	console.log(pos_1, pos_2)
})
E.runPromise(prog)

