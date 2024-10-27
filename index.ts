import { Terminal as T, Terminal } from '@effect/platform';
import { Effect as E } from "effect";
import { NodeRuntime, NodeTerminal } from "@effect/platform-node";
import { askQuestion, display, parseLoop } from './utils/io';

const asciiBanner = `
_/_/_/_/_/  _/            _/_/_/_/_/                    _/_/_/_/_/                   
   _/            _/_/_/      _/      _/_/_/    _/_/_/      _/      _/_/      _/_/    
  _/      _/  _/            _/    _/    _/  _/            _/    _/    _/  _/_/_/_/   
 _/      _/  _/            _/    _/    _/  _/            _/    _/    _/  _/          
_/      _/    _/_/_/      _/      _/_/_/    _/_/_/      _/      _/_/      _/_/_/     
`

const prog = E.gen(function* () {
	yield* display(asciiBanner)
	yield* display("TicTacToe Game!")
	yield* parseLoop
})

NodeRuntime.runMain(prog.pipe(E.provide(NodeTerminal.layer)))
