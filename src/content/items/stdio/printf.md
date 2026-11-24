---
name: printf
kind: fn
header: stdio
summary: Prints formatted output to the standard output stream.
signature: "int printf(const char *template, ...);"
source: https://sourceware.org/glibc/manual/latest/html_node/Formatted-Output-Functions.html
---

Prints the optional arguments under the control of the template string `template` to the stream `stdout`.

## Format specifications

Each conversion specification begins with `%` and ends with a conversion character. In between there may be, in order:

1. **Flags**: `-` left-justify; `+` always print a sign; space: prefix a space if no sign; `0` pad with leading zeros; `#` alternate form (`0` prefix for `%o`, `0x` for `%x`, always a decimal point for `%f`/`%e`/`%g`).
2. **Minimum field width**: the value is padded to at least this many characters. `*` takes the width from the next `int` argument.
3. **Precision**, after a `.`: the maximum characters of a string, the digits after the decimal point for `%f`/`%e`, significant digits for `%g`, or minimum digits for an integer. `.*` takes it from an argument.
4. **Length modifier**: `hh`, `h`, `l`, `ll`, `z`, `t`, `j` for integer arguments; `L` for `long double`.

| Conversion | Argument | Printed as |
|---|---|---|
| `d`, `i` | `int` | signed decimal |
| `u` | `unsigned int` | unsigned decimal |
| `o` | `unsigned int` | unsigned octal, no leading `0` |
| `x`, `X` | `unsigned int` | unsigned hex, `abcdef` or `ABCDEF` |
| `c` | `int` | a single character, after conversion to `unsigned char` |
| `s` | `char *` | characters until `'\0'` or the precision is reached |
| `f` | `double` | `[-]m.dddddd`, 6 digits by default |
| `e`, `E` | `double` | `[-]m.dddddde±xx` |
| `g`, `G` | `double` | `%e` if the exponent is < -4 or ≥ precision, else `%f`; trailing zeros dropped |
| `a`, `A` | `double` | hexadecimal floating point (C99) |
| `p` | `void *` | pointer, in an implementation-defined form |
| `n` | `int *` | stores the number of characters written so far; prints nothing |
| `%` | — | a literal `%` |

`float` arguments are promoted to `double`, so `%f` serves both. Use `%ld` for `long`, `%lld` for `long long`, `%zu` for `size_t`.

How width and precision affect a string, shown between colons for `"hello, world"` (12 characters):

| Format | Output |
|---|---|
| `:%s:` | `:hello, world:` |
| `:%10s:` | `:hello, world:` |
| `:%.10s:` | `:hello, wor:` |
| `:%-15s:` | `:hello, world   :` |
| `:%15s:` | `:   hello, world:` |
| `:%15.10s:` | `:     hello, wor:` |
| `:%-15.10s:` | `:hello, wor     :` |

<div class="warning">

Never pass untrusted text as the format: `printf(s)` will interpret any `%` in `s`. Write `printf("%s", s)` (or `fputs`).

</div>

## Return value

The number of characters printed, or a negative value if there was an output error.

## Errors

| `errno` | Meaning |
|---|---|
| `EOVERFLOW` | The number of written bytes would exceed `INT_MAX`. |
| `ENOMEM` | Memory allocation failed during processing. |
| `EILSEQ` | An input character sequence could not be converted. |

## Examples

A template string mixes ordinary text with conversion specifications: `%s` for a string, `%d` for an integer, and `%%` for a literal percent sign.

```c
int pct = 37;
char filename[] = "foo.txt";
printf("Processing of `%s' is %d%% finished.\nPlease be patient.\n",
       filename, pct);
```

Output:

```text
Processing of `foo.txt' is 37% finished.
Please be patient.
```
