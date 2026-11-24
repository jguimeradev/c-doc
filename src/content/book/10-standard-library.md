---
title: Standard Library
number: "B"
order: 10
summary: A map of the standard headers, linking into the full API reference.
---

The standard library is defined by the C standard alongside the language. It's declared in a set of **headers**; including a header makes its functions, types and macros available. Headers may be included in any order, any number of times.

Every function and macro listed below has its own page in the API reference on this site, with its declaration, return value, edge cases and examples. Press <kbd>S</kbd> to search.

Identifiers beginning with an underscore followed by a capital letter or another underscore are reserved for the implementation, as are the names of all standard library functions. Don't define your own `printf`.

## B.1 Input and Output: `<stdio.h>`

Streams (`FILE *`), file operations, formatted I/O, character I/O, direct (binary) I/O, file positioning and error status. Covered in [Chapter 7](/book/input-output/).

| Group | Functions |
|---|---|
| File operations | [`fopen`](/stdio/fn.fopen/) [`freopen`](/stdio/fn.freopen/) [`fclose`](/stdio/fn.fclose/) [`fflush`](/stdio/fn.fflush/) [`remove`](/stdio/fn.remove/) [`rename`](/stdio/fn.rename/) [`tmpfile`](/stdio/fn.tmpfile/) [`tmpnam`](/stdio/fn.tmpnam/) [`setvbuf`](/stdio/fn.setvbuf/) [`setbuf`](/stdio/fn.setbuf/) |
| Formatted output | [`printf`](/stdio/fn.printf/) [`fprintf`](/stdio/fn.fprintf/) [`sprintf`](/stdio/fn.sprintf/) [`snprintf`](/stdio/fn.snprintf/) [`vprintf`](/stdio/fn.vprintf/) [`vfprintf`](/stdio/fn.vfprintf/) [`vsprintf`](/stdio/fn.vsprintf/) [`vsnprintf`](/stdio/fn.vsnprintf/) |
| Formatted input | [`scanf`](/stdio/fn.scanf/) [`fscanf`](/stdio/fn.fscanf/) [`sscanf`](/stdio/fn.sscanf/) |
| Character I/O | [`fgetc`](/stdio/fn.fgetc/) [`getc`](/stdio/fn.getc/) [`getchar`](/stdio/fn.getchar/) [`fgets`](/stdio/fn.fgets/) [`fputc`](/stdio/fn.fputc/) [`putc`](/stdio/fn.putc/) [`putchar`](/stdio/fn.putchar/) [`fputs`](/stdio/fn.fputs/) [`puts`](/stdio/fn.puts/) [`ungetc`](/stdio/fn.ungetc/) [`gets`](/stdio/fn.gets/) (removed) |
| Direct I/O | [`fread`](/stdio/fn.fread/) [`fwrite`](/stdio/fn.fwrite/) |
| Positioning | [`fseek`](/stdio/fn.fseek/) [`ftell`](/stdio/fn.ftell/) [`rewind`](/stdio/fn.rewind/) [`fgetpos`](/stdio/fn.fgetpos/) [`fsetpos`](/stdio/fn.fsetpos/) |
| Errors | [`clearerr`](/stdio/fn.clearerr/) [`feof`](/stdio/fn.feof/) [`ferror`](/stdio/fn.ferror/) [`perror`](/stdio/fn.perror/) |
| Types and macros | [`FILE`](/stdio/type.FILE/) [`fpos_t`](/stdio/type.fpos_t/) [`EOF`](/stdio/macro.EOF/) [`stdin`](/stdio/macro.stdin/) [`stdout`](/stdio/macro.stdout/) [`stderr`](/stdio/macro.stderr/) [`BUFSIZ`](/stdio/macro.BUFSIZ/) [`FOPEN_MAX`](/stdio/macro.FOPEN_MAX/) [`FILENAME_MAX`](/stdio/macro.FILENAME_MAX/) [`SEEK_SET`](/stdio/macro.SEEK_SET/) |

## B.2 Character Class Tests: `<ctype.h>`

[`isalnum`](/ctype/fn.isalnum/) [`isalpha`](/ctype/fn.isalpha/) [`iscntrl`](/ctype/fn.iscntrl/) [`isdigit`](/ctype/fn.isdigit/) [`isgraph`](/ctype/fn.isgraph/) [`islower`](/ctype/fn.islower/) [`isprint`](/ctype/fn.isprint/) [`ispunct`](/ctype/fn.ispunct/) [`isspace`](/ctype/fn.isspace/) [`isupper`](/ctype/fn.isupper/) [`isxdigit`](/ctype/fn.isxdigit/) [`tolower`](/ctype/fn.tolower/) [`toupper`](/ctype/fn.toupper/)

The argument must be `EOF` or representable as `unsigned char`.

## B.3 String Functions: `<string.h>`

| Group | Functions |
|---|---|
| Copying | [`strcpy`](/string/fn.strcpy/) [`strncpy`](/string/fn.strncpy/) [`memcpy`](/string/fn.memcpy/) [`memmove`](/string/fn.memmove/) |
| Concatenation | [`strcat`](/string/fn.strcat/) [`strncat`](/string/fn.strncat/) |
| Comparison | [`strcmp`](/string/fn.strcmp/) [`strncmp`](/string/fn.strncmp/) [`memcmp`](/string/fn.memcmp/) |
| Searching | [`strchr`](/string/fn.strchr/) [`strrchr`](/string/fn.strrchr/) [`strspn`](/string/fn.strspn/) [`strcspn`](/string/fn.strcspn/) [`strpbrk`](/string/fn.strpbrk/) [`strstr`](/string/fn.strstr/) [`strtok`](/string/fn.strtok/) [`memchr`](/string/fn.memchr/) |
| Other | [`strlen`](/string/fn.strlen/) [`strerror`](/string/fn.strerror/) [`memset`](/string/fn.memset/) |

## B.4 Mathematical Functions: `<math.h>`

| Group | Functions |
|---|---|
| Trigonometric | [`sin`](/math/fn.sin/) [`cos`](/math/fn.cos/) [`tan`](/math/fn.tan/) [`asin`](/math/fn.asin/) [`acos`](/math/fn.acos/) [`atan`](/math/fn.atan/) [`atan2`](/math/fn.atan2/) |
| Hyperbolic | [`sinh`](/math/fn.sinh/) [`cosh`](/math/fn.cosh/) [`tanh`](/math/fn.tanh/) |
| Exponential and logarithmic | [`exp`](/math/fn.exp/) [`log`](/math/fn.log/) [`log10`](/math/fn.log10/) [`pow`](/math/fn.pow/) [`sqrt`](/math/fn.sqrt/) [`ldexp`](/math/fn.ldexp/) [`frexp`](/math/fn.frexp/) |
| Rounding and remainder | [`ceil`](/math/fn.ceil/) [`floor`](/math/fn.floor/) [`fabs`](/math/fn.fabs/) [`modf`](/math/fn.modf/) [`fmod`](/math/fn.fmod/) |
| Macros | [`HUGE_VAL`](/math/macro.HUGE_VAL/) |

Errors are reported through [`errno`](/errno/macro.errno/): [`EDOM`](/errno/macro.EDOM/) for a domain error, [`ERANGE`](/errno/macro.ERANGE/) for a range error. C99 added `float` and `long double` versions (`sqrtf`, `sqrtl`), plus many new functions (`round`, `trunc`, `hypot`, `cbrt`, `fma`, `isnan`, …) and `<tgmath.h>` type-generic macros.

## B.5 Utility Functions: `<stdlib.h>`

| Group | Functions |
|---|---|
| Number conversion | [`atof`](/stdlib/fn.atof/) [`atoi`](/stdlib/fn.atoi/) [`atol`](/stdlib/fn.atol/) [`strtod`](/stdlib/fn.strtod/) [`strtol`](/stdlib/fn.strtol/) [`strtoul`](/stdlib/fn.strtoul/) |
| Random numbers | [`rand`](/stdlib/fn.rand/) [`srand`](/stdlib/fn.srand/) [`RAND_MAX`](/stdlib/macro.RAND_MAX/) |
| Memory | [`malloc`](/stdlib/fn.malloc/) [`calloc`](/stdlib/fn.calloc/) [`realloc`](/stdlib/fn.realloc/) [`free`](/stdlib/fn.free/) [`aligned_alloc`](/stdlib/fn.aligned_alloc/) |
| Environment | [`abort`](/stdlib/fn.abort/) [`exit`](/stdlib/fn.exit/) [`atexit`](/stdlib/fn.atexit/) [`system`](/stdlib/fn.system/) [`getenv`](/stdlib/fn.getenv/) [`EXIT_SUCCESS`](/stdlib/macro.EXIT_SUCCESS/) [`EXIT_FAILURE`](/stdlib/macro.EXIT_FAILURE/) |
| Searching and sorting | [`bsearch`](/stdlib/fn.bsearch/) [`qsort`](/stdlib/fn.qsort/) |
| Integer arithmetic | [`abs`](/stdlib/fn.abs/) [`labs`](/stdlib/fn.labs/) [`div`](/stdlib/fn.div/) [`ldiv`](/stdlib/fn.ldiv/) [`div_t`](/stdlib/type.div_t/) |

## B.6 Diagnostics: `<assert.h>`

[`assert`](/assert/macro.assert/), disabled by defining [`NDEBUG`](/assert/macro.NDEBUG/). C11 adds `static_assert` for compile-time checks.

## B.7 Variable Argument Lists: `<stdarg.h>`

[`va_list`](/stdarg/type.va_list/) [`va_start`](/stdarg/macro.va_start/) [`va_arg`](/stdarg/macro.va_arg/) [`va_end`](/stdarg/macro.va_end/) [`va_copy`](/stdarg/macro.va_copy/)

## B.8 Non-local Jumps: `<setjmp.h>`

[`jmp_buf`](/setjmp/type.jmp_buf/) [`setjmp`](/setjmp/macro.setjmp/) [`longjmp`](/setjmp/fn.longjmp/)

## B.9 Signals: `<signal.h>`

[`signal`](/signal/fn.signal/) [`raise`](/signal/fn.raise/) [`sig_atomic_t`](/signal/type.sig_atomic_t/) [`SIG_DFL`](/signal/macro.SIG_DFL/), and the signals [`SIGABRT`](/signal/macro.SIGABRT/) [`SIGFPE`](/signal/macro.SIGFPE/) [`SIGILL`](/signal/macro.SIGILL/) [`SIGINT`](/signal/macro.SIGINT/) [`SIGSEGV`](/signal/macro.SIGSEGV/) [`SIGTERM`](/signal/macro.SIGTERM/).

## B.10 Date and Time Functions: `<time.h>`

| Group | Items |
|---|---|
| Types | [`time_t`](/time/type.time_t/) [`clock_t`](/time/type.clock_t/) [`struct tm`](/time/type.tm/) [`CLOCKS_PER_SEC`](/time/macro.CLOCKS_PER_SEC/) |
| Getting time | [`time`](/time/fn.time/) [`clock`](/time/fn.clock/) [`difftime`](/time/fn.difftime/) [`mktime`](/time/fn.mktime/) |
| Conversion | [`gmtime`](/time/fn.gmtime/) [`localtime`](/time/fn.localtime/) [`asctime`](/time/fn.asctime/) [`ctime`](/time/fn.ctime/) [`strftime`](/time/fn.strftime/) |

## B.11 Implementation-defined Limits: `<limits.h>` and `<float.h>`

[`<limits.h>`](/limits/) gives the ranges of the integer types: [`CHAR_BIT`](/limits/macro.CHAR_BIT/), [`INT_MAX`](/limits/macro.INT_MAX/), [`INT_MIN`](/limits/macro.INT_MIN/), [`LONG_MAX`](/limits/macro.LONG_MAX/), [`UINT_MAX`](/limits/macro.UINT_MAX/) and the rest.

[`<float.h>`](/float/) describes floating-point types: [`FLT_DIG`](/float/macro.FLT_DIG/), [`DBL_DIG`](/float/macro.DBL_DIG/), [`DBL_EPSILON`](/float/macro.DBL_EPSILON/), [`DBL_MAX`](/float/macro.DBL_MAX/), [`DBL_MIN`](/float/macro.DBL_MIN/) and more.

## B.12 Common Definitions and Errors: `<stddef.h>`, `<errno.h>`

[`<stddef.h>`](/stddef/): [`size_t`](/stddef/type.size_t/) [`ptrdiff_t`](/stddef/type.ptrdiff_t/) [`offsetof`](/stddef/macro.offsetof/), and [`NULL`](/stdlib/macro.NULL/).

[`<errno.h>`](/errno/): [`errno`](/errno/macro.errno/) [`EDOM`](/errno/macro.EDOM/) [`ERANGE`](/errno/macro.ERANGE/) [`EILSEQ`](/errno/macro.EILSEQ/).

## B.13 Headers Added After C89

These aren't covered in detail here yet, but you'll meet them in modern code:

| Header | Since | Provides |
|---|---|---|
| `<stdint.h>` | C99 | exact-width integers `int32_t`, `uint64_t`, `intptr_t`, limits |
| `<inttypes.h>` | C99 | `printf` macros like `PRId64`, `strtoimax` |
| `<stdbool.h>` | C99 | `bool`, `true`, `false` (built in from C23) |
| `<complex.h>` | C99 | complex arithmetic |
| `<tgmath.h>` | C99 | type-generic math macros |
| `<fenv.h>` | C99 | floating-point environment and exceptions |
| `<wchar.h>`, `<wctype.h>` | C95 | wide characters and strings |
| `<iso646.h>` | C95 | `and`, `or`, `not` spellings of operators |
| `<locale.h>` | C89 | localization: `setlocale`, `localeconv` |
| `<stdalign.h>` | C11 | `alignas`, `alignof` |
| `<stdatomic.h>` | C11 | atomic types and operations |
| `<stdnoreturn.h>` | C11 | `noreturn` |
| `<threads.h>` | C11 | threads, mutexes, condition variables |
| `<uchar.h>` | C11 | UTF-16/32 characters |
| `<stdbit.h>` | C23 | bit utilities: `stdc_count_ones`, `stdc_leading_zeros` |
| `<stdckdint.h>` | C23 | checked integer arithmetic: `ckd_add`, `ckd_mul` |
