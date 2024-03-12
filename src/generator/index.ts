import * as nodes from "@/parser/ast";

export default class generator {
  generate(ast: nodes.root_node): string {
    console.log(ast);
    return "";
  }
}
