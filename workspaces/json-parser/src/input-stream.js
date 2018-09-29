// @flow
export default function InputStream(sourceText: string) {
  let index = 0;
  let column = 0;
  let line = 0;

  function createCodeFrame(
    line: number,
    column: number,
    length: number
  ): string {
    const lines = sourceText.split('\n');
    const startingLine = Math.max(line - 2, 0);
    const endingLine = Math.min(line + 2, lines.length);
    const startingFrame = lines.slice(startingLine, line + 1);

    const errorHighlight =
      Array(column)
        .fill(' ')
        .join('') +
      Array(length)
        .fill('^')
        .join('');

    const endingFrame = lines.slice(line + 1, endingLine);

    return (
      '\n' +
      startingFrame
        .concat(errorHighlight)
        .concat(endingFrame)
        .map(line => '  ' + line)
        .join('\n') +
      '\n'
    );
  }

  return new class InputStream {
    getLoc = () => ({ line, column });

    consumeNextChar = (): string => {
      const result = this.peek();

      index += 1;
      if (result === '\n') {
        column = 0;
        line += 1;
      } else {
        column += 1;
      }

      return result;
    };

    peek = (): string => {
      return sourceText[index] || '';
    };

    eof = () => {
      return !this.peek();
    };

    die = (
      message: string,
      { line, column, length }: { line: number, column: number, length: number }
    ) => {
      const frame = createCodeFrame(line, column, length);
      throw new Error(message + '\n' + frame);
    };
  }();
}
