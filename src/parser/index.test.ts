import { describe, test, expect, beforeEach } from "bun:test";
import parser from "./index";
import { statement_node } from "./ast";

const trim = (s: string) => s.trim();

const expect_statement = (ast: any): ast is statement_node => {
  expect(ast).toHaveProperty("kind", "statement");

  return true;
};

describe("Parser", () => {
  let p: parser;

  beforeEach(() => {
    p = new parser();
  });

  describe("Strings", () => {
    test("parses a string", () => {
      let code = trim(`"hello world"`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as statement_node;

      // statement_node -> expression_node -> value_expression_node -> string_node
      expect(node.value.value.value).toHaveProperty("kind", "string");
    });
  });
});
