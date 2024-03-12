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

  // describe("Examples", () => {
  //   test("generates a basic example", () => {
  //     let code = trim(`
  // 'result(value) := {
  // ok(value: value)
  // error(message: string)
  // }
  // `);
  //     let ast = p.parse(code);
  //     console.log(ast);
  //     let result = g.generate(ast);
  //   });

  //   test.skip("generates a basic type example", () => {
  //     let code = trim(`
  // 'result(value) := {
  // ok(value: value)
  // error(message: string)
  // }
  // `);
  //     let ast = p.parse(code);
  //     let result = g.generate(ast);

  //     console.log(result);
  //   });
  // });
});
