// @ts-ignore
import coder from "@littlethings/coder";
import * as nodes from "@/parser/ast";
import { todo } from "@/util/todo";

export interface scope {
  types: {
    [key: string]: {
      access: string;
      node: nodes.type_constructor_node;
    };
  };
  variables: {
    [key: string]: {
      access: string;
      node: nodes.identifier_node;
    };
  };
}

export default class generator {
  coder: coder = new coder();
  scopes: scope[] = [];
  imports_output: string = "";
  types_output: string = "";
  impls_output: string = "";
  output: string = "";

  namespace: string = "";
  module_name: string = "";

  registered_types: string[] = [];

  id_counter: number = 0;

  export_type: boolean = false;

  generate(
    namespace: string,
    module_name: string,
    ast: nodes.root_node,
  ): string {
    this.coder = new coder();
    this.namespace = namespace;
    this.module_name = module_name;
    this.scopes = [];
    this.output = "";
    this.imports_output = "";
    this.types_output = "";
    this.impls_output = "";

    this.registered_types = [];
    this.id_counter = 0;

    for (const node of ast.body) {
      const result = this.generate_node(node);

      if (result) {
        this.emit(result);
      }
    }

    return [
      this.imports_output,
      this.types_output,
      this.impls_output,
      this.output,
    ].join("\n");
  }

  emit(text: string) {
    this.output += "\n" + text;
  }

  emit_imports(text: string) {
    this.imports_output += "\n" + text;
  }

  emit_types(text: string) {
    this.types_output += "\n" + text;
  }

  emit_impls(text: string) {
    this.impls_output += "\n" + text;
  }

  unique_id() {
    return `__${this.id_counter++}`;
  }

  generate_node(node: nodes.node): string | void {
    switch (node.kind) {
      default:
        return todo(`generate_node: ${node.kind}`);
      case "statement":
        return this.generate_statement(node);
    }
  }

  generate_statement(statement: nodes.statement_node) {
    switch (statement.value.kind) {
      default:
        return todo(`generate_statement: ${statement.value.kind}`);
      case "import":
        return this.generate_import(statement.value);
      case "type_assignment":
        return this.generate_type_assignment(statement.value);
      case "assignment":
        return this.generate_assignment(statement.value);
      case "function":
        return this.generate_function(statement.value);
      case "expression":
        return this.generate_expression(statement.value) + ";";
      case "export":
        return this.generate_export(statement.value);
      case "for":
        return this.generate_for(statement.value);
      case "impl":
        return this.generate_impl(statement.value);
      case "eof":
        return;
    }
  }

  generate_expression(expression: nodes.expression_node) {
    return this.generate_sub_expression(expression.value);
  }

  generate_sub_expression(sub_expression: nodes.sub_expression_node) {
    switch (sub_expression.kind) {
      default:
        // @ts-ignore
        return todo(`generate_sub_expression: ${sub_expression.kind}`);
      case "value_expression":
        return this.generate_value_expression(sub_expression);
      case "unary_expression":
        return this.generate_unary_expression(sub_expression);
      case "binary_expression":
        return this.generate_binary_expression(sub_expression);
      // @ts-ignore
      case "function_call":
        return this.generate_function_call(sub_expression);
    }
  }

  generate_value_expression(
    value_expression: nodes.value_expression_node,
  ): string {
    switch (value_expression.value.kind) {
      default:
        return todo(
          `generate_value_expression: ${value_expression.value.kind}`,
        );
      case "unary_expression":
        return this.generate_unary_expression(value_expression.value);
      case "expression":
        return this.generate_expression(value_expression.value);
      case "number":
        return this.generate_number(value_expression.value);
      case "boolean":
        return this.generate_boolean(value_expression.value);
      case "string":
        return this.generate_string(value_expression.value);
      case "identifier":
        return this.generate_identifier(value_expression.value);
      case "function":
        return this.generate_function(value_expression.value);
      case "block":
        return this.generate_block(value_expression.value);
      case "list":
        return this.generate_list(value_expression.value);
    }
  }

  generate_unary_expression(
    unary_expression: nodes.unary_expression_node,
  ): string {
    return `${unary_expression.operator}${this.generate_expression(
      unary_expression.value,
    )}`;
  }

  generate_binary_expression(
    binary_expression: nodes.binary_expression_node,
  ): string {
    const left = this.generate_sub_expression(binary_expression.value[0]);
    const right = this.generate_sub_expression(binary_expression.value[1]);

    return `(${left} ${binary_expression.operator} ${right})`;
  }

  generate_import(import_node: nodes.import_node) {
    const module_name_parts = import_node.identifier.map(
      (part) => part.value[0].value,
    );
    let module_name = module_name_parts.join(".");

    if (import_node.internal) {
      module_name = this.namespace + "." + module_name;
    }

    if (import_node.foreign) {
      module_name += "__foreign";
    }

    const expose = import_node.expose
      .map((part) => part.value[0].value)
      .join(", ");
    const as =
      import_node.as?.value[0].value ??
      module_name_parts[module_name_parts.length - 1];

    const namespace_import = `import * as ${as} from "./${module_name}.js";`;
    const named_import = `import { ${expose} } from "./${module_name}.js";`;

    this.emit_imports(
      `${
        import_node.expose.length === 0 || import_node.as !== null
          ? namespace_import
          : ""
      }${import_node.expose.length > 0 ? `\n${named_import}` : ""}`,
    );
  }

  generate_export(export_node: nodes.export_node): string {
    if (
      export_node.value.kind === "statement" &&
      export_node.value.value.kind === "type_assignment"
    ) {
      this.export_type = true;
      this.generate_statement(export_node.value);
      this.export_type = false;
      return "";
    }

    return `export ${this.generate_statement(export_node.value)}`;
  }

  generate_type_assignment(assignment: nodes.type_assignment_node) {
    const { left, right } = assignment;

    let name: string;
    let value: nodes.type_expression_node | nodes.type_constructor_node[];

    if (left.kind === "type_identifier") {
      name = left.value[0].value as string;
      value = right;
      // @ts-ignore
    } else if (left.kind === "function_call") {
      // @ts-expect-error
      name = (left as nodes.function_call_node).target.value.value.value[0]
        .value as string;
      value = right;
    } else {
      throw new Error(
        `Invalid left-hand side of type assignment: ${left.kind}`,
      );
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return this.generate_type_constructor(name, {
          kind: "type_constructor",
          // @ts-expect-error
          name: left,
          args: [],
          location: left.location,
          is_shorthand: true,
        });
      } else {
        return value
          .map((type_constructor) =>
            this.generate_type_constructor(name, type_constructor),
          )
          .join("\n");
      }
    } else {
      console.warn("generate_type_assignment non-runtime value");
    }
  }

  generate_type_constructor(
    name: string,
    type_constructor: nodes.type_constructor_node,
  ) {
    const sanitized_type_name = name.replace(/^'/, "");

    const maybe_name = type_constructor.name.value[0];
    const sanitized_name = (
      typeof maybe_name === "string"
        ? maybe_name
        : type_constructor.name.value[0].value
    )
      // @ts-expect-error
      .replace(/^'/, "");

    const parameters = type_constructor.args.map(
      (arg) => arg.name.value[0].value,
    );

    const properties = parameters.map((name) => `this.${name} = ${name};`);

    const function_name = `${sanitized_type_name}__${sanitized_name}`;

    const do_export = this.export_type ? "export " : "";

    if (
      !type_constructor.is_shorthand &&
      !this.registered_types.includes(sanitized_type_name)
    ) {
      const setup = `${do_export}const ${sanitized_type_name} = Object.create(null)`;

      this.emit_types(setup);
      this.registered_types.push(sanitized_type_name);
    }

    const access = type_constructor.is_shorthand
      ? `${sanitized_type_name}`
      : `${sanitized_type_name}.${sanitized_name}`;

    const create_or_access = type_constructor.is_shorthand
      ? `${do_export}const ${access}`
      : `${access}`;

    const result = `${create_or_access} = function ${function_name}(${parameters.join(
      ", ",
    )}) {
	if (!(this instanceof ${function_name})) {
		return new ${access}(${parameters.join(", ")});
	}

	${properties.join("\n")}

	this._type = "${sanitized_type_name}#${sanitized_name}";
}

${access}._type = "${sanitized_type_name}#${sanitized_name}";
`;

    this.emit_types(result);
  }

  generate_assignment(assignment: nodes.assignment_node) {
    const name =
      assignment.left.kind === "expression"
        ? this.generate_expression(assignment.left)
        : // @ts-ignore
          this.generate_sub_expression(assignment.left);

    const value = this.generate_expression(assignment.right);

    return `let ${name} = ${value};`;
  }

  generate_number(number: nodes.number_node) {
    return String(number.value);
  }

  generate_boolean(boolean: nodes.boolean_node) {
    return String(boolean.value);
  }

  generate_string(string: nodes.string_node) {
    let result = "";

    for (const part of string.value) {
      if (part.kind === "raw_string") {
        result += part.value
          .replaceAll(/`/g, "\\`")
          .replaceAll(/\$\{/g, "\\${");
      } else {
        result += `\${${this.generate_sub_expression(part.value)}}`;
      }
    }

    if (result.startsWith("\n")) {
      const all_lines = result.split("\n");
      const lines = all_lines.slice(1, all_lines.length - 1);

      const parts = [];

      for (const line of lines) {
        parts.push(`${line.replace(/^\s*\| ?/, "")}`);
      }

      result = parts.join("\n");

      return `\`${parts.join("\\n")}\``;
    }

    return `\`${result.replaceAll(/\n/g, "\\n")}\``;
  }

  generate_identifier(identifier: nodes.identifier_node) {
    return identifier.value.map((part) => part.value).join(".");
  }

  generate_function(function_node: nodes.function_node): string {
    const name = function_node.name?.value[0].value;
    const parameters = function_node.args.map(
      (param) => param.name.value[0].value,
    );

    const body = function_node.body.value
      .map((node, i, xs) => {
        if (i === xs.length - 1 && node.value.kind === "expression") {
          return `return ${this.generate_expression(node.value)};`;
        }

        return this.generate_statement(node);
      })
      .join("\n");

    const result = `function${name ? ` ${name}` : ""}(${parameters.join(
      ", ",
    )}) {
${body}
}`;

    return result;
  }

  generate_function_call(function_call: nodes.function_call_node): string {
    const target = this.generate_expression(function_call.target);
    const args = function_call.args.map((arg) =>
      this.generate_expression(arg.value),
    );

    return `${target}(${args.join(", ")})`;
  }

  generate_block(block: nodes.block_node): string {
    const statements = block.value
      .map((statement, i, xs) => {
        if (i === xs.length - 1 && statement.value.kind === "expression") {
          return `return ${this.generate_expression(statement.value)};`;
        }
        return this.generate_statement(statement);
      })
      .join("\n");

    return `(() => {
${statements}
})()`;
  }

  generate_list(list: nodes.list_node) {
    const values = list.value
      .map((value) => this.generate_expression(value))
      .join(", ");

    return `[${values}]`;
  }

  generate_for(for_node: nodes.for_node) {
    const body = this.generate_block(for_node.body);

    if (for_node.iterable && for_node.identifier) {
      const identifier = this.generate_expression(for_node.identifier);

      if (for_node.iterable.kind === "range") {
        const from = this.generate_expression(for_node.iterable.from);
        const to = this.generate_expression(for_node.iterable.to);

        const id = this.unique_id();

        return `
const ${id} = ${from} <= ${to}
const ${id}_from = ${from};
const ${id}_to = ${to};
for (let __i = ${id}_from; (${id} ? __i < ${id}_to : __i > ${id}_to); (${id} ? __i++ : __i--)) {
const ${identifier} = __i;
${body}\n}`;
      } else {
        const iterable = this.generate_expression(for_node.iterable);
        return `for (const ${identifier} of ${iterable}) {\n${body}\n}`;
      }
    } else if (for_node.iterable && !for_node.identifier) {
      if (for_node.iterable.kind === "range") {
        const from = this.generate_expression(for_node.iterable.from);
        const to = this.generate_expression(for_node.iterable.to);

        const id = this.unique_id();

        return `
const ${id} = ${from} <= ${to}
for (let __i = ${from}; (${id} ? __i < ${to} : __i > ${to}); (${id} ? __i++ : __i--)) {\n${body}\n}`;
      } else {
        const iterable = this.generate_expression(for_node.iterable);
        return `for (const ${this.unique_id()} of ${iterable}) {\n${body}\n}`;
      }
    } else if (!for_node.iterable && for_node.identifier) {
      const iterable = this.generate_expression(for_node.identifier);
      return `for (const ${this.unique_id()} of ${iterable}) {\n${body}\n}`;
    } else {
      return `while (true) {\n${body}\n}`;
    }
  }

  generate_impl(impl: nodes.impl_node) {
    const methods: string[] = [];

    const name = this.generate_expression(impl.target);

    for (const function_node of impl.methods) {
      if (function_node.name === null) {
        throw new Error("Impl methods must have a name");
      }

      const method_name = this.generate_identifier(function_node.name);

      const parameters = function_node.args.map(
        (param) => param.name.value[0].value,
      );

      const body = function_node.body.value
        .map((node, i, xs) => {
          if (i === xs.length - 1 && node.value.kind === "expression") {
            return `return ${this.generate_expression(node.value)};`;
          }

          return this.generate_statement(node);
        })
        .join("\n");

      const access = function_node.static
        ? `${name}.${method_name}`
        : `${name}.prototype.${method_name}`;

      let result = "";
      if (function_node.static) {
        result = `${access} = function() {
	return (function${name ? ` __${method_name}` : ""}(${parameters.join(", ")}) {
		${body}
	})(...arguments);
}`;
      } else {
        result = `${access} = function() {
	const self = this;
	return (function${name ? ` __${method_name}` : ""}(${parameters.join(", ")}) {
		${body}
	})(self, ...arguments);
}`;
      }

      methods.push(result);
    }

    this.emit_impls(methods.join("\n"));
  }
}