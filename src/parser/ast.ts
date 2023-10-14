import { location } from "@/lexer/location";
import { identifier_token } from "@/lexer/tokens";

export interface root_node {
  kind: "program";
  body: node[];
}

export interface base_node {
  kind: string;
  location: {
    start: location;
    end: location;
  };
}

export interface identifier_node extends base_node {
  kind: "identifier";
  value: (identifier_name_node | string_node | interpolation_node)[];
}

export interface identifier_name_node extends base_node {
  kind: "identifier_name";
  value: string;
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

export interface member_expression_node extends base_node {
  kind: "member_expression";
  value: [expression_node, expression_node];
}

export interface value_expression_node extends base_node {
  kind: "value_expression";
  value:
    | primitive_node
    | identifier_node
    | member_expression_node
    | expression_node;
}

export interface unary_expression_node extends base_node {
  kind: "unary_expression";
  operator: string;
  value: expression_node;
}

export interface binary_expression_node extends base_node {
  kind: "binary_expression";
  operator: string;
  value: [expression_node, expression_node];
}

export type sub_expression_node =
  | binary_expression_node
  | unary_expression_node
  | value_expression_node;

export interface expression_node extends base_node {
  kind: "expression";
  value: sub_expression_node;
}

export interface statement_node extends base_node {
  kind: "statement";
  value: expression_node;
}

export type primitive_node = string_node | number_node;

export type node =
  | string_node
  | number_node
  | identifier_token
  | statement_node
  | expression_node;
