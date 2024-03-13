{
  lib,
  mkShell,
  writeShellScriptBin,
  bun,
  nodePackages,
}: let
  bun-exe = lib.getExe bun;
  prettier-exe = lib.getExe nodePackages.prettier;
  juice-selfhosted = writeShellScriptBin "juice-selfhosted" ''
    rm -rf ./dist
    ${bun-exe} ./src/index.ts ./juice/main.juice
    ${prettier-exe} --write ./dist/**/*.js --ignore-path /dev/null &> /dev/null
    ${bun-exe} ./dist/dev.juice.main.js $@
  '';
in
  mkShell {
    packages = [bun juice-selfhosted];
  }
