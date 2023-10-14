import { describe, test, expect, beforeEach } from "bun:test";
import parser from "./index";

const trim = (s: string) => s.trim();

describe("Parser", () => {
  let p: parser;

  beforeEach(() => {
    p = new parser();
  });

  describe("Strings", () => {
    test.only("parses a string", () => {
      let code = trim(`"hello world"`);
      let ast = p.parse(code);
    });
  });
});
