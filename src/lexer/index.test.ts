import { describe, test, expect, beforeEach } from "bun:test";
import lexer from "./index";
import { operators } from "./operators";
import * as tokens from "./tokens";

const trim = (s: string) => s.trim();

describe("Lexer", () => {
  let l: lexer;

  beforeEach(() => {
    l = new lexer();
  });

  describe("Tokens", () => {
    describe("Identifiers", () => {
      test("lexes plain identifiers", () => {
        let code = trim(`x`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "identifier",
            value: "x",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 2 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 2 },
              end: { line: 1, column: 2 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes long identifiers", () => {
        let code = trim(`this_is_an_identifier`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "identifier",
            value: "this_is_an_identifier",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 22 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 22 },
              end: { line: 1, column: 22 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes prime identifiers", () => {
        let code = trim(`x'`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "identifier",
            value: "x'",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 3 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 3 },
              end: { line: 1, column: 3 },
            },
          },
        ] satisfies tokens.token[]);
      });
    });

    describe("Primitives", () => {
      test("lexes integers", () => {
        let code = trim(`42`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "number",
            value: 42,
            variant: "integer",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 3 },
            },
            raw: "42",
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 3 },
              end: { line: 1, column: 3 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes floats", () => {
        let code = trim(`42.0`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "number",
            value: 42.0,
            variant: "float",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 5 },
            },
            raw: "42.0",
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 5 },
              end: { line: 1, column: 5 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes hexadecimals", () => {
        let code = trim(`0x1`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "number",
            value: 1,
            variant: "hex",
            raw: "0x1",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 4 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 4 },
              end: { line: 1, column: 4 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes octals", () => {
        let code = trim(`0o1`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "number",
            value: 1,
            variant: "octal",
            raw: "0o1",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 4 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 4 },
              end: { line: 1, column: 4 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes binary", () => {
        let code = trim(`0b1`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "number",
            value: 1,
            variant: "binary",
            raw: "0b1",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 4 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 4 },
              end: { line: 1, column: 4 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes long numbers", () => {
        let code = trim(`123_456_789.0_1_2_3`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "number",
            value: 123456789.0123,
            variant: "float",
            raw: "123_456_789.0_1_2_3",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 20 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 20 },
              end: { line: 1, column: 20 },
            },
          },
        ] satisfies tokens.token[]);
      });
    });

    describe("Comments", () => {
      test("lexes comments", () => {
        let code = trim(`// hello world`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "comment",
            value: " hello world",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 15 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 15 },
              end: { line: 1, column: 15 },
            },
          },
        ] satisfies tokens.token[]);
      });
    });

    describe("Strings", () => {
      test("lexes strings", () => {
        let code = trim(`"hello world"`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "string",
            value: [
              {
                kind: "raw_string",
                value: "hello world",
                location: {
                  start: { line: 1, column: 2 },
                  end: { line: 1, column: 13 },
                },
              },
            ],
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 14 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 14 },
              end: { line: 1, column: 14 },
            },
          },
        ] satisfies tokens.token[]);
      });

      test("lexes interpolations", () => {
        let code = trim(`"hello \${name}"`);
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "string",
            value: [
              {
                kind: "raw_string",
                value: "hello ",
                location: {
                  start: { line: 1, column: 2 },
                  end: { line: 1, column: 8 },
                },
              },
              {
                kind: "interpolated_string",
                value: [
                  {
                    kind: "identifier",
                    value: "name",
                    location: {
                      start: { line: 1, column: 10 },
                      end: { line: 1, column: 14 },
                    },
                  },
                ],
                location: {
                  start: { line: 1, column: 10 },
                  end: { line: 1, column: 14 },
                },
              },
            ],
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 16 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 16 },
              end: { line: 1, column: 16 },
            },
          },
        ] satisfies tokens.token[]);
      });
    });

    describe("Keywords", () => {
      test("lexes fn", () => {
        let code = trim("fn");
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "keyword",
            value: "fn",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 3 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 3 },
              end: { line: 1, column: 3 },
            },
          },
        ]);
      });
    });

    describe("Operators", () => {
      test("lexes operators", () => {
        let code = trim(operators.join(" "));
        let tokens = l.lex(code);

        expect(tokens).toEqual([
          {
            kind: "operator",
            value: ":=",
            location: {
              start: { line: 1, column: 1 },
              end: { line: 1, column: 3 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 3 },
              end: { line: 1, column: 4 },
            },
          },
          {
            kind: "operator",
            value: "=",
            location: {
              start: { line: 1, column: 4 },
              end: { line: 1, column: 5 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 5 },
              end: { line: 1, column: 6 },
            },
          },
          {
            kind: "operator",
            value: ":",
            location: {
              start: { line: 1, column: 6 },
              end: { line: 1, column: 7 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 7 },
              end: { line: 1, column: 8 },
            },
          },
          {
            kind: "operator",
            value: ",",
            location: {
              start: { line: 1, column: 8 },
              end: { line: 1, column: 9 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 9 },
              end: { line: 1, column: 10 },
            },
          },
          {
            kind: "operator",
            value: ".",
            location: {
              start: { line: 1, column: 10 },
              end: { line: 1, column: 11 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 11 },
              end: { line: 1, column: 12 },
            },
          },
          {
            kind: "operator",
            value: "@",
            location: {
              start: { line: 1, column: 12 },
              end: { line: 1, column: 13 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 13 },
              end: { line: 1, column: 14 },
            },
          },
          {
            kind: "operator",
            value: "#",
            location: {
              start: { line: 1, column: 14 },
              end: { line: 1, column: 15 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 15 },
              end: { line: 1, column: 16 },
            },
          },
          {
            kind: "operator",
            value: "!",
            location: {
              start: { line: 1, column: 16 },
              end: { line: 1, column: 17 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 17 },
              end: { line: 1, column: 18 },
            },
          },
          {
            kind: "operator",
            value: "?",
            location: {
              start: { line: 1, column: 18 },
              end: { line: 1, column: 19 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 19 },
              end: { line: 1, column: 20 },
            },
          },
          {
            kind: "operator",
            value: "&",
            location: {
              start: { line: 1, column: 20 },
              end: { line: 1, column: 21 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 21 },
              end: { line: 1, column: 22 },
            },
          },
          {
            kind: "operator",
            value: "|",
            location: {
              start: { line: 1, column: 22 },
              end: { line: 1, column: 23 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 23 },
              end: { line: 1, column: 24 },
            },
          },
          {
            kind: "operator",
            value: "&&",
            location: {
              start: { line: 1, column: 24 },
              end: { line: 1, column: 26 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 26 },
              end: { line: 1, column: 27 },
            },
          },
          {
            kind: "operator",
            value: "||",
            location: {
              start: { line: 1, column: 27 },
              end: { line: 1, column: 29 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 29 },
              end: { line: 1, column: 30 },
            },
          },
          {
            kind: "operator",
            value: "->",
            location: {
              start: { line: 1, column: 30 },
              end: { line: 1, column: 32 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 32 },
              end: { line: 1, column: 33 },
            },
          },
          {
            kind: "operator",
            value: "+",
            location: {
              start: { line: 1, column: 33 },
              end: { line: 1, column: 34 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 34 },
              end: { line: 1, column: 35 },
            },
          },
          {
            kind: "operator",
            value: "-",
            location: {
              start: { line: 1, column: 35 },
              end: { line: 1, column: 36 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 36 },
              end: { line: 1, column: 37 },
            },
          },
          {
            kind: "operator",
            value: "*",
            location: {
              start: { line: 1, column: 37 },
              end: { line: 1, column: 38 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 38 },
              end: { line: 1, column: 39 },
            },
          },
          {
            kind: "operator",
            value: "/",
            location: {
              start: { line: 1, column: 39 },
              end: { line: 1, column: 40 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 40 },
              end: { line: 1, column: 41 },
            },
          },
          {
            kind: "operator",
            value: "%",
            location: {
              start: { line: 1, column: 41 },
              end: { line: 1, column: 42 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 42 },
              end: { line: 1, column: 43 },
            },
          },
          {
            kind: "operator",
            value: "**",
            location: {
              start: { line: 1, column: 43 },
              end: { line: 1, column: 45 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 45 },
              end: { line: 1, column: 46 },
            },
          },
          {
            kind: "operator",
            value: "++",
            location: {
              start: { line: 1, column: 46 },
              end: { line: 1, column: 48 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 48 },
              end: { line: 1, column: 49 },
            },
          },
          {
            kind: "operator",
            value: "--",
            location: {
              start: { line: 1, column: 49 },
              end: { line: 1, column: 51 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 51 },
              end: { line: 1, column: 52 },
            },
          },
          {
            kind: "operator",
            value: ">=",
            location: {
              start: { line: 1, column: 52 },
              end: { line: 1, column: 54 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 54 },
              end: { line: 1, column: 55 },
            },
          },
          {
            kind: "operator",
            value: "<=",
            location: {
              start: { line: 1, column: 55 },
              end: { line: 1, column: 57 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 57 },
              end: { line: 1, column: 58 },
            },
          },
          {
            kind: "operator",
            value: "==",
            location: {
              start: { line: 1, column: 58 },
              end: { line: 1, column: 60 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 60 },
              end: { line: 1, column: 61 },
            },
          },
          {
            kind: "operator",
            value: "!=",
            location: {
              start: { line: 1, column: 61 },
              end: { line: 1, column: 63 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 63 },
              end: { line: 1, column: 64 },
            },
          },
          {
            kind: "operator",
            value: ">",
            location: {
              start: { line: 1, column: 64 },
              end: { line: 1, column: 65 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 65 },
              end: { line: 1, column: 66 },
            },
          },
          {
            kind: "operator",
            value: "<",
            location: {
              start: { line: 1, column: 66 },
              end: { line: 1, column: 67 },
            },
          },
          {
            kind: "whitespace",
            value: " ",
            location: {
              start: { line: 1, column: 67 },
              end: { line: 1, column: 68 },
            },
          },
          {
            kind: "operator",
            value: "^",
            location: {
              start: { line: 1, column: 68 },
              end: { line: 1, column: 69 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 69 },
              end: { line: 1, column: 69 },
            },
          },
        ] satisfies tokens.token[]);
      });
    });
  });

  describe("Examples", () => {
    test("lexes hello world", () => {
      let code = trim(`
				import dev.juice.io (print_line)

				export fn main() {
					print_line("hello world!")
				}
			`);
      let tokens = l.lex(code);

      expect(tokens).toMatchSnapshot();
    });
  });
});
