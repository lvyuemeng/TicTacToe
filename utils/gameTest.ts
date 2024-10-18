import { TicTacToe } from "./game";
import { Effect as E } from "effect";
const tic = E.runSync(TicTacToe.init(3))
tic.makeMove([1, 2])
tic.displayBoard()