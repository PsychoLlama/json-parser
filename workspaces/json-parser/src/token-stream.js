// @flow
import InputStream, { type Loc } from './input-stream';

type JsonString = {
  type: 'String',
  value: string,
  raw: string,
  loc: Loc,
};

type JsonBoolean = {
  type: 'Boolean',
  value: boolean,
  raw: string,
  loc: Loc,
};

type JsonNumber = {
  type: 'Number',
  value: number,
  loc: Loc,
  raw: string,
};

type JsonDelimiter = {
  type: 'Delimiter',
  value: string,
  loc: Loc,
};

type JsonToken = JsonString | JsonBoolean | JsonNumber | JsonDelimiter;

const delimiters = new Set(['[', ']', '{', '}', ',', ':']);
const isNumber = char => /[\d.-]/.test(char);
const isString = char => char === '"';
const isDelimiter = char => delimiters.has(char);

export default class TokenStream {
  static from(inputStream: InputStream) {
    return new TokenStream(inputStream);
  }

  inputStream: *;
  peekedToken: ?JsonToken;

  constructor(inputStream: InputStream) {
    this.inputStream = inputStream;
  }

  consumeNextToken = () => {
    if (this.peekedToken) {
      const result = this.peekedToken;
      this.peekedToken = null;

      return result;
    }

    return this.readNextToken();
  };

  peek = () => {
    return this.peekedToken || (this.peekedToken = this.consumeNextToken());
  };

  eof = () => {
    return !this.peek();
  };

  readWhile(predicate: (string, string) => boolean) {
    let acc = '';
    while (!this.inputStream.eof() && predicate(this.inputStream.peek(), acc)) {
      acc += this.inputStream.consumeNextChar();
    }

    return acc;
  }

  discardWhitespace() {
    this.readWhile(char => /\s/.test(char));
  }

  readNumber(): JsonNumber {
    const loc = this.inputStream.getLoc();
    const raw = this.readWhile(isNumber);

    return {
      value: Number(raw),
      type: 'Number',
      loc,
      raw,
    };
  }

  readString(): JsonString {
    const loc = this.inputStream.getLoc();
    let raw = this.inputStream.consumeNextChar();

    raw += this.readWhile((value, acc) => {
      if (value !== '"') return true;
      return acc[acc.length - 1] === '\\';
    });

    raw += this.inputStream.consumeNextChar();

    return {
      value: raw.slice(1, -1),
      type: 'String',
      raw,
      loc,
    };
  }

  readDelimiter(): JsonDelimiter {
    const loc = this.inputStream.getLoc();

    return {
      value: this.inputStream.consumeNextChar(),
      type: 'Delimiter',
      loc,
    };
  }

  readUnknown() {
    const loc = this.inputStream.getLoc();
    const raw = this.readWhile(char => /[\w\d]/.test(char));

    if (raw === 'true' || raw === 'false') {
      return ({
        value: raw === 'true' ? true : false,
        type: 'Boolean',
        raw: raw,
        loc,
      }: JsonBoolean);
    }

    return this.inputStream.die(
      `Invalid identifier "${raw}"`,
      Object.assign({}, loc, { length: raw.length })
    );
  }

  readNextToken() {
    this.discardWhitespace();

    if (this.inputStream.eof()) {
      return null;
    }

    const ch = this.inputStream.peek();
    if (isNumber(ch)) return this.readNumber();
    if (isString(ch)) return this.readString();
    if (isDelimiter(ch)) return this.readDelimiter();

    return this.readUnknown();
  }
}
