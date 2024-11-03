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

	anchor: string = "";

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

	emit_anchor(text: string) {
		this.anchor += "\n" + text;
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
		let text: string | void;

		this.anchor = "";

		switch (statement.value.kind) {
			default:
				return todo(`generate_statement: ${statement.value.kind}`);
			case "import":
				text = this.generate_import(statement.value);
				break;
			case "type_assignment":
				text = this.generate_type_assignment(statement.value);
				break;
			case "assignment":
				text = this.generate_assignment(statement.value);
				break;
			case "function":
				text = this.generate_function(statement.value);
				break;
			case "expression":
				text = this.generate_expression(statement.value) + ";";
				break;
			case "export":
				text = this.generate_export(statement.value);
				break;
			case "for":
				text = this.generate_for(statement.value);
				break;
			case "impl":
				text = this.generate_impl(statement.value);
				break;
			case "if":
				text = this.generate_if(statement.value);
				break;
			case "break":
				text = this.generate_break(statement.value);
				break;
			case "return":
				text = this.generate_return(statement.value);
				break;
			case "match":
				text = this.generate_match(statement.value);
				break;
			case "macro_call":
				text = this.generate_macro_call(statement.value);
			case "eof":
				return;
		}

		const anchor = this.anchor;
		this.anchor = "";

		if (text) {
			return `${anchor}\n${text}`;
		}
	}

	generate_expression(expression: nodes.expression_node) {
		return this.generate_sub_expression(expression.value);
	}

	generate_sub_expression(
		sub_expression: nodes.sub_expression_node,
	): string | void {
		switch (sub_expression.kind) {
			default:
				// @ts-ignore
				return todo(`generate_sub_expression: ${sub_expression.kind}`);
			// @ts-ignore
			case "expression":
				return this.generate_expression(sub_expression);
			case "value_expression":
				return this.generate_value_expression(sub_expression);
			case "unary_expression":
				return this.generate_unary_expression(sub_expression);
			case "binary_expression":
				return this.generate_binary_expression(sub_expression);
			// @ts-ignore
			case "member_expression":
				return this.generate_member_expression(sub_expression);
			// @ts-ignore
			case "identifier":
				return this.generate_identifier(sub_expression);
			// @ts-ignore
			case "function_call":
				return this.generate_function_call(sub_expression);
			// @ts-ignore
			case "macro_call":
				return this.generate_macro_call(sub_expression);
			// @ts-ignore
			case "string":
				return this.generate_string(sub_expression);
		}
	}

	generate_value_expression(
		value_expression: nodes.value_expression_node,
	): string | void {
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
				return this.generate_block_expression(value_expression.value);
			case "list":
				return this.generate_list(value_expression.value);
			case "if":
				return this.generate_if_expression(value_expression.value);
			case "unwrap":
				return this.generate_unwrap(value_expression.value);
			case "match":
				return this.generate_match(value_expression.value);
			case "record":
				return this.generate_record(value_expression.value);
			// @ts-ignore
			case "type_assignment":
				return "";
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

		const operator =
			binary_expression.operator === "==" ? "===" : binary_expression.operator;

		return `(${left} ${operator} ${right})`;
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
			`${import_node.expose.length === 0 || import_node.as !== null
				? namespace_import
				: ""
			}${import_node.expose.length > 0 ? `\n${named_import}` : ""}`,
		);
	}

	generate_export(export_node: nodes.export_node): string {
		const statement = export_node.value;

		if (
			statement.kind === "statement" &&
			statement.value.kind === "type_assignment"
		) {
			this.export_type = true;
			this.generate_statement(export_node.value);
			this.export_type = false;
			return "";
		}

		return `export ${this.generate_statement(export_node.value)?.trim()}`;
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

		const serialized_type_name = `${this.namespace}.${this.module_name}@${sanitized_type_name}`;

		const sanitized_name = (
			typeof type_constructor.name.value === "string"
				? type_constructor.name.value
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
			const setup = `${do_export}const ${sanitized_type_name} = Object.create(null);
${sanitized_type_name}.prototype = {};
${sanitized_type_name}.toString = function() {
		return "${sanitized_type_name}";
}
${sanitized_type_name}.to_string = ${sanitized_type_name}.toString;`;

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

	this._type = "${serialized_type_name}#${sanitized_name}";

	this.toString = function() {
		return \`${sanitized_type_name}#${sanitized_name}(${parameters
				.map((p) => `${p}: \${globalThis.juice.pretty(this.${p})}`)
				.join(", ")})\`
	};

	this.to_string = this.toString.bind(this);
}

${type_constructor.is_shorthand
				? ""
				: `Object.setPrototypeOf(${access}.prototype, ${sanitized_type_name}.prototype);`
			}
${access}._is_ctor = true;
${access}._params = [${parameters.map((p) => `"${p}"`).join(", ")}];
${access}._type = "${serialized_type_name}#${sanitized_name}";
${access}.toString = function() {
		return "${sanitized_type_name}#${sanitized_name}";
}
${access}.to_string = ${access}.toString;
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
					.replaceAll(/\\/g, "\\\\")
					.replaceAll(/`/g, "\\`")
					.replaceAll(/\$\{/g, "\\${")
					.replace(/\n/g, "\\n");
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
		const rendered = identifier.value.map((part, i) => {
			if (part.kind === "interpolation") {
				return `[${this.generate_sub_expression(part.value)}]`;
			}

			if (part.kind === "identifier_name") {
				return part.value
			}

			return this.generate_sub_expression(part.value);
		});

		let result = "";
		for (let i = 0; i < rendered.length; i++) {
			const current = rendered[i];
			const next = rendered[i + 1];

			if (next) {
				if (next.startsWith("[")) {
					result += `${current}`;
				} else {
					result += `${current}.`;
				}
			} else {
				result += `${current}`;
			}
		}

		return result;
	}

	generate_function(function_node: nodes.function_node): string {
		const name = function_node.name?.value[0].value;

		// @ts-ignore
		if (name && name[name.length - 1] === "!") {
			return "";
		}

		const parameters = function_node.args.map(
			(param) => param.name.value[0].value,
		);

		const body = function_node.body.value
			.map((node, i, xs) => {
				if (i === xs.length - 1) {
					if (node.value.kind === "expression") {
						return `return ${this.generate_expression(node.value)};`;
					}
					if (node.value.kind === "if") {
						return `return ${this.generate_if_expression(node.value)}`;
					}
					if (node.value.kind === "match") {
						return `return ${this.generate_match(node.value)}`;
					}
				}

				return this.generate_statement(node);
			})
			.join("\n");

		const result = `${function_node.async ? "async " : ""}function${name ? ` ${name}` : ""
			}(${parameters.join(", ")}) {
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
				if (i === xs.length - 1) {
					if (statement.value.kind === "expression") {
						return `${this.generate_expression(statement.value)};`;
					}
					if (statement.value.kind === "if") {
						return this.generate_if(statement.value);
					}
				}
				return this.generate_statement(statement);
			})
			.join("\n");

		return `${statements}`;
	}

	generate_block_expression(block: nodes.block_node): string {
		const statements = block.value
			.map((statement, i, xs) => {
				if (i === xs.length - 1) {
					if (statement.value.kind === "expression") {
						return `return ${this.generate_expression(statement.value)};`;
					}
					if (statement.value.kind === "if") {
						return `return ${this.generate_if_expression(statement.value)}`;
					}
				}
				return this.generate_statement(statement);
			})
			.join("\n");

		return `(() => {${statements}})()`;
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
for (let ${identifier} = ${id}_from; (${id} ? ${identifier} < ${id}_to : ${identifier} > ${id}_to); (${id} ? ${identifier}++ : ${identifier}--)) {
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
for (let ${identifier} = ${from}; (${id} ? ${identifier} < ${to} : ${identifier} > ${to}); (${id} ? ${identifier}++ : ${identifier}--)) {\n${body}\n}`;
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

		let name;

		if (impl.target.value.kind === "member_expression") {
			const member_expression = impl.target.value;

			const parts = member_expression.value.map(part => this.generate_sub_expression(part));

			name = parts.join(".");
		} else if (impl.target.value.kind === "function_call") {
			const function_call = impl.target.value;
			const expression = function_call.target;

			if (expression.value.kind === "member_expression") {
				const parts = expression.value.value.map(part => this.generate_sub_expression(part));

				name = parts.join(".");
			} else {
				name = this.generate_expression(expression);
			}
		} else {
			name = this.generate_expression(impl.target);
		}


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
					if (i === xs.length - 1) {
						if (node.value.kind === "expression") {
							return `return ${this.generate_expression(node.value)};`;
						}
						if (node.value.kind === "if") {
							return `return ${this.generate_if_expression(node.value)}`;
						}
						if (node.value.kind === "match") {
							return `return ${this.generate_match(node.value)}`;
						}
					}

					return this.generate_statement(node);
				})
				.join("\n");

			const access = function_node.static
				? `${name}.${method_name}`
				: `${name}.prototype.${method_name}`;

			let result = "";
			if (function_node.static) {
				result = `${access} = function(...__args) {
	return (function${name ? ` __${method_name}` : ""}(${parameters.join(", ")}) {
		${body}
	})(...__args);
}`;
			} else {
				result = `${access} = function(...__args) {
	const self = this;
	return (function${name ? ` __${method_name}` : ""}(${parameters.join(", ")}) {
		${body}
	})(self, ...__args);
}`;
			}

			methods.push(result);
		}

		this.emit_impls(methods.join("\n"));
	}

	generate_if(if_node: nodes.if_node): string {
		const condition = this.generate_expression(if_node.condition);
		const body = this.generate_block(if_node.body);

		let else_body = "";

		if (if_node.else) {
			if (if_node.else.kind === "if") {
				else_body = this.generate_if(if_node.else);
			} else {
				else_body = this.generate_block(if_node.else);
			}
		}

		return `if (${condition}) {
${body}
}${else_body
				? `else {
${else_body}
}`
				: ""
			}`;
	}

	generate_if_expression(if_node: nodes.if_node): string {
		const condition = this.generate_expression(if_node.condition);

		const statements = if_node.body.value.map((node, i, xs) => {
			if (i === xs.length - 1) {
				if (node.value.kind === "expression") {
					return `return ${this.generate_expression(node.value)};`;
				}
				if (node.value.kind === "if") {
					return this.generate_if_expression(node.value);
				}
				if (node.value.kind === "match") {
					return `return ${this.generate_match(node.value)}`;
				}
			}
			return this.generate_statement(node);
		});

		let else_body = "";

		if (if_node.else) {
			if (if_node.else.kind === "if") {
				else_body = `return ${this.generate_if_expression(if_node.else)}`;
			} else {
				else_body = if_node.else.value
					.map((node, i, xs) => {
						if (i === xs.length - 1) {
							if (node.value.kind === "expression") {
								return `return ${this.generate_expression(node.value)};`;
							}
							if (node.value.kind === "if") {
								return `return ${this.generate_if_expression(node.value)}`;
							}
							if (node.value.kind === "match") {
								return `return ${this.generate_match(node.value)}`;
							}
						}
						return this.generate_statement(node);
					})
					.join("\n");
			}
		}

		return `(() => {
if (${condition}) {
${statements.join("\n")}
}${else_body
				? ` else {
${else_body}
}`
				: ""
			}
})()`;
	}

	generate_break(break_node: nodes.break_node) {
		return "break;";
	}

	generate_return(return_node: nodes.return_node) {
		if (return_node.value === null) {
			return `return;`;
		}

		return `return ${this.generate_expression(return_node.value)};`;
	}

	generate_member_expression(
		member_expression: nodes.member_expression_node,
	): string {
		const left =
			// @ts-expect-error
			member_expression.value[0].kind === "function_call"
				? // @ts-expect-error
				this.generate_sub_expression(member_expression.value[0])
				: this.generate_expression(member_expression.value[0]);
		const right = this.generate_expression(member_expression.value[1]);

		if (right === "await") {
			return `(await (${left}))`;
		} else {
			return `(${left}.${right})`;
		}
	}

	generate_unwrap(unwrap_node: nodes.unwrap_node): string {
		const expression = this.generate_sub_expression(unwrap_node.value);

		const id = this.unique_id();

		this.emit_anchor(`const ${id} = ${expression};
const ${id}__is_result = globalThis.juice.is_result_type(${id});
if (!${id}__is_result) {
	throw new Error("Value is not a result type");
}
const ${id}__is_ok = globalThis.juice.is_result_ok(${id});

if (!${id}__is_ok) {
	return ${id}
}
`);

		return `globalThis.juice.unwrap_result(${id})`;
	}

	generate_match(match_node: nodes.match_node): string {
		const target = this.generate_expression(match_node.target)!;

		const id = this.unique_id();

		const choices = match_node.choices
			.map((choice) => this.generate_match_choice(id, choice))
			.join(" else ");

		const fallback = match_node.fallback
			? `return ${this.generate_block_expression(match_node.fallback)}`
			: `throw new Error("No match found for ${target}")`;

		return `(() => {
const ${id} = ${target};

${choices} else {
${fallback}
}

})()`;
	}

	generate_match_choice(
		match_target: string,
		match_choice: nodes.match_choice_node,
	): string {
		let choice_target: string;

		const bindings: [string, string][] = [];
		// @ts-expect-error
		if (match_choice.value.value.kind === "function_call") {
			// @ts-expect-error
			const target = this.generate_expression(match_choice.value.value.target)!;
			choice_target = target;

			// @ts-expect-error
			for (let i = 0; i < match_choice.value.value.args.length; i++) {
				// @ts-expect-error
				const arg = match_choice.value.value.args[
					i
				] as nodes.function_call_argument_node;
				if (arg.name) {
					// Binding `arg.value` to `${target}.${arg.name}`
					// @ts-expect-error
					const name = this.generate_identifier(arg.name)!;
					const value = this.generate_expression(arg.value)!;
					bindings.push([value, `${target}.${name}`]);
				} else {
					// Binding `arg.value` to `${target}._args[i]`
					const name = this.generate_expression(arg.value)!;
					bindings.push([name, `${match_target}[${target}._params[${i}]]`]);
				}
			}
		} else {
			choice_target = this.generate_expression(match_choice.value)!;
		}

		// const body = this.generate_block_expression(match_choice.body);
		const body = match_choice.body.value
			.map((statement, i, xs) => {
				if (i === xs.length - 1) {
					if (statement.value.kind === "expression") {
						return `return ${this.generate_expression(statement.value)};`;
					}
					if (statement.value.kind === "if") {
						return `return ${this.generate_if_expression(statement.value)}`;
					}
				}
				return this.generate_statement(statement);
			})
			.join("\n");

		const rendered_bindings = bindings
			.map(([value, target]) => `let ${value} = ${target};`)
			.join("\n");

		return `if (globalThis.juice.match(${match_target}, ${choice_target})) {
	${rendered_bindings}
	${body === "" ? "return;" : body}
}`;
	}

	generate_macro_call(macro_call: nodes.macro_call_node) {
		// @ts-ignore
		const name = this.generate_identifier(macro_call.name);

		const sanitized = name.replace("!", "");

		let args = [];
		if (macro_call.args) {
			args = macro_call.args.map((arg) => this.generate_expression(arg.value));
		}

		let body = "";
		if (macro_call.body) {
			body = macro_call.body.trim();
		}

		switch (name) {
			case "js!": {
				return `((${args.join(", ")}) => {
${body}
})(${args.join(", ")})`
			}
			default:
				return "";
		}
	}

	generate_record(record: nodes.record_node) {
		const properties = record.value.map((entry) => {
			const key = this.generate_expression(entry.key);
			const value = this.generate_expression(entry.value);

			if (entry.key.value.kind === "value_expression" && entry.key.value.value.kind !== "identifier") {
				return `[${key}]: ${value}`;
			}

			return `${key}: ${value}`;
		}).join(",");

		return `{${properties}}`;
	}
}
