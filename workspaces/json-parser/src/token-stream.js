// @flow
import './input-stream';

type Loc = {
  line: number,
  col: number,
};

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
  value: '[' | ']' | '{' | '}' | ',' | ':',
  type: 'Delimiter',
  loc: Loc,
};

export default function TokenStream(inputStream: any) {
  let peekedToken = null;

  const readWhile = (predicate: (string, string) => boolean) => {
    let acc = '';
    while (!inputStream.eof() && predicate(inputStream.peek(), acc)) {
      acc += inputStream.consumeNextChar();
    }

    return acc;
  };

  const discardWhitespace = () => {
    readWhile(char => /\s/.test(char));
  };

  const isNumber = char => /[\d.]/.test(char);
  const readNumber = (): JsonNumber => {
    const loc = inputStream.getLoc();
    const raw = readWhile(isNumber);

    return {
      value: Number(raw),
      type: 'Number',
      loc,
      raw,
    };
  };

  const isString = char => char === '"';
  const readString = (): JsonString => {
    const loc = inputStream.getLoc();
    let raw = inputStream.consumeNextChar();

    raw += readWhile((value, acc) => {
      if (value !== '"') return true;
      return acc[acc.length - 1] === '\\';
    });

    raw += inputStream.consumeNextChar();

    return {
      value: raw.slice(1, -1),
      type: 'String',
      raw,
      loc,
    };
  };

  const delimiters = new Set(['[', ']', '{', '}', ',', ':']);
  const isDelimiter = char => delimiters.has(char);
  const readDelimiter = (): JsonDelimiter => {
    const loc = inputStream.getLoc();

    return {
      value: inputStream.consumeNextChar(),
      type: 'Delimiter',
      loc,
    };
  };

  const readUnknown = () => {
    const loc = inputStream.getLoc();
    const raw = readWhile(char => /[\w\d]/.test(char));

    if (raw === 'true' || raw === 'false') {
      return ({
        value: raw === 'true' ? true : false,
        type: 'Boolean',
        raw: raw,
        loc,
      }: JsonBoolean);
    }

    return inputStream.die(
      `Invalid identifier "${raw}"`,
      Object.assign({}, loc, { length: raw.length })
    );
  };

  const readNextToken = () => {
    discardWhitespace();

    if (inputStream.eof()) {
      return null;
    }

    const ch = inputStream.peek();
    if (isNumber(ch)) return readNumber();
    if (isString(ch)) return readString();
    if (isDelimiter(ch)) return readDelimiter();

    return readUnknown();
  };

  return new class TokenStream {
    consumeNextToken = () => {
      if (peekedToken) {
        const result = peekedToken;
        peekedToken = null;

        return result;
      }

      return readNextToken();
    };

    peek = () => {
      return peekedToken || (peekedToken = this.consumeNextToken());
    };

    eof = () => {
      return !this.peek();
    };
  }();
}
