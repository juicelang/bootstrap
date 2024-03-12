import { location } from "@/lexer/location";
import * as tokens from "@/lexer/tokens";
import lexer from "@/lexer";
import { todo } from "@/util/todo";
import { precedence, is_unary_prefix_operator } from "@/lexer/operators";

import * as nodes from "./ast";

export default class parser {
  cursor = 0;
  tokens: tokens.token[] = [];

  location(
    from: { location: { start: location; end: location } },
    to: { location: { start: location; end: location } },
  ): { start: location; end: location } {
    return {
      start: from.location.start,
      end: to.location.end,
    };
  }

  eat() {
    let t = this.tokens[this.cursor];

    this.cursor++;

    return t;
  }

  eat_whitespace() {
    let ts: tokens.whitespace_token[] = [];

    while (
      this.cursor < this.tokens.length &&
      this.peek().kind === "whitespace"
    ) {
      ts.push(this.eat() as tokens.whitespace_token);
    }

    return ts;
  }

  peek(offset = 0) {
    let t = this.tokens[this.cursor + offset];

    return t;
  }

  lookahead<T>(f: () => T) {
    let cursor = this.cursor;

    let result = f();

    this.cursor = cursor;

    return result;
  }

  peek_non_whitespace() {
    let t = this.lookahead(() => {
      while (
        this.cursor < this.tokens.length &&
        this.peek().kind === "whitespace"
      ) {
        this.eat();
      }

      return this.eat();
    });

    return t;
  }

  is_whitespace_multiline() {
    let offset = 0;
    let t: tokens.token;
    let lines = 0;

    while ((t = this.peek(offset))) {
      if (t.kind !== "whitespace") {
        return false;
      }

      for (let char of t.value) {
        if (char === "\n") {
          lines++;
        }

        if (lines > 1) {
          return true;
        }
      }

      offset++;
    }

    return false;
  }

  parse(code: string): nodes.root_node {
    let l = new lexer();

    this.cursor = 0;
    this.tokens = l.lex(code);

    let ast: nodes.root_node = {
      kind: "program",
      body: [],
    };

    while (this.cursor < this.tokens.length) {
      if (this.peek().kind === "eof") {
        break;
      }

      let node = this.parse_node();

      ast.body.push(node);
    }

    return ast;
  }

  parse_node(): nodes.node {
    this.eat_whitespace();

    let t = this.peek();

    switch (t.kind) {
      default:
        return this.parse_statement();
      case "comment":
        return this.parse_comment_node();
    }
  }

  parse_statement(): nodes.statement_node {
    let t = this.peek();

    let value: nodes.statement_node["value"];

    switch (t.kind) {
      default:
        value = this.parse_expression({
          is_statement: true,
        });
        break;
      case "keyword":
        value = this.parse_keyword();
        break;
      case "eof":
        return todo("parse_statement: eof");
    }

    return {
      kind: "statement",
      value,
      location: this.location(value, value),
    };
  }

  parse_expression<
    T extends {
      is_function_argument?: boolean;
      is_unary_expression?: boolean;
      is_type_expression?: boolean;
      is_statement?: boolean;
    },
  >(
    // @ts-expect-error
    {
      is_function_argument = false,
      is_unary_expression = false,
      is_type_expression = false,
      is_statement = false,
    }: T = {},
  ): T extends { is_statement: true }
    ? nodes.expression_node | nodes.assignment_node | nodes.type_assignment_node
    : nodes.expression_node {
    let root_sub_expression: nodes.sub_expression_node =
      this.parse_sub_expression({ is_statement });
    let last_binary_expression: nodes.binary_expression_node | undefined;
    let current_precedence = 0;

    if (is_unary_expression || is_type_expression) {
      return {
        kind: "expression",
        value: root_sub_expression,
        location: root_sub_expression.location,
      };
    }

    while (this.cursor < this.tokens.length) {
      let next = this.peek_non_whitespace();

      if (next.kind === "eof") {
        break;
      }

      if (this.is_whitespace_multiline()) {
        break;
      }

      if (next.kind === "operator" && next.value === ".") {
        this.eat_whitespace();

        this.eat();

        const sub_expression = this.parse_sub_expression({
          is_function_argument,
          is_unary_expression,
          is_statement,
        });

        return todo("parse_expression: member access");
        continue;
      }

      if (next.kind === "operator" && next.value === ":") {
        if (!is_statement) {
          throw new Error(`Unexpected : in expression`);
        }

        this.eat_whitespace();
        this.eat();
        this.eat_whitespace();

        const t = this.peek();

        let type: nodes.expression_node | null = null;
        if (t.kind === "operator" && t.value === "=") {
          type = null;
        } else {
          type = this.parse_expression({
            is_type_expression: true,
          });
        }

        this.eat_whitespace();
        const equals = this.peek();

        if (equals.kind !== "operator" || equals.value !== "=") {
          throw new Error(`Expected = after type annotation`);
        }

        this.eat();
        this.eat_whitespace();

        // @ts-expect-error
        return {
          kind: "assignment",
          type,
          left: root_sub_expression,
          right: this.parse_expression(),
          location: this.location(root_sub_expression, root_sub_expression),
        } as nodes.assignment_node;
      }

      if (next.kind === "operator" && next.value === ":=") {
        if (!is_statement) {
          throw new Error(`Unexpected := in expression`);
        }

        this.eat_whitespace();
        this.eat();
        this.eat_whitespace();

        if (
          is_statement &&
          root_sub_expression.kind === "value_expression" &&
          root_sub_expression.value.kind === "type_identifier"
        ) {
          const value = this.parse_type_assignment_value(
            root_sub_expression.value,
          );

          const last = Array.isArray(value) ? value[value.length - 1] : value;

          // @ts-expect-error
          return {
            kind: "type_assignment",
            left: root_sub_expression.value,
            right: value,
            location: this.location(root_sub_expression, last),
          } as nodes.type_assignment_node;
        }

        // @ts-expect-error
        return {
          kind: "assignment",
          type: null,
          left: root_sub_expression,
          right: this.parse_expression(),
          location: this.location(root_sub_expression, root_sub_expression),
        } as nodes.assignment_node;
      }

      if (next.kind === "operator") {
        this.eat_whitespace();
        this.eat();

        const next_precedence = precedence[next.value];

        const sub_expression = this.parse_sub_expression({
          is_function_argument,
          is_unary_expression,
          is_statement,
        });

        if (next_precedence < current_precedence) {
          const new_root_sub_expression: nodes.binary_expression_node = {
            kind: "binary_expression",
            operator: next.value,
            location: this.location(root_sub_expression, sub_expression),
            value: [root_sub_expression, sub_expression],
          };

          root_sub_expression = new_root_sub_expression;
          last_binary_expression = new_root_sub_expression;
        } else {
          if (root_sub_expression.kind === "binary_expression") {
            if (last_binary_expression === undefined) {
              throw new Error("last_binary_expression is undefined");
            }

            const right_sub_expression = last_binary_expression?.value[1]!;

            const new_right_sub_expression: nodes.binary_expression_node = {
              kind: "binary_expression",
              operator: next.value,
              location: this.location(right_sub_expression, sub_expression),
              value: [right_sub_expression, sub_expression],
            };

            root_sub_expression.value[1] = new_right_sub_expression;
            last_binary_expression = new_right_sub_expression;
          } else {
            const new_root_sub_expression: nodes.binary_expression_node = {
              kind: "binary_expression",
              operator: next.value,
              location: this.location(root_sub_expression, sub_expression),
              value: [root_sub_expression, sub_expression],
            };

            root_sub_expression = new_root_sub_expression;
            last_binary_expression = new_root_sub_expression;
          }
        }

        current_precedence = next_precedence;
        continue;
      }

      if (next.kind === "open_paren") {
        this.eat_whitespace();

        current_precedence = 0;

        // This may not actually be a function call since it can be
        // preceded by whitespace.
        return todo("parse_expression: function call");

        continue;
      }

      if (next.kind === "close_paren") {
        break;
      }

      break;
    }

    return {
      kind: "expression",
      value: root_sub_expression,
      location: root_sub_expression.location,
    };
  }

  parse_sub_expression({
    is_function_argument = false,
    is_unary_expression = false,
    is_statement = false,
  } = {}): nodes.value_expression_node {
    this.eat_whitespace();

    let kind: "value_expression" | "tuple" = "value_expression";

    let start = this.peek();
    let end: { location: { start: location; end: location } } = start;

    let t = this.peek();
    let negate = false;

    if (t.kind === "operator" && t.value === "-") {
      negate = true;
      this.eat();
      t = this.peek();
    }

    let value: nodes.sub_expression_node["value"];

    switch (t.kind) {
      case "string":
        value = this.parse_string_node();
        end = value;
        break;
      case "number":
        value = this.parse_number_node();
        end = value;
        break;
      case "boolean":
        value = this.parse_boolean_node();
        end = value;
        break;
      case "identifier":
        value = this.parse_identifier_node();
        end = value;
        break;
      case "macro_identifier":
        value = this.parse_macro_identifier_node();
        end = value;
        break;
      case "open_paren": {
        this.eat();
        value = this.parse_expression();

        this.eat_whitespace();
        let next = this.peek();
        if (next.kind !== "close_paren") {
          kind = "tuple";
          return todo("parse_sub_expression: tuple");
        }

        while ((next = this.peek()) && next.kind !== "close_paren") {
          this.eat_whitespace();
        }

        end = this.eat();
        break;
      }
      case "operator":
        if (is_unary_prefix_operator(t.value)) {
          this.eat();

          const expression = this.parse_expression({
            is_unary_expression: true,
          });

          value = {
            kind: "unary_expression",
            operator: t.value,
            value: expression,
            location: this.location(t, expression),
          };
        } else {
          throw new Error(`Unexpected operator: ${t.value}`);
        }
        break;
      case "open_curly":
        value = this.parse_block_node();
        end = value;
        break;
      case "type_identifier":
        if (is_statement) {
          value = this.parse_type_identifier_node();
          end = value;
          break;
        } else {
          throw new Error(`Unexpected type identifier: ${t.value}`);
        }
      default:
        this.eat();

        throw new Error(`Unexpected token in sub_expression: ${t.kind}`);
    }

    if (negate && value.kind !== "number") {
      throw new Error(`Cannot negate a non-number`);
    }

    return {
      kind,
      value,
      location: this.location(start, end),
    };
  }

  parse_interpolation_node(): nodes.interpolation_node {
    const t = this.eat() as tokens.interpolation_token;

    // We need to parse an embedded set of tokens. This can't be
    // done with the current structure and semantics of the parser. Rather,
    // we can begin a new expression parse for the list of embedded tokens
    // and then reset the parser state after.
    const tokens = this.tokens;
    const cursor = this.cursor;

    this.tokens = t.value;
    this.cursor = 0;

    const value = this.parse_expression();

    this.tokens = tokens;
    this.cursor = cursor;

    return {
      kind: "interpolation",
      value,
      location: value.location,
    };
  }

  parse_string_node(): nodes.string_node {
    let s = this.eat() as tokens.string_token;

    let value: nodes.string_node["value"] = [];

    for (let t of s.value) {
      if (t.kind === "raw_string") {
        value.push(t);
      } else {
        let p = new parser();
        p.tokens = t.value;
        value.push(p.parse_expression());
      }
    }

    return {
      kind: "string",
      value,
      location: s.location,
    };
  }

  parse_number_node(): nodes.number_node {
    let t = this.eat() as tokens.number_token;

    return {
      kind: "number",
      value: t.value,
      variant: t.variant,
      raw: t.raw,
      location: t.location,
    };
  }

  parse_boolean_node(): nodes.boolean_node {
    let t = this.eat() as tokens.boolean_token;

    return {
      kind: "boolean",
      value: t.value,
      location: t.location,
    };
  }

  parse_identifier_node({
    allow_member_access = true,
  } = {}): nodes.identifier_node {
    let value: nodes.identifier_node["value"] = [];

    let start = this.peek();

    while (this.cursor < this.tokens.length) {
      let t = this.peek();

      switch (t.kind) {
        case "identifier":
          this.eat();
          value.push({
            kind: "identifier_name",
            value: t.value,
            location: t.location,
          });
          break;
        case "string":
          value.push(this.parse_string_node());
          break;
        case "interpolation":
          value.push(this.parse_interpolation_node());
          break;
        default:
          throw new Error(`Unexpected token: ${t.kind}`);
      }

      let next = this.peek();

      if (
        next &&
        next.kind === "operator" &&
        next.value === "." &&
        allow_member_access
      ) {
        this.eat();
      } else {
        break;
      }
    }

    let end = value[value.length - 1];

    return {
      kind: "identifier",
      value,
      location: this.location(start, end),
    };
  }

  parse_macro_identifier_node({
    allow_member_access = true,
  } = {}): nodes.macro_identifier_node {
    let value: nodes.macro_identifier_node["value"] = [];

    let start = this.peek();

    while (this.cursor < this.tokens.length) {
      let t = this.peek();

      switch (t.kind) {
        case "macro_identifier":
          this.eat();
          value.push({
            kind: "identifier_name",
            value: t.value,
            location: t.location,
          });
          break;
        case "string":
          value.push(this.parse_string_node());
          break;
        case "interpolation":
          value.push(this.parse_interpolation_node());
          break;
        default:
          throw new Error(`Unexpected token: ${t.kind}`);
      }

      let next = this.peek();

      if (
        next &&
        next.kind === "operator" &&
        next.value === "." &&
        allow_member_access
      ) {
        this.eat();
      } else {
        break;
      }
    }

    let end = value[value.length - 1];

    return {
      kind: "macro_identifier",
      value,
      location: this.location(start, end),
    };
  }

  parse_type_identifier_node({
    allow_member_access = true,
  } = {}): nodes.type_identifier_node {
    let value: nodes.type_identifier_node["value"] = [];

    let start = this.peek();

    while (this.cursor < this.tokens.length) {
      let t = this.peek();

      switch (t.kind) {
        case "type_identifier":
          this.eat();
          value.push({
            kind: "identifier_name",
            value: t.value,
            location: t.location,
          });
          break;
        case "string":
          value.push(this.parse_string_node());
          break;
        case "interpolation":
          value.push(this.parse_interpolation_node());
          break;
        default:
          throw new Error(`Unexpected token: ${t.kind}`);
      }

      let next = this.peek();

      if (
        next &&
        next.kind === "operator" &&
        next.value === "." &&
        allow_member_access
      ) {
        this.eat();
      } else {
        break;
      }
    }

    let end = value[value.length - 1];

    return {
      kind: "type_identifier",
      value,
      location: this.location(start, end),
    };
  }

  parse_comment_node(): nodes.comment_node {
    const t = this.eat() as tokens.comment_token;

    return {
      kind: "comment",
      value: t.value,
      multiline: t.value.includes("\n"),
      location: t.location,
    };
  }

  parse_keyword(): nodes.import_node | nodes.function_node | nodes.if_node {
    const keyword = this.peek() as tokens.keyword_token;

    switch (keyword.value) {
      case "import":
        return this.parse_import_node();
      case "fn":
        return this.parse_function_node();
      case "if":
        return this.parse_if_node();
      default:
        return todo(`parse_keyword: ${keyword.value}`);
    }
  }

  parse_import_node(): nodes.import_node {
    const keyword = this.eat() as tokens.keyword_token;

    this.eat_whitespace();

    let identifier: nodes.identifier_node[] = [];

    while (this.cursor < this.tokens.length) {
      const t = this.peek();

      if (t.kind !== "identifier") {
        break;
      }

      identifier.push(
        this.parse_identifier_node({
          allow_member_access: false,
        }),
      );

      const next = this.peek();
      const next_next = this.peek(1);

      if (
        next.kind === "operator" &&
        next.value === "." &&
        next_next.kind === "identifier"
      ) {
        this.eat();
      }
    }

    this.eat_whitespace();

    const as_keyword = this.peek();
    let alias: nodes.import_node["as"] | null = null;

    if (
      as_keyword &&
      as_keyword.kind === "keyword" &&
      as_keyword.value === "as"
    ) {
      this.eat();
      this.eat_whitespace();

      alias = this.parse_identifier_node({
        allow_member_access: false,
      });

      this.eat_whitespace();
    }

    const open_paren = this.peek();

    const expose: nodes.import_node["expose"] = [];

    if (open_paren && open_paren.kind === "open_paren") {
      this.eat();
      this.eat_whitespace();

      while (this.cursor < this.tokens.length) {
        this.eat_whitespace();

        const t = this.peek();

        if (
          t.kind !== "identifier" &&
          t.kind !== "macro_identifier" &&
          t.kind !== "type_identifier"
        ) {
          break;
        }

        switch (t.kind) {
          case "identifier":
            expose.push(
              this.parse_identifier_node({
                allow_member_access: false,
              }),
            );
            break;
          case "macro_identifier":
            expose.push(
              this.parse_macro_identifier_node({
                allow_member_access: false,
              }),
            );
            break;
          case "type_identifier":
            expose.push(
              this.parse_type_identifier_node({
                allow_member_access: false,
              }),
            );
            break;
        }

        this.eat_whitespace();

        const next = this.peek();

        if (next.kind === "operator" && next.value === ",") {
          this.eat();
        }
      }
    }

    const close_paren = this.peek();

    if (
      expose.length > 0 &&
      (!close_paren || close_paren.kind !== "close_paren")
    ) {
      throw new Error(
        `Expected a close paren after import statement, but got ${close_paren.kind}`,
      );
    }

    this.eat();

    return {
      kind: "import",
      identifier,
      as: alias,
      expose,
      location: this.location(keyword, close_paren),
    };
  }

  parse_function_node(): nodes.function_node {
    const keyword = this.eat() as tokens.keyword_token;

    this.eat_whitespace();

    const next = this.peek();

    let name: nodes.identifier_node | null = null;

    if (next.kind === "identifier") {
      name = this.parse_identifier_node();
    }

    this.eat_whitespace();

    const open_paren = this.peek();
    if (open_paren.kind !== "open_paren") {
      throw new Error(`Expected ( after function keyword`);
    }
    this.eat();
    this.eat_whitespace();

    const args: nodes.function_argument_node[] = [];

    while (this.cursor < this.tokens.length) {
      const t = this.peek();

      if (t.kind === "close_paren") {
        break;
      }

      args.push(this.parse_function_argument_node());

      const comma = this.peek();
      this.eat_whitespace();
      if (comma.kind === "operator" && comma.value === ",") {
        this.eat();
        this.eat_whitespace();
      }
    }

    const close_paren = this.peek();
    if (close_paren.kind !== "close_paren") {
      throw new Error(`Expected ) after function arguments`);
    }
    this.eat();
    this.eat_whitespace();

    let return_type: nodes.expression_node | null = null;
    const arrow = this.peek();
    if (arrow.kind === "operator" && arrow.value === "->") {
      this.eat();
      this.eat_whitespace();

      return_type = this.parse_expression({
        is_type_expression: true,
      });

      this.eat_whitespace();
    }

    const body = this.parse_block_node();

    return {
      kind: "function",
      name,
      args,
      body,
      return_type,
      location: this.location(keyword, body),
    };
  }

  parse_if_node(): nodes.if_node {
    const keyword = this.eat() as tokens.keyword_token;

    const condition = this.parse_expression();

    const body = this.parse_block_node();

    let else_node: nodes.if_node | nodes.block_node | null = null;

    if (!this.is_whitespace_multiline()) {
      this.eat_whitespace();
      const next = this.peek();

      if (next.kind === "keyword" && next.value === "else") {
        this.eat();
        this.eat_whitespace();

        const t = this.peek();

        if (t.kind === "keyword" && t.value === "if") {
          else_node = this.parse_if_node();
        } else {
          else_node = this.parse_block_node();
        }
      }
    }

    return {
      kind: "if",
      condition,
      body,
      else: else_node,
      location: this.location(keyword, else_node ?? body),
    };
  }

  parse_block_node(): nodes.block_node {
    this.eat_whitespace();
    const open_curly = this.eat() as tokens.open_curly_token;

    const body: nodes.statement_node[] = [];

    while (this.cursor < this.tokens.length) {
      this.eat_whitespace();

      const t = this.peek();

      if (t.kind === "close_curly") {
        break;
      }

      const statement = this.parse_statement();

      body.push(statement);
    }

    const close_curly = this.eat() as tokens.close_curly_token;

    return {
      kind: "block",
      value: body,
      location: this.location(open_curly, close_curly),
    };
  }

  parse_function_argument_node(): nodes.function_argument_node {
    const name = this.parse_identifier_node();
    this.eat_whitespace();

    const colon = this.peek();

    let type: nodes.expression_node | nodes.type_expression_node | null = null;

    if (colon.kind === "operator" && colon.value === ":") {
      this.eat();
      this.eat_whitespace();

      type = this.parse_expression({
        is_type_expression: true,
      });
    }

    return {
      kind: "function_argument",
      name,
      type,
      default: null,
      variant: "value",
      location: this.location(name, type ?? name),
    };
  }

  parse_type_assignment_value(
    name: nodes.type_identifier_node,
  ): nodes.type_expression_node | nodes.type_constructor_node[] {
    const t = this.peek();

    if (t.kind === "open_curly") {
      // Type constructor(s)
      const open_curly = this.eat() as tokens.open_curly_token;
      this.eat_whitespace();

      const ctor: nodes.type_constructor_node = {
        kind: "type_constructor",
        name: {
          ...name,
          // @ts-expect-error
          value: (name.value[0].value as string).substring(1),
        },
        args: [],
        is_shorthand: true,
      };

      const constructors: nodes.type_constructor_node[] = [];

      while (this.cursor < this.tokens.length) {
        this.eat_whitespace();
        let t = this.peek();

        if (t.kind === "close_curly") {
          break;
        }

        const name = this.parse_identifier_node();
        this.eat_whitespace();

        t = this.peek();

        // Multiple constructors
        if (t.kind === "open_paren") {
          this.eat();

          const args: nodes.type_constructor_argument_node[] = [];

          while (this.cursor < this.tokens.length) {
            this.eat_whitespace();

            const close_paren = this.peek();
            if (close_paren.kind === "close_paren") {
              break;
            }

            const name = this.parse_identifier_node();

            let type: nodes.expression_node | null = null;

            const colon = this.peek();
            if (colon.kind === "operator" && colon.value === ":") {
              this.eat();
              this.eat_whitespace();

              type = this.parse_expression({
                is_type_expression: true,
              });
            }

            args.push({
              kind: "type_constructor_argument",
              name,
              // @ts-expect-error
              value: {
                ...type,
                kind: "type_expression",
              },
              location: this.location(name, type ?? name),
            });

            const t = this.peek();
            if (t.kind === "operator" && t.value === ",") {
              this.eat();
              this.eat_whitespace();
            }
          }

          const close_paren = this.peek();
          if (close_paren.kind !== "close_paren") {
            throw new Error(
              `Expected a close paren after type constructor arguments`,
            );
          }
          this.eat();

          constructors.push({
            kind: "type_constructor",
            name,
            args,
            is_shorthand: false,
            location: this.location(name, close_paren),
          });
        } else if (t.kind === "operator" && t.value === ":") {
          this.eat();
          this.eat_whitespace();

          const value = this.parse_expression({
            is_type_expression: true,
          });

          ctor.args.push({
            kind: "type_constructor_argument",
            name,
            // @ts-expect-error
            value: {
              ...value,
              kind: "type_expression",
            },
            is_shorthand: false,
            location: this.location(name, value),
          });
        } else {
          throw new Error(`Expected a : or ( for type constructor`);
        }
      }

      const close_curly = this.peek();
      if (close_curly.kind !== "close_curly") {
        throw new Error(`Expected a close curly after type constructor`);
      }
      this.eat();

      if (ctor.args.length > 0 && constructors.length > 0) {
        throw new Error(
          `Cannot have both type constructors and type constructor arguments`,
        );
      }

      if (ctor.args.length > 0) {
        ctor.location = this.location(open_curly, close_curly);

        return [ctor];
      } else {
        return constructors;
      }
    } else {
      // Type expression
      const expression = this.parse_expression({
        is_type_expression: true,
      });

      // @ts-expect-error
      return {
        ...expression,
        kind: "type_expression",
      };
    }
  }
}
