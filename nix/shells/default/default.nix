{
  lib,
  mkShell,
  writeShellScriptBin,
  bun,
  nodePackages,
}: let
  bun-exe = lib.getExe bun;
  prettier-exe = lib.getExe nodePackages.prettier;
  juice = writeShellScriptBin "juice" ''
    rm -rf ./dist
    ${bun-exe} ./src/index.ts ./juice/main.juice
    success=$?

    if [ $success -eq 0 ]; then
      ${prettier-exe} --write ./dist/**/*.js --ignore-path /dev/null &> /dev/null
      ${bun-exe} ./dist/dev.juice.main.js $@
    else
      echo "Build failed..."
    fi
  '';
in
  mkShell {
    packages = [bun juice];
  }
