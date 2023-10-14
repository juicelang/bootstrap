import { location } from "@/lexer/location";
import * as tokens from "@/lexer/tokens";
import * as nodes from "./ast";
import lexer from "@/lexer";
import { todo } from "@/util/todo";

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
    let t = this.peek();

    switch (t.kind) {
      default:
        return this.parse_statement();
    }
  }

  parse_statement(): nodes.statement_node {
    let t = this.peek();

    let value: nodes.statement_node["value"];

    switch (t.kind) {
      default:
        value = this.parse_expression();
        break;
      case "eof":
        throw new Error(`Unexpected end of file`);
        break;
    }

    return {
      kind: "statement",
      value,
      location: this.location(value, value),
    };
  }

  parse_expression({
    is_function_argument = false,
    is_unary_expression = false,
  } = {}): nodes.expression_node {
    let t = this.peek();

    let root_sub_expression = this.parse_sub_expression();
    let last_binary_expression: nodes.binary_expression_node | undefined;
    let precedence = 0;

    while (this.cursor < this.tokens.length) {
      let next = this.peek_non_whitespace();

      if (next.kind === "eof") {
        break;
      }

      if (next.kind === "operator" && next.value === ".") {
        this.eat_whitespace();

        this.eat();

        let sub_expression = this.parse_sub_expression({
          is_function_argument,
          is_unary_expression,
        });

        todo("parse_expression: member access");
        continue;
      }

      todo("parse_expression: fallthrough");
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
  } = {}): nodes.value_expression_node {
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
      case "identifier":
        value = this.parse_identifier_node();
        end = value;
        break;
      case "open_paren":
        this.eat();
        value = this.parse_expression();
        end = this.eat();
        break;
      default:
        this.eat();

        throw new Error(`Unexpected token: ${t.kind}`);
    }

    if (negate && value.kind !== "number") {
      throw new Error(`Cannot negate a non-number`);
    }

    if (value.kind === "expression" || value.kind === "identifier") {
      // TODO: Check if this is a function call
    }

    return {
      kind: "value_expression",
      value,
      location: this.location(start, end),
    };
  }

  parse_interpolation_node(): nodes.interpolation_node {}

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

  parse_identifier_node():
    | nodes.identifier_node
    | nodes.member_expression_node {
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

      if (next && next.kind === "operator" && next.value === ".") {
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
}
