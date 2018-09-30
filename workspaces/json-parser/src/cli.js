#!/usr/bin/env node
/* eslint-disable no-console */
// @flow
import fs from 'fs';

import InputStream from './input-stream';
import TokenStream from './token-stream';
import AstParser from './ast-parser';

const file = process.argv[2];

if (!file) {
  console.log('No such file, loser');
  process.exit(1);
}

const contents = fs.readFileSync(file, 'utf8');
const inputStream = InputStream.from(contents);
const tokenStream = TokenStream.from(inputStream);
const astParser = AstParser.from(tokenStream);
const ast = astParser.consumeToAst();

console.log(JSON.stringify(ast, null, 2));
