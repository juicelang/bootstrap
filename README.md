# Juice Bootstrapping Compiler

> [!WARNING]
> The code in this repository is extremely bad. The goal was not to
> have a long-lived implementation, but rather to build something
> capable of compiling an initial version of the Juice language. All
> future development is intended to happen in Juice itself rather than
> JavaScript or TypeScript.

## Dependencies

- [Bun](https://bun.sh)

## Installation

To get started, clone this repository:

```shell
git clone git@github.com:juicelang/bootstrap.git

cd bootstrap
```

Install dependencies:

```shell
bun install
```

## Usage

> [!NOTE]
> Only internal imports are supported in this compiler. This means
> that imports must begin with a `.`, no external packages may be
> used.

To run the program, execute `src/index.ts` and provide a path to the file you would like to compile.

```shell
bun src/index.ts ./my.juice
```

The compiled output will be located in `./dist`.
