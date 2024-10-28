#!/usr/bin/env node

import { Effect as E } from "effect";
import { NodeRuntime, NodeTerminal } from "@effect/platform-node";
import { display, evalGame, parseLoop } from './utils/io';

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
	const ctx = yield* parseLoop
	yield* evalGame(ctx)
})

NodeRuntime.runMain(prog.pipe(E.provide(NodeTerminal.layer)))
