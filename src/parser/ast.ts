import { location } from "@/lexer/location";
import {
  identifier_token,
  macro_identifier_token,
  type_identifier_token,
} from "@/lexer/tokens";

export interface root_node {
  kind: "program";
  body: node[];
}

export interface eof_node extends base_node {
  kind: "eof";
}

export interface base_node {
  kind: string;
  location: {
    start: location;
    end: location;
  };
}

export interface comment_node extends base_node {
  kind: "comment";
  value: string;
  multiline: boolean;
}

export interface identifier_node extends base_node {
  kind: "identifier";
  value: (identifier_name_node | string_node | interpolation_node)[];
}

export interface identifier_name_node extends base_node {
  kind: "identifier_name";
  value: string;
}

export interface macro_identifier_node extends base_node {
  kind: "macro_identifier";
  value: (identifier_name_node | string_node | interpolation_node)[];
}

export interface type_identifier_node extends base_node {
  kind: "type_identifier";
  value: (identifier_name_node | string_node | interpolation_node)[];
}

export interface string_node extends base_node {
  kind: "string";
  value: (raw_string_node | expression_node)[];
}

export interface raw_string_node extends base_node {
  kind: "raw_string";
  value: string;
}

export interface interpolation_node extends base_node {
  kind: "interpolation";
  value: expression_node;
}

export interface number_node extends base_node {
  kind: "number";
  value: number;
  variant: "integer" | "float" | "hex" | "octal" | "binary";
  raw: string;
}

export interface boolean_node extends base_node {
  kind: "boolean";
  value: boolean;
}

export interface member_expression_node extends base_node {
  kind: "member_expression";
  value: [expression_node, expression_node];
}

export interface value_expression_node extends base_node {
  kind: "value_expression";
  value:
    | primitive_node
    | identifier_node
    | macro_identifier_node
    | member_expression_node
    | unary_expression_node
    | expression_node
    | function_node
    | block_node
    | type_identifier_node
    | function_call_node
    | if_node
    | list_node;
}

export interface type_value_expression_node extends base_node {
  kind: "type_value_expression";
  value:
    | primitive_node
    | identifier_node
    | member_expression_node
    | type_unary_expression_node
    | expression_node
    | type_identifier_node;
}

export interface unary_expression_node extends base_node {
  kind: "unary_expression";
  operator: string;
  value: expression_node;
}

export interface binary_expression_node extends base_node {
  kind: "binary_expression";
  operator: string;
  value: [sub_expression_node, sub_expression_node];
}

export interface type_unary_expression_node extends base_node {
  kind: "type_unary_expression";
  operator: string;
  value: expression_node;
}

export interface type_binary_expression_node extends base_node {
  kind: "type_binary_expression";
  operator: string;
  value: [sub_expression_node, sub_expression_node];
}

export type sub_expression_node =
  | binary_expression_node
  | unary_expression_node
  | value_expression_node;

export type type_sub_expression_node =
  | type_binary_expression_node
  | type_unary_expression_node
  | type_value_expression_node;

export interface expression_node extends base_node {
  kind: "expression";
  value: sub_expression_node;
}

export interface type_expression_node extends base_node {
  kind: "type_expression";
  value: type_sub_expression_node;
}

export interface statement_node extends base_node {
  kind: "statement";
  value:
    | expression_node
    | import_node
    | export_node
    | assignment_node
    | type_assignment_node
    | function_node
    | if_node
    | eof_node
    | function_call_node
    | for_node
    | impl_node;
}

export type primitive_node = string_node | number_node | boolean_node;

export interface impl_node extends base_node {
  kind: "impl";
  type: expression_node | null;
  target: expression_node;
  methods: function_node[];
}

export interface import_node extends base_node {
  kind: "import";
  identifier: identifier_node[];
  as: identifier_node | null;
  expose: (identifier_node | macro_identifier_node | type_identifier_node)[];
  foreign: boolean;
  internal: boolean;
}

export interface export_node extends base_node {
  kind: "export";
  value: statement_node;
}

export interface tuple_node extends base_node {
  kind: "tuple";
  value: expression_node[];
}

export interface assignment_node extends base_node {
  kind: "assignment";
  type: expression_node | null;
  left: expression_node;
  right: expression_node;
}

export interface type_assignment_node extends base_node {
  kind: "type_assignment";
  left: type_expression_node | type_identifier_node;
  right: type_expression_node | type_constructor_node[];
}

export interface type_constructor_node extends base_node {
  kind: "type_constructor";
  name: identifier_node;
  args: type_constructor_argument_node[];
  is_shorthand: boolean;
}

export interface type_constructor_argument_node extends base_node {
  kind: "type_constructor_argument";
  name: identifier_node;
  value: type_expression_node | null;
}

export interface function_node extends base_node {
  kind: "function";
  name: identifier_node | null;
  args: function_argument_node[];
  body: block_node;
  return_type: expression_node | null;
  static: boolean;
}

export interface function_argument_node extends base_node {
  kind: "function_argument";
  name: identifier_node;
  type: expression_node | null;
  variant: "value" | "type";
  default: expression_node | null;
}

export interface function_call_node extends base_node {
  kind: "function_call";
  target: expression_node;
  args: function_call_argument_node[];
}

export interface function_call_argument_node extends base_node {
  kind: "function_call_argument";
  name: type_identifier_node | identifier_node | null;
  value: expression_node;
}

export interface if_node extends base_node {
  kind: "if";
  condition: expression_node;
  body: block_node;
  else: if_node | block_node | null;
}

export interface for_node extends base_node {
  kind: "for";
  identifier: expression_node | null;
  iterable: expression_node | range_node | null;
  body: block_node;
}

export interface break_node extends base_node {
  kind: "break";
}

export interface range_node extends base_node {
  kind: "range";
  from: expression_node;
  to: expression_node;
}

export interface block_node extends base_node {
  kind: "block";
  value: statement_node[];
}

export interface list_node extends base_node {
  kind: "list";
  value: expression_node[];
}

export type node =
  | string_node
  | number_node
  | boolean_node
  | statement_node
  | expression_node
  | value_expression_node
  | unary_expression_node
  | binary_expression_node
  | root_node
  | comment_node
  | import_node
  | identifier_node
  | identifier_name_node
  | macro_identifier_node
  | type_identifier_node
  | member_expression_node
  | primitive_node
  | sub_expression_node
  | interpolation_node
  | raw_string_node
  | tuple_node
  | assignment_node
  | function_node
  | function_argument_node
  | block_node
  | type_assignment_node
  | type_expression_node
  | type_value_expression_node
  | type_unary_expression_node
  | type_binary_expression_node
  | type_sub_expression_node
  | type_constructor_node
  | type_constructor_argument_node
  | if_node
  | eof_node
  | function_call_node
  | function_call_argument_node
  | export_node
  | for_node
  | range_node
  | break_node
  | list_node
  | impl_node;
