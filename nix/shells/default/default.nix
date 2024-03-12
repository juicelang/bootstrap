{
  lib,
  mkShell,
  bun,
  runCommand,
  writeShellScriptBin,
}: let
  bun-exe = lib.getExe bun;
  juice-selfhosted = writeShellScriptBin "juice-selfhosted" ''
    ${bun-exe} ./src/index.ts ./juice/main.juice
    ${bun-exe} ./dist/dev.juice.main.js
  '';
in
  mkShell {
    packages = [bun juice-selfhosted];
  }
