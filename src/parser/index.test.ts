import { describe, test, expect, beforeEach } from "bun:test";
import parser from "./index";
import * as nodes from "./ast";
import { todo } from "@/util/todo";

const trim = (s: string) => s.trim();
const juice = (s: TemplateStringsArray, ...args: any[]) => {
  return s.reduce((acc, part, i) => {
    return acc + part + (args[i] || "");
  });
};

const expect_statement = (ast: any): ast is nodes.statement_node => {
  expect(ast).toHaveProperty("kind", "statement");

  return true;
};

const expect_comment = (ast: any): ast is nodes.comment_node => {
  expect(ast).toHaveProperty("kind", "comment");

  return true;
};

const pretty = (node: nodes.node | nodes.type_constructor_node[]): string => {
  if (Array.isArray(node)) {
    return node.map(pretty).join("\n");
  }

  switch (node.kind) {
    default:
      return todo(`pretty print for ${node.kind}`);
    case "statement":
      return pretty(node.value);
    case "assignment": {
      let text = pretty(node.left);

      if (node.type) {
        text += `: ${pretty(node.type)} =`;
      } else {
        text += " :=";
      }

      return `${text} ${pretty(node.right)}`;
    }
    case "type_assignment": {
      let text = pretty(node.left);

      if (
        Array.isArray(node.right) &&
        (node.right.length > 1 || !node.right[0].is_shorthand)
      ) {
        return `${text} := {\n${node.right.map(pretty).join("\n")}\n}`;
      }

      return `${text} := ${pretty(node.right)}`;
    }
    case "expression":
      return `${pretty(node.value)}`;
    case "binary_expression":
      return `(${pretty(node.value[0])} ${node.operator} ${pretty(
        node.value[1],
      )})`;
    case "unary_expression":
      return `(${node.operator}${pretty(node.value)})`;
    case "value_expression":
      return pretty(node.value);
    case "type_expression":
      return `${pretty(node.value)}`;
    case "number":
      return node.value.toString();
    case "boolean":
      return node.value.toString();
    case "string":
      return `"${node.value.map(pretty).join("")}"`;
    case "raw_string":
      return node.value;
    case "identifier":
      return node.value.map(pretty).join(".");
    case "identifier_name":
      return node.value;
    case "macro_identifier":
      return node.value.map(pretty).join(".");
    case "type_identifier":
      return node.value.map(pretty).join(".");
    case "import": {
      let text = `import ${node.identifier.map(pretty).join(".")}`;

      if (node.as) {
        text += ` as ${pretty(node.as)}`;
      }

      if (node.expose.length > 0) {
        text += ` (${node.expose.map(pretty).join(", ")})`;
      }

      return text;
    }
    case "interpolation":
      return `\${${pretty(node.value)}}`;
    case "function":
      return `fn${node.name ? " " + pretty(node.name) : ""}(${node.args
        .map(pretty)
        .join(", ")})${
        node.return_type ? ` -> ${pretty(node.return_type)} ` : " "
      }${pretty(node.body)}`;
    case "function_argument":
      return `${pretty(node.name)}${node.type ? `: ${pretty(node.type)}` : ""}`;
    case "block":
      return `{\n${node.value.map(pretty).join("\n")}\n}`;
    case "type_constructor":
      if (node.is_shorthand) {
        return `{\n${node.args
          .map(
            (arg) =>
              `${pretty(arg.name)}${
                arg.value ? `: ${pretty(arg.value)}` : "<null>"
              }`,
          )
          .join("\n")}\n}`;
      } else {
        return `${pretty(node.name)}(${node.args.map(pretty).join("\n")})`;
      }
    case "type_constructor_argument":
      return `${pretty(node.name)}${
        node.value ? `: ${pretty(node.value)}` : ""
      }`;
    case "if":
      return `if ${pretty(node.condition)} ${pretty(node.body)}${
        node.else ? ` else ${pretty(node.else)}` : ""
      }`;
  }
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

      const node = ast.body[0] as nodes.statement_node;

      const expression = node.value as nodes.expression_node;

      // statement_node -> expression_node -> value_expression_node -> string_node
      expect(expression.value.value).toHaveProperty("kind", "string");
    });
  });

  describe("Types", () => {
    test("parses a type alias", () => {
      let code = trim(`'x := int`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value as nodes.expression_node;

      expect(pretty(expression_node)).toBe(`'x := int`);
    });

    test("parses type constructor shorthand", () => {
      let code = trim(juice`'x := {
				y: int
			}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value as nodes.expression_node;

      expect(pretty(expression_node)).toBe(`'x := {
y: int
}`);
    });

    test("parses type constructors", () => {
      let code = trim(juice`'x := {
				y(value: int)
				z(value: string)
			}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value as nodes.expression_node;

      expect(pretty(expression_node)).toBe(`'x := {
y(value: int)
z(value: string)
}`);
    });
  });

  describe("Expressions", () => {
    test("parses a binary expression", () => {
      let code = trim(`"hello" + "world"`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      // statement_node -> expression_node -> binary_expression_node
      const binary_expression = (node.value as nodes.expression_node)
        .value as nodes.binary_expression_node;

      expect(binary_expression).toHaveProperty("kind", "binary_expression");
      expect(binary_expression).toHaveProperty("operator", "+");

      // left value
      expect(binary_expression.value[0]).toHaveProperty(
        "kind",
        "value_expression",
      );
      expect(binary_expression.value[0].value).toHaveProperty("kind", "string");

      // right value
      expect(binary_expression.value[1]).toHaveProperty(
        "kind",
        "value_expression",
      );
      expect(binary_expression.value[1].value).toHaveProperty("kind", "string");

      expect(pretty(binary_expression)).toBe(`("hello" + "world")`);
    });

    test("parses parentheses", () => {
      let code = trim(`(1 + 2) * 3`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`((1 + 2) * 3)`);
    });

    test("parses a unary expression", () => {
      let code = trim(`!true`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`(!true)`);
    });

    test("parses a unary expression with parentheses", () => {
      let code = trim(`!true && false`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`((!true) && false)`);
    });

    test("parses a member expression", () => {
      let code = trim(`x.y`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`x.y`);
    });

    test("parses a dynamic member expression", () => {
      let code = trim(`x.\${0}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`x.\${0}`);
    });

    test("parses a member expression with precedence", () => {
      let code = trim(`x.y + z`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`(x.y + z)`);
    });

    test("parses with precedence", () => {
      let code = trim(`1 + 2 * 3 - 4 / 5`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`((1 + (2 * 3)) - (4 / 5))`);
    });

    test("parses with parentheses", () => {
      let code = trim(`(1 + 2) * (3 - 4 / 5)`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const binary_expression = (node.value as nodes.expression_node)
        .value as nodes.binary_expression_node;

      expect(pretty(binary_expression)).toBe(`((1 + 2) * (3 - (4 / 5)))`);
    });
  });

  describe("Imports", () => {
    test("parses a simple import", () => {
      let code = trim(`import dev.juice.core`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`import dev.juice.core`);
    });

    test("parses import alias", () => {
      let code = trim(`import dev.juice.core as core`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`import dev.juice.core as core`);
    });

    test("parses import expose", () => {
      let code = trim(`import dev.juice.core (a, b, c)`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(`import dev.juice.core (a, b, c)`);
    });

    test("parses complex import", () => {
      let code = trim(
        `import dev.juice.core as core (f, my_macro!, something_else)`,
      );
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(
        `import dev.juice.core as core (f, my_macro!, something_else)`,
      );
    });

    test("parses multiline imports", () => {
      let code = trim(
        `import dev.juice.core as core (
						f,
						my_macro!,
						something_else
					)`,
      );
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value;

      expect(pretty(expression_node)).toBe(
        `import dev.juice.core as core (f, my_macro!, something_else)`,
      );
    });
  });

  describe("Variables", () => {
    test("inferred literal", () => {
      let code = trim(`x := 1`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`x := 1`);
    });

    test("typed literal", () => {
      let code = trim(`x: int = 1`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`x: int = 1`);
    });

    test("block", () => {
      let code = trim(`x: int = {
	a := 1
	a + 1
}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`x: int = {
a := 1
(a + 1)
}`);
    });
  });

  describe("Comments", () => {
    test("root comments", () => {
      let code = trim(`// this is a comment`);
      let ast = p.parse(code);

      expect_comment(ast.body[0]);

      const node = ast.body[0] as nodes.comment_node;

      expect(node.value).toBe(` this is a comment`);
    });
  });

  describe("Functions", () => {
    test("parses a function", () => {
      let code = trim(`fn main() {}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`fn main() {\n\n}`);
    });

    test("parses a function with args", () => {
      let code = trim(`fn main(x: int, y: int) {}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`fn main(x: int, y: int) {\n\n}`);
    });

    test("parses a function with return type", () => {
      let code = trim(`fn main() -> int {}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`fn main() -> int {\n\n}`);
    });

    test("parses a function with args and return type", () => {
      let code = trim(`fn main(x: int, y: int) -> int {}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`fn main(x: int, y: int) -> int {\n\n}`);
    });

    test("parses a function with a body", () => {
      let code = trim(`fn main() {
	x := 1

	x + 2
}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      expect(pretty(node.value)).toBe(`fn main() {
x := 1
(x + 2)
}`);
    });
  });

  describe("Conditionals", () => {
    test("parses an if expression", () => {
      let code = trim(`if true {
				y := 1
			}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value as nodes.expression_node;

      expect(pretty(expression_node)).toBe(`if true {
y := 1
}`);
    });

    test("parses an if else expression", () => {
      let code = trim(`if true {
				y := 1
			} else {
				y := 2
			}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value as nodes.expression_node;

      expect(pretty(expression_node)).toBe(`if true {
y := 1
} else {
y := 2
}`);
    });

    test("parses an if else if expression", () => {
      let code = trim(`if true {
				y := 1
			} else if false {
				y := 2
			}`);
      let ast = p.parse(code);

      expect_statement(ast.body[0]);

      const node = ast.body[0] as nodes.statement_node;

      const expression_node = node.value as nodes.expression_node;

      expect(pretty(expression_node)).toBe(`if true {
y := 1
} else if false {
y := 2
}`);
    });
  });
});
