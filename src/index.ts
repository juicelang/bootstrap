import fs from "fs/promises";
import path from "path";

import args from "@/args";
import log from "@/log";
import parser from "@/parser";

try {
  const p = new parser();

  const file = path.isAbsolute(args._[0])
    ? args._[0]
    : path.join(process.cwd(), args._[0]);

  const code = await fs.readFile(file, "utf-8");

  const ast = p.parse(code);

  console.log(JSON.stringify(ast, null, 2));
} catch (error) {
  if (error instanceof Error) {
    log.error("Failed to run main.");

    console.log(error);
  } else {
    log.error("Unknown error:");
    log.error({ error });
  }
}
