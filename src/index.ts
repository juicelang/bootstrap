import fs from "fs/promises";
import path from "path";

import args from "@/args";
import log from "@/log";
import parser from "@/parser";
import * as ast from "@/parser/ast";
import generator from "@/generator";

try {
  const p = new parser();
  const g = new generator();

  const namespace = "dev.juice";

  const entry_file = path.isAbsolute(args._[0])
    ? args._[0]
    : path.join(process.cwd(), args._[0]);

  const entry_dirname = path.dirname(entry_file);

  const output_dirname = path.resolve(process.cwd(), "dist");

  const known_files = new Set<string>();

  const source_files = [entry_file];

  // Create output directory if it doesn't exist
  if (
    await fs
      .access(output_dirname)
      .then(() => false)
      .catch(() => true)
  ) {
    await fs.mkdir(output_dirname);
  }

  while (source_files.length > 0) {
    const file = source_files.pop()!;

    const text = await fs.readFile(file, "utf-8");

    const module_name = path
      .relative(entry_dirname, file)
      .replace(/\.juice$/, "")
      .replace(/\//g, ".");

    const ast = p.parse(text);
    let code = g.generate(namespace, module_name, ast);

    const file_name = path.resolve(
      output_dirname,
      `${namespace}.${module_name}.js`,
    );

    if (module_name === "main") {
      code += "\n\nmain()";
    }

    await fs.writeFile(file_name, code);

    const imports = ast.body.filter(
      (node) => node.kind === "statement" && node.value.kind === "import",
    ) as ast.statement_node[];

    for (const statement of imports) {
      const import_node = statement.value as ast.import_node;
      if (!import_node.internal) {
        throw new Error("Only internal imports are supported.");
      }

      const parts = import_node.identifier.map(g.generate_identifier);
      const import_path = path.join(entry_dirname, ...parts);

      if (import_node.foreign) {
        const import_file = `${import_path}.js`;

        if (!known_files.has(import_file)) {
          known_files.add(import_file);
          const text = await fs.readFile(import_file, "utf-8");

          const output_file = `${namespace}.${parts.join(".")}__foreign.js`;

          await fs.writeFile(path.resolve(output_dirname, output_file), text);
        }
      } else {
        const import_file = `${import_path}.juice`;

        if (!known_files.has(import_file)) {
          known_files.add(import_file);
          source_files.push(import_file);
        }
      }
    }
  }
} catch (error) {
  if (error instanceof Error) {
    log.error("Failed to run main.");

    console.log(error);
  } else {
    log.error("Unknown error:");
    log.error({ error });
  }
}
