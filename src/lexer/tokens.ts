import { location } from "./location";
import { operators } from "./operators";

export interface base_token {
  kind: string;
  location: {
    start: location;
    end: location;
  };
}

export interface eof_token extends base_token {
  kind: "eof";
}

export interface whitespace_token extends base_token {
  kind: "whitespace";
  value: string;
}

export interface identifier_token extends base_token {
  kind: "identifier";
  value: string;
}

export interface type_identifier_token extends base_token {
  kind: "type_identifier";
  value: string;
}

export interface macro_identifier_token extends base_token {
  kind: "macro_identifier";
  value: string;
}

export interface keyword_token extends base_token {
  kind: "keyword";
}

export interface operator_token extends base_token {
  kind: "operator";
  value: (typeof operators)[number];
}

export interface boolean_token extends base_token {
  kind: "boolean";
  value: boolean;
}

export interface string_token extends base_token {
  kind: "string";
  value: (raw_string_token | interpolated_string_token)[];
}

export interface raw_string_token extends base_token {
  kind: "raw_string";
  value: string;
}

export interface interpolated_string_token extends base_token {
  kind: "interpolated_string";
  value: token[];
}

export interface number_token extends base_token {
  kind: "number";
  value: number;
  variant: "integer" | "float" | "hex" | "octal" | "binary";
  raw: string;
}

export interface comment_token extends base_token {
  kind: "comment";
  value: string;
}

export interface open_curly_token extends base_token {
  kind: "open_curly";
}

export interface close_curly_token extends base_token {
  kind: "close_curly";
}

export interface open_paren_token extends base_token {
  kind: "open_paren";
}

export interface close_paren_token extends base_token {
  kind: "close_paren";
}

export interface open_bracket_token extends base_token {
  kind: "open_bracket";
}

export interface close_bracket_token extends base_token {
  kind: "close_bracket";
}

export type token =
  | eof_token
  | whitespace_token
  | identifier_token
  | type_identifier_token
  | macro_identifier_token
  | keyword_token
  | operator_token
  | boolean_token
  | string_token
  | number_token
  | comment_token
  | open_curly_token
  | close_curly_token
  | open_paren_token
  | close_paren_token
  | open_bracket_token
  | close_bracket_token;
