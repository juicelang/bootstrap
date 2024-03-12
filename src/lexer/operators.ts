export const OPERATOR_REGEX = /[:=,\.@#!?&|+\-*/%<>\^]/;

export type symbols = (typeof operators)[number];

export const operators = [
  ":=",
  "=",
  ":",
  ",",
  ".",
  "@",
  "#",
  "!",
  "?",
  "&",
  "|",
  "&&",
  "||",
  "->",
  "+",
  "-",
  "*",
  "/",
  "%",
  "**",
  "++",
  "--",
  ">=",
  "<=",
  "==",
  "!=",
  ">",
  "<",
  "^",
  "..",
] as const;

export const precedence: Record<symbols, number> = {
  ":=": 1,
  "=": 1,
  "..": 1,
  "->": 1,
  ":": 1,
  ",": 1,
  ".": 1,
  "@": 1,
  "#": 1,
  "!": 1,
  "?": 1,
  ">=": 1,
  "<=": 1,
  "==": 1,
  "!=": 1,
  ">": 1,
  "<": 1,
  "&": 2,
  "+": 2,
  "-": 2,
  "*": 3,
  "/": 3,
  "%": 3,
  "^": 3,
  "|": 3,
  "**": 3,
  "&&": 4,
  "||": 4,
  "++": 5,
  "--": 5,
};

export function is_operator(text: string): text is (typeof operators)[number] {
  return operators.includes(text as any);
}

export function is_unary_prefix_operator(operator: symbols): boolean {
  return ["!"].includes(operator);
}
