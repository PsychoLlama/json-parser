// @flow
export type Loc = {
  column: number,
  line: number,
};

export type ErrorTrace = {
  message: string,
  length: number,
  column: number,
  line: number,
};

function createCodeFrame({ sourceText, line, column, length }): string {
  const lines = sourceText.split('\n');
  const startingLine = Math.max(line - 2, 0);
  const endingLine = Math.min(line + 2, lines.length);
  const startingFrame = lines.slice(startingLine, line + 1);

  const errorHighlight =
    Array(column).fill(' ').join('') + Array(length).fill('^').join('');

  const endingFrame = lines.slice(line + 1, endingLine);

  return (
    '\n' +
    startingFrame
      .concat(errorHighlight)
      .concat(endingFrame)
      .map((line) => '  ' + line)
      .join('\n') +
    '\n'
  );
}

export default class InputStream {
  static from(sourceText: string) {
    return new InputStream(sourceText);
  }

  sourceText: *;
  column = 0;
  index = 0;
  line = 0;

  constructor(sourceText: string) {
    this.sourceText = sourceText;
  }

  getLoc = (): Loc => ({
    column: this.column,
    line: this.line,
  });

  consumeNextChar = (): string => {
    const result = this.peek();

    this.index += 1;
    if (result === '\n') {
      this.column = 0;
      this.line += 1;
    } else {
      this.column += 1;
    }

    return result;
  };

  peek = (): string => {
    return this.sourceText[this.index] || '';
  };

  eof = () => {
    return !this.peek();
  };

  die = ({ message, line, column, length }: ErrorTrace) => {
    const frame = createCodeFrame({
      sourceText: this.sourceText,
      column,
      length,
      line,
    });

    throw new SyntaxError(message + '\n' + frame);
  };
}
