import { describe, test, expect, beforeEach } from "bun:test";
import { file } from "bun";
import path from "node:path";
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
                kind: "interpolation",
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
              {
                kind: "raw_string",
                value: "",
                location: {
                  start: { line: 1, column: 15 },
                  end: { line: 1, column: 15 },
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
      test("lexes member access", () => {
        let code = trim(`x.y.z`);
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
            kind: "operator",
            value: ".",
            location: {
              start: { line: 1, column: 2 },
              end: { line: 1, column: 3 },
            },
          },
          {
            kind: "identifier",
            value: "y",
            location: {
              start: { line: 1, column: 3 },
              end: { line: 1, column: 4 },
            },
          },
          {
            kind: "operator",
            value: ".",
            location: {
              start: { line: 1, column: 4 },
              end: { line: 1, column: 5 },
            },
          },
          {
            kind: "identifier",
            value: "z",
            location: {
              start: { line: 1, column: 5 },
              end: { line: 1, column: 6 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 6 },
              end: { line: 1, column: 6 },
            },
          },
        ]);
      });

      test("lexes interpolated member access", () => {
        let code = trim(`x.\${"y"}`);
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
            kind: "operator",
            value: ".",
            location: {
              start: { line: 1, column: 2 },
              end: { line: 1, column: 3 },
            },
          },
          {
            kind: "interpolation",
            value: [
              {
                kind: "string",
                value: [
                  {
                    kind: "raw_string",
                    value: "y",
                    location: {
                      start: { line: 1, column: 6 },
                      end: { line: 1, column: 7 },
                    },
                  },
                ],
                location: {
                  start: { line: 1, column: 5 },
                  end: { line: 1, column: 8 },
                },
              },
            ],
            location: {
              start: { line: 1, column: 5 },
              end: { line: 1, column: 8 },
            },
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 9 },
              end: { line: 1, column: 9 },
            },
          },
        ]);
      });

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
            kind: "whitespace",
            location: {
              start: {
                line: 1,
                column: 69,
              },
              end: {
                line: 1,
                column: 70,
              },
            },
            value: " ",
          },
          {
            kind: "operator",
            location: {
              start: {
                line: 1,
                column: 70,
              },
              end: {
                line: 1,
                column: 72,
              },
            },
            value: "..",
          },
          {
            kind: "eof",
            location: {
              start: { line: 1, column: 72 },
              end: { line: 1, column: 72 },
            },
          },
        ] satisfies tokens.token[]);
      });
    });
  });

  describe("Macros", () => {
    test("lexes macro args", () => {
      let code = trim(`
				log!("hello, world")
			`);
      let tokens = l.lex(code);

      expect(tokens).toEqual([
        {
          kind: "macro_identifier",
          location: {
            start: {
              line: 1,
              column: 1,
            },
            end: {
              line: 1,
              column: 5,
            },
          },
          value: "log!",
        },
        {
          kind: "macro_args",
          location: {
            start: {
              line: 1,
              column: 5,
            },
            end: {
              line: 1,
              column: 21,
            },
          },
          value: [
            {
              kind: "string",
              location: {
                start: {
                  line: 1,
                  column: 6,
                },
                end: {
                  line: 1,
                  column: 20,
                },
              },
              value: [
                {
                  kind: "raw_string",
                  location: {
                    start: {
                      line: 1,
                      column: 7,
                    },
                    end: {
                      line: 1,
                      column: 19,
                    },
                  },
                  value: "hello, world",
                },
              ],
            },
          ],
        },
        {
          kind: "eof",
          location: {
            start: {
              line: 1,
              column: 21,
            },
            end: {
              line: 1,
              column: 21,
            },
          },
        },
      ]);
    });

    test("lexes macro bodies", () => {
      let code = trim(`
				jsx! {
					<div>
						The current count is: {counter}

						<button on_click={handle_increment}>Increment</button>
						<button on_click={handle_decrement}>Decrement</button>

						<hr />

						<span>Version: {version}</span>
					</div>
				}
			`);
      let tokens = l.lex(code);

      expect(tokens).toEqual([
        {
          kind: "macro_identifier",
          location: {
            start: {
              line: 1,
              column: 1,
            },
            end: {
              line: 1,
              column: 5,
            },
          },
          value: "jsx!",
        },
        {
          kind: "whitespace",
          location: {
            start: {
              line: 1,
              column: 5,
            },
            end: {
              line: 1,
              column: 6,
            },
          },
          value: " ",
        },
        {
          kind: "macro_body",
          location: {
            start: {
              line: 1,
              column: 6,
            },
            end: {
              line: 12,
              column: 6,
            },
          },
          value:
            "\n\t\t\t\t\t<div>\n\t\t\t\t\t\tThe current count is: {counter}\n\n\t\t\t\t\t\t<button on_click={handle_increment}>Increment</button>\n\t\t\t\t\t\t<button on_click={handle_decrement}>Decrement</button>\n\n\t\t\t\t\t\t<hr />\n\n\t\t\t\t\t\t<span>Version: {version}</span>\n\t\t\t\t\t</div>\n\t\t\t\t",
        },
        {
          kind: "eof",
          location: {
            start: {
              line: 12,
              column: 6,
            },
            end: {
              line: 12,
              column: 6,
            },
          },
        },
      ]);
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

    test("all.juice", async () => {
      const code = await file(
        path.resolve(__dirname, "../../examples/all.juice"),
      );
      const text = await code.text();

      expect(() => {
        const tokens = l.lex(text);

        expect(tokens).toMatchSnapshot();
      }).not.toThrow();
    });
  });
});
