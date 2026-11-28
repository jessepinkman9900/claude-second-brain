# csb exec

Run a command inside the default (or named) brain's directory.

## Usage

```bash
csb exec [--brain <name>] -- <cmd…>
```

Sets `INDEX_PATH` to the brain's qmd index and the working directory to the brain's root, then runs the command. Useful for vault-local scripts that assume you're in the brain root.

## Arguments

### cmd

`string[]` (required)

The command to run and its arguments, after `--`.

```bash
csb exec -- pnpm qmd:reindex
```

## Options

### --brain \<name>

`string`

Target a specific brain instead of the default.

```bash
csb exec --brain work -- git status
```

### --

Required separator before the command to run.

### -h, --help

Displays help message.

```bash
csb exec --help
```
