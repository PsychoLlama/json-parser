// @flow
import { type Loc } from './input-stream';
import TokenStream, {
  type JsonNull,
  type JsonToken,
  type JsonNumber,
  type JsonString,
  type JsonBoolean,
  type JsonDelimiter,
} from './token-stream';

type JsonObject = {
  type: 'Object',
  start: Loc,
  end: Loc,
  entries: Array<{
    key: JsonString,
    value: AST,
  }>,
};

type JsonArray = {
  type: 'Array',
  start: Loc,
  end: Loc,
  elements: Array<AST>,
};

type JsonPrimitive = JsonString | JsonNumber | JsonBoolean | JsonNull;
type AST = JsonPrimitive | JsonArray | JsonObject;

const isPrimitive = (token: JsonToken): boolean => {
  switch (token.type) {
    case 'Boolean':
    case 'String':
    case 'Number':
    case 'Null':
      return true;
    default:
      return false;
  }
};

export default class AstParser {
  static from(tokenizer: TokenStream) {
    return new AstParser(tokenizer);
  }

  tokenizer: *;

  constructor(tokenizer: TokenStream) {
    this.tokenizer = tokenizer;
  }

  isType(type: string): boolean {
    const token = this.tokenizer.peek();
    return token ? token.type === type : false;
  }

  consumeToAst(): AST {
    const token = this.tokenizer.peek();
    if (!token) {
      throw new SyntaxError('Unexpected end of input.');
    }

    if (isPrimitive(token)) return this.parsePrimitive();
    if (this.isType('Delimiter')) return this.parseStructure();
    throw new SyntaxError(`Not implemented: ${token.type}`);
  }

  parsePrimitive() {
    const primitive: JsonPrimitive = (this.tokenizer.consumeNextToken(): any);
    return primitive;
  }

  expect(type: string) {
    const token = this.tokenizer.consumeNextToken();
    const actualType = (token || {}).type;
    if (actualType !== type) {
      throw new SyntaxError(`Unexpected type ${actualType}`);
    }

    return token;
  }

  expectDelimiter(char: string): JsonDelimiter {
    const token: JsonDelimiter = (this.tokenizer.consumeNextToken(): any);

    if (token.type !== 'Delimiter') {
      this.tokenizer.report(
        token,
        `Expected a "${char}" delimiter. This ain't that.`
      );
    }

    if (token.value !== char) {
      this.tokenizer.report(
        token,
        `Expected to see "${char}" but "${token.value}" showed up.`
      );
    }

    return token;
  }

  peek(): JsonToken {
    return (this.tokenizer.peek(): any);
  }

  isDelimiterOfType(type: string): boolean {
    const token = this.peek();
    return token.type === 'Delimiter' && token.value === type;
  }

  parseStructure(): AST {
    return this.isDelimiterOfType('[') ? this.parseArray() : this.parseObject();
  }

  parseString(): JsonString {
    return (this.expect('String'): any);
  }

  parseObject(): JsonObject {
    const { tokenizer } = this;
    const start = this.expectDelimiter('{');
    const entries = [];

    while (!tokenizer.eof()) {
      if (this.isDelimiterOfType('}')) break;
      if (entries.length) this.expectDelimiter(',');
      const entry = {};

      entry.key = this.parseString();
      this.expectDelimiter(':');
      entry.value = this.consumeToAst();
      entries.push(entry);
    }

    const end = this.expectDelimiter('}');

    return {
      type: 'Object',
      start: start.loc,
      end: end.loc,
      entries,
    };
  }

  parseArray(): JsonArray {
    const { tokenizer } = this;
    const elements = [];

    const arrayStart = this.expectDelimiter('[');

    while (!tokenizer.eof()) {
      if (this.isDelimiterOfType(']')) break;
      if (elements.length) this.expectDelimiter(',');
      elements.push(this.consumeToAst());
    }

    const arrayEnd = this.expectDelimiter(']');

    return {
      type: 'Array',
      start: arrayStart.loc,
      elements: elements,
      end: arrayEnd.loc,
    };
  }
}
