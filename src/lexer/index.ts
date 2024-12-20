import { keywords } from "./keywords";
import { location } from "./location";
import { OPERATOR_REGEX, is_operator } from "./operators";
import * as tokens from "./tokens";

export default class lexer {
	cursor = 0;
	line = 1;
	column = 1;
	code = "";
	ts: tokens.token[] = [];

	location(): location {
		return {
			line: this.line,
			column: this.column,
		};
	}

	eat() {
		let c = this.code[this.cursor];

		this.cursor++;

		if (c === "\n") {
			this.line++;
			this.column = 1;
		} else {
			this.column++;
		}

		return c;
	}

	peek(offset = 0) {
		let c = this.code[this.cursor + offset];

		return c;
	}

	prev_non_whitespace_token() {
		for (let i = this.ts.length - 1; i > -1; i--) {
			const t = this.ts[i];

			if (t.kind === "whitespace") {
				continue;
			}

			return t;
		}

		return null;
	}

	whitespace() {
		let ws = "";

		while (
			this.peek() === " " ||
			this.peek() === "\t" ||
			this.peek() === "\n"
		) {
			ws += this.eat();
		}

		return ws;
	}

	lex(
		code: string,
		{
			cursor = 0,
			line = 1,
			column = 1,
		}: {
			cursor?: number;
			line?: number;
			column?: number;
		} = {},
	): tokens.token[] {
		this.cursor = cursor;
		this.line = line;
		this.column = column;
		this.code = code;

		this.ts = [];

		while (
			this.cursor < this.code.length - 1 &&
			this.code[this.cursor] === "#" &&
			this.code[this.cursor + 1] === "!"
		) {
			// consume the whole line
			while (this.peek() && this.peek() !== "\n") {
				this.eat();
			}

			this.eat();
		}

		while (this.cursor < this.code.length) {
			let t = this.lex_token();

			this.ts.push(t);

			if (t.kind === "eof") {
				break;
			}
		}

		let last_token = this.ts[this.ts.length - 1];

		if (!last_token || last_token.kind !== "eof") {
			this.ts.push({
				kind: "eof",
				location: { start: this.location(), end: this.location() },
			});
		}

		return this.ts;
	}

	lex_token(): tokens.token {
		const prev = this.prev_non_whitespace_token();

		let c = this.peek();
		let next = this.peek(1);

		if (c === "{") {
			if (
				prev !== null &&
				((prev && prev.kind === "macro_args") ||
					prev.kind === "macro_identifier")
			) {
				return this.lex_macro_body();
			}

			return this.lex_open_curly();
		} else if (c === "}") {
			return this.lex_close_curly();
		} else if (c === "(") {
			if (prev && prev.kind === "macro_identifier") {
				return this.lex_macro_args();
			}

			return this.lex_open_paren();
		} else if (c === ")") {
			return this.lex_close_paren();
		} else if (c === "[") {
			return this.lex_open_bracket();
		} else if (c === "]") {
			return this.lex_close_bracket();
		} else if (c === "/" && next && next === "/") {
			return this.lex_comment();
		} else if (OPERATOR_REGEX.test(c)) {
			return this.lex_operator();
		} else if (c.match(/\s/)) {
			return this.lex_whitespace();
		} else if (c === "$" && next === "{") {
			return this.lex_interpolation();
		} else if (c === "$" || (prev && prev.kind === "keyword" && prev.value === "type")) {
			return this.lex_type_identifier();
		} else if (c.match(/[a-zA-Z_]/)) {
			return this.lex_identifier();
		} else if (c.match(/[0-9]/)) {
			return this.lex_number();
		} else if (c === '"') {
			return this.lex_string();
		} else {
			this.eat();

			throw new Error(`no token found for "${c}"`);
		}
	}

	lex_whitespace(): tokens.whitespace_token {
		let start = this.location();

		let value = this.whitespace();

		let end = this.location();

		return {
			kind: "whitespace",
			location: { start, end },
			value,
		};
	}

	lex_open_curly(): tokens.open_curly_token {
		let start = this.location();
		let end = this.location();

		this.eat();

		return {
			kind: "open_curly",
			location: { start, end },
		};
	}

	lex_close_curly(): tokens.close_curly_token {
		let start = this.location();
		let end = this.location();

		this.eat();

		return {
			kind: "close_curly",
			location: { start, end },
		};
	}

	lex_open_paren(): tokens.open_paren_token {
		let start = this.location();
		let end = this.location();

		this.eat();

		return {
			kind: "open_paren",
			location: { start, end },
		};
	}

	lex_close_paren(): tokens.close_paren_token {
		let start = this.location();
		let end = this.location();

		this.eat();

		return {
			kind: "close_paren",
			location: { start, end },
		};
	}

	lex_open_bracket(): tokens.open_bracket_token {
		let start = this.location();
		let end = this.location();

		this.eat();

		return {
			kind: "open_bracket",
			location: { start, end },
		};
	}

	lex_close_bracket(): tokens.close_bracket_token {
		let start = this.location();
		let end = this.location();

		this.eat();

		return {
			kind: "close_bracket",
			location: { start, end },
		};
	}

	lex_comment(): tokens.comment_token {
		let start = this.location();

		this.eat();
		this.eat();

		let value = "";

		while (this.peek() && this.peek() !== "\n") {
			value += this.eat();
		}

		let end = this.location();

		return {
			kind: "comment",
			location: { start, end },
			value,
		};
	}

	lex_identifier():
		| tokens.identifier_token
		| tokens.macro_identifier_token
		| tokens.keyword_token
		| tokens.boolean_token {
		let start = this.location();
		let value = this.eat();
		let kind:
			| tokens.identifier_token["kind"]
			| tokens.macro_identifier_token["kind"]
			| tokens.keyword_token["kind"] = "identifier";

		while (this.peek() && this.peek().match(/[a-zA-Z0-9_]/)) {
			value += this.eat();
		}

		let next = this.peek();

		if (next === "!") {
			kind = "macro_identifier";
			value += this.eat();
		} else if (next === "'") {
			value += this.eat();
		} else if (keywords.includes(value)) {
			kind = "keyword";
		}

		let end = this.location();

		if (value === "true" || value === "false") {
			return {
				kind: "boolean",
				location: { start, end },
				value: value === "true",
			};
		}

		return {
			kind,
			location: { start, end },
			value,
		};
	}

	lex_type_identifier(): tokens.type_identifier_token {
		let start = this.location();
		let value = this.eat();

		while (this.peek() && this.peek().match(/[a-zA-Z0-9_]/)) {
			value += this.eat();
		}

		let end = this.location();

		return {
			kind: "type_identifier",
			location: { start, end },
			value,
		};
	}

	lex_operator(): tokens.operator_token {
		let start = this.location();
		let value = this.eat();

		while (this.peek() && OPERATOR_REGEX.test(this.peek())) {
			value += this.eat();
		}

		let end = this.location();

		if (!is_operator(value)) {
			throw new Error(`invalid operator "${value}"`);
		}

		return {
			kind: "operator",
			location: { start, end },
			value,
		};
	}

	lex_number(): tokens.number_token {
		let start = this.location();

		let raw = "";
		let value = "";
		let variant: tokens.number_token["variant"] = "integer";

		let number_regex = /[0-9\._]/;

		let c = this.peek();
		if (c === "0") {
			let next = this.peek(1);

			if (next === "x") {
				number_regex = /[0-9a-fA-F_]/;
				variant = "hex";
				raw += this.eat();
				raw += this.eat();
			} else if (next === "o") {
				number_regex = /[0-7_]/;
				variant = "octal";
				raw += this.eat();
				raw += this.eat();
			} else if (next === "b") {
				number_regex = /[0-1_]/;
				variant = "binary";
				raw += this.eat();
				raw += this.eat();
			}
		}

		while (this.peek() && this.peek().match(number_regex)) {
			let c = this.peek();

			let next = this.peek(1);

			if (
				c === "_" &&
				value[value.length - 1] !== "_" &&
				next &&
				next.match(number_regex) &&
				next !== "_"
			) {
				raw += this.eat();
				continue;
			}

			// If we aren't parsing a float or we are parsing something like a hex, octal, or
			// binary number, then this is a property accessor.
			if (c === "." && (variant === "float" || variant !== "integer")) {
				break;
			}

			if (c === "." && next && !next.match(number_regex)) {
				break;
			}

			if (c === "." && next && next === ".") {
				break;
			}

			if (c === ".") {
				variant = "float";
			}

			raw += c;
			value += this.eat();
		}

		let end = this.location();

		let number: number;

		switch (variant) {
			default:
			case "integer":
				number = parseInt(value, 10);
				break;
			case "float":
				number = parseFloat(value);
				break;
			case "hex":
				number = parseInt(value, 16);
				break;
			case "octal":
				number = parseInt(value, 8);
				break;
			case "binary":
				number = parseInt(value, 2);
				break;
		}

		return {
			kind: "number",
			location: { start, end },
			value: number,
			variant,
			raw,
		};
	}

	lex_interpolation(): tokens.interpolation_token {
		this.eat();
		this.eat();

		let interpolated_start = this.location();
		let interpolated_end: location | undefined;

		let ts: tokens.token[] = [];

		let depth = 1;

		while (depth > 0 && this.peek()) {
			let next = this.peek();

			if (next === "{") {
				depth++;
			} else if (next === "}") {
				depth--;
			}

			if (depth > 0) {
				ts.push(this.lex_token());
			} else {
				interpolated_end = this.location();
				this.eat();
			}
		}

		if (interpolated_end === undefined) {
			interpolated_end = this.location();
		}

		return {
			kind: "interpolation",
			location: { start: interpolated_start, end: interpolated_end },
			value: ts,
		};
	}

	lex_string(): tokens.string_token {
		let start = this.location();

		this.eat();

		let value: tokens.string_token["value"] = [];

		while (this.peek() && this.peek() !== '"') {
			let c = this.peek();

			if (c === "$" && this.peek(1) === "{") {
				value.push(this.lex_interpolation());

				value.push({
					kind: "raw_string",
					location: { start: this.location(), end: this.location() },
					value: "",
				});
			} else {
				let last_token = value[value.length - 1];

				let start = this.location();

				let c = this.eat();

				if (c === "\\") {
					let t = this.peek();

					switch (t) {
						default:
							c = this.eat();
							break;
						case "n":
							c = "\n";
							this.eat();
							break;
						case "r":
							c = "\r";
							this.eat();
							break;
						case "t":
							c = "\t";
							this.eat();
							break;
						case "x":
							this.eat();
							c = String.fromCharCode(parseInt(this.eat() + this.eat(), 16));
							break;
						case "u":
							this.eat();
							c = String.fromCharCode(
								parseInt(this.eat() + this.eat() + this.eat() + this.eat(), 16),
							);
							break;
					}
				}

				if (last_token && last_token.kind === "raw_string") {
					last_token.value += c;
					last_token.location.end = this.location();
				} else {
					value.push({
						kind: "raw_string",
						location: { start, end: this.location() },
						value: c,
					});
				}
			}
		}

		this.eat();

		let end = this.location();

		if (value.length > 0 && value[0].kind === "raw_string" && value[0].value.startsWith("\n")) {
			for (let i = 0; i < value.length; i++) {
				const part = value[i];

				if (part.kind === "raw_string") {
					let [first, ...lines] = part.value.split("\n");

					for (let j = 0; j < lines.length; j++) {
						lines[j] = lines[j].replace(/^\s+\| ?/, "");
					}

					if (i === value.length - 1) {
						lines = lines.slice(0, -1)
					}

					part.value = [first, ...lines].join("\n");
				}
			}

			const first = value[0];

			first.value = first.value.slice(1);
		}

		return {
			kind: "string",
			location: { start, end },
			value,
		};
	}

	lex_macro_body(): tokens.macro_body_token {
		const start = this.location();

		this.eat();

		let depth = 1;

		let value = "";

		while (depth > 0 && this.peek()) {
			let next = this.peek();

			if (next === "{") {
				depth++;
			} else if (next === "}") {
				depth--;
			}

			if (depth > 0) {
				value += this.eat();

				if (next === "\\" && this.peek()) {
					value += this.eat();
				}
			}
		}

		this.eat();

		const end = this.location();

		return {
			kind: "macro_body",
			location: { start, end },
			value,
		};
	}

	lex_macro_args(): tokens.macro_args_token {
		const start = this.location();

		this.eat();

		const value: tokens.token[] = [];

		while (this.cursor < this.code.length) {
			const c = this.peek();

			if (c === ")") {
				break;
			}

			value.push(this.lex_token());
		}

		this.eat();

		const end = this.location();

		return { kind: "macro_args", location: { start, end }, value };
	}
}
