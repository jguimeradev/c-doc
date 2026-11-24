export interface HeaderInfo {
  slug: string;
  file: string;
  /** Matching section of K&R Appendix B, for orientation. */
  appendix?: string;
  summary: string;
  description: string;
}

export const headers: HeaderInfo[] = [
  {
    slug: 'assert',
    file: 'assert.h',
    appendix: 'B6',
    summary: 'Diagnostics: the assert macro.',
    description:
      'Defines the <code>assert</code> macro, which aborts the program with a diagnostic when a condition the programmer believes is always true turns out to be false. Defining <code>NDEBUG</code> before including the header turns every assertion into a no-op.',
  },
  {
    slug: 'ctype',
    file: 'ctype.h',
    appendix: 'B2',
    summary: 'Character classification and case conversion.',
    description:
      'Functions that test a character for membership in a class (digit, letter, white space, …) and convert between upper and lower case. Every function takes an <code>int</code> whose value must be representable as an <code>unsigned char</code> or equal <code>EOF</code>; passing a negative <code>char</code> is undefined behavior, so cast with <code>(unsigned char)</code> first.',
  },
  {
    slug: 'errno',
    file: 'errno.h',
    summary: 'The errno variable and error codes.',
    description:
      'Declares <code>errno</code>, the modifiable lvalue in which library functions record why they failed, and the error-code macros <code>EDOM</code>, <code>ERANGE</code> and <code>EILSEQ</code>. POSIX systems define many more <code>E…</code> codes here.',
  },
  {
    slug: 'float',
    file: 'float.h',
    appendix: 'B11',
    summary: 'Characteristics of floating-point types.',
    description:
      'Macros describing the range and precision of <code>float</code>, <code>double</code> and <code>long double</code> on the current implementation: the number of decimal digits preserved, the smallest representable increment above 1, and the largest and smallest finite values.',
  },
  {
    slug: 'limits',
    file: 'limits.h',
    appendix: 'B11',
    summary: 'Sizes and ranges of integer types.',
    description:
      'Macros giving the minimum and maximum values of each integer type on the current implementation. The standard only sets lower bounds on their magnitude: for example <code>INT_MAX</code> must be at least 32767, though on most current systems it is 2147483647.',
  },
  {
    slug: 'math',
    file: 'math.h',
    appendix: 'B4',
    summary: 'Mathematical functions on double.',
    description:
      'Trigonometric, hyperbolic, exponential, logarithmic, power and rounding functions. A <em>domain error</em> (an argument outside the function\'s domain, such as <code>sqrt(-1)</code>) and a <em>range error</em> (a result that can\'t be represented) may be reported through <code>errno</code>. On many systems you must link with <code>-lm</code>.',
  },
  {
    slug: 'setjmp',
    file: 'setjmp.h',
    appendix: 'B8',
    summary: 'Non-local jumps.',
    description:
      'Provides <code>setjmp</code> and <code>longjmp</code>, which let a program jump back to a point saved earlier, bypassing the normal call-and-return sequence. Mostly used to escape from deeply nested calls on an error.',
  },
  {
    slug: 'signal',
    file: 'signal.h',
    appendix: 'B9',
    summary: 'Handling exceptional conditions (signals).',
    description:
      'Facilities for handling signals: asynchronous events such as an interrupt from the keyboard, or synchronous ones such as an illegal arithmetic operation. <code>signal</code> installs a handler and <code>raise</code> sends a signal to the program itself.',
  },
  {
    slug: 'stdarg',
    file: 'stdarg.h',
    appendix: 'B7',
    summary: 'Variable-length argument lists.',
    description:
      'Macros for stepping through the unnamed arguments of a function declared with <code>...</code>, the way <code>printf</code> does. A variadic function needs at least one named parameter, and must work out from it how many arguments follow and of what types.',
  },
  {
    slug: 'stddef',
    file: 'stddef.h',
    summary: 'Common definitions: size_t, NULL, offsetof.',
    description:
      'Defines types and macros used throughout the library: <code>size_t</code>, <code>ptrdiff_t</code>, <code>NULL</code> and <code>offsetof</code>.',
  },
  {
    slug: 'stdio',
    file: 'stdio.h',
    appendix: 'B1',
    summary: 'Streams, file operations, formatted and character I/O.',
    description:
      'The standard I/O library: about a third of the whole C library. A <em>stream</em> (<code>FILE *</code>) is a source or destination of data associated with a file or device. Three streams are open when a program starts: <code>stdin</code>, <code>stdout</code> and <code>stderr</code>.',
  },
  {
    slug: 'stdlib',
    file: 'stdlib.h',
    appendix: 'B5',
    summary: 'Number conversion, memory allocation, process control, searching and sorting.',
    description:
      'General utilities: converting strings to numbers, the heap allocator (<code>malloc</code>, <code>calloc</code>, <code>realloc</code>, <code>free</code>), pseudo-random numbers, program termination, environment access, and the generic <code>qsort</code> and <code>bsearch</code>.',
  },
  {
    slug: 'string',
    file: 'string.h',
    appendix: 'B3',
    summary: 'Byte strings and raw memory manipulation.',
    description:
      'Two families of functions. Those whose names begin with <code>str</code> operate on null-terminated strings; those beginning with <code>mem</code> operate on blocks of memory of a given length and do not stop at a null byte.',
  },
  {
    slug: 'time',
    file: 'time.h',
    appendix: 'B10',
    summary: 'Date and time.',
    description:
      'Types and functions for manipulating dates and times. <em>Calendar time</em> (<code>time_t</code>) counts from an epoch; <em>broken-down time</em> (<code>struct tm</code>) splits it into year, month, day and so on; <code>clock_t</code> measures processor time used.',
  },
];

export const headerBySlug: Record<string, HeaderInfo> = Object.fromEntries(headers.map((h) => [h.slug, h]));
export const headerSlugs = headers.map((h) => h.slug) as [string, ...string[]];
