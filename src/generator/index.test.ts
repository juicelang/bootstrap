import { describe, test, expect, beforeEach } from "bun:test";
import generator from "./index";
import parser from "@/parser";
import * as nodes from "@/parser/ast";
import { todo } from "@/util/todo";

const trim = (s: string) => s.trim();

describe("Generator", () => {
  let p: parser;
  let g: generator;

  beforeEach(() => {
    p = new parser();
    g = new generator();
  });

  describe("Impl", () => {
    test("generates a basic impl", () => {
      let code = trim(`
			'x := {
				a: string
			}

			impl x {
				fn get_a(self) {
					self.a
				}
			}
		`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });
  });

  describe("Examples", () => {
    test("generates a basic example", () => {
      let code = trim(`
				'x := {
					a: string
				}
			`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });

    test("generates a generic type example", () => {
      let code = trim(`
				'result(value) := {
					ok(value: value)
					error(message: string)
				}
			`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });

    test("generates a constant example", () => {
      let code = trim(`
				x := 1
				y := 1 + 1
				z := true

				name := "world"
				message := "
				| hello
				| there
				| \${name}
				"
			`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });

    test("generates a function example", () => {
      let code = trim(`
				fn main(args) {
					x := 1
					x + 1
				}
			`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });

    test("generates a common example", () => {
      let code = trim(`
				import dev.juice.io as io (stdout)

				'result(value) := {
					ok(value: value)
					error(message: string)
				}

				fn main(args) {
					res := result.ok(1)

					stdout.write_line("Hello, world!")
				}
			`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });

    test("generates a common example", () => {
      let code = trim(`
				import dev.juice.io as io (stdout)
				foreign import .http as http

				'result(value) := {
					ok(value: value)
					error(message: string)
				}

				export fn main(args) {
					request := http.get("https://example.com")

					request.on_success(fn (response) {
						stdout.write_line(response.body)
					})

					stdout.write_line("Hello, world!")
				}
			`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });

    test("generates a complex example", () => {
      let code = trim(`
				import dev.juice.io as io (stdout)

				'result(value) := {
					ok(value: value)
					error(message: string)
				}

				fn run_loop() {
					for x of [1, 2, 3] {
						io.stdout.write_line("Hello, world!")
					}
				}

				export fn main(args) {
					request := http.get("https://example.com")

					request.on_success(fn (response) {
						stdout.write_line(response.body)
						run_loop()
					})

					stdout.write_line("Hello, world!")
				}
			`);
      let ast = p.parse(code);
      let result = g.generate("example", "main", ast);
    });
  });
});
