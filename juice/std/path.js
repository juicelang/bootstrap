import node_path from "node:path";
import node_process from "node:process";

export const resolve_relative = (path) => {
  if (node_path.isAbsolute(path)) {
    return path;
  }

  return node_path.resolve(node_process.cwd(), path);
};

export const resolve = (parts) => {
  return node_path.resolve(...parts);
};
