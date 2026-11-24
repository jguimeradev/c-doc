---
title: wordstat — a text statistics tool
order: 1
summary: Build a richer wc that reports lines, words, characters, the longest line and letter frequencies.
level: beginner
chapters: [tutorial, types-operators-expressions, control-flow]
skills: [character I/O, state machines, arrays, command-line flags]
---

## Overview

You'll build `wordstat`, a command-line tool in the spirit of UNIX `wc` that reads text and reports statistics about it. It uses nothing beyond Chapters 1–3, but finishing every milestone will exercise all of them thoroughly.

```console
$ ./wordstat < moby-dick.txt
lines        21954
words       215830
chars      1257274
longest        113  (line 1209)
avg word      4.48
top letters  e 117k, t 88k, a 77k, o 69k, n 66k
```

## What you'll practice

- reading input one character at a time with [`getchar`](/stdio/fn.getchar/);
- tracking state across characters (inside a word or not, current line length);
- arrays as counters, indexed by character;
- formatted output with [`printf`](/stdio/fn.printf/) widths;
- simple flag parsing with `argc`/`argv`.

## Specification

`wordstat [-l] [-w] [-c] [-t N]`

- With no flags, print every statistic shown above.
- `-l`, `-w`, `-c` print only lines, words or characters (any combination), one number per line, like `wc`.
- `-t N` shows the top `N` letters (default 5).
- A **word** is a maximal run of characters that aren't white space ([`isspace`](/ctype/fn.isspace/)).
- A **line** ends with `'\n'`. A final line without a newline still counts.
- **Letters** are counted case-insensitively; only `a`–`z`.
- Exit status 0 on success, 2 on a bad flag.

## Milestones

### 1. Count lines, words, characters

Start from the word counter in [section 1.5.4](/book/tutorial/#154-counting-words). Get the three basic counts right, including for a file that doesn't end in a newline. Compare against `wc` on several files.

### 2. Longest line

Track the current line's length and the longest seen so far, plus the line number where it occurred. Be careful with the last line when the input doesn't end in `'\n'`.

### 3. Average word length

Count total characters inside words. Print `letters_in_words / words` as a `double` with two decimals, and handle zero words without dividing by zero.

### 4. Letter frequencies

Keep `long letters[26]`. At the end, find the top `N` without sorting: repeat `N` times "find the largest count not yet printed". Print counts above 1000 in thousands (`117k`).

### 5. Flags

Parse `-l`, `-w`, `-c` and `-t N`. If any of `-l -w -c` is given, print only those counts.

## Starter code

```c
#include <ctype.h>
#include <stdbool.h>
#include <stdio.h>

struct counts {
    long lines, words, chars;
    long longest, longest_line;
    long word_chars;
    long letters[26];
};

static void scan(struct counts *k)
{
    int c;
    bool in_word = false;
    long line_len = 0;

    while ((c = getchar()) != EOF) {
        k->chars++;
        /* TODO: milestones 1-4 */
        (void)in_word;
        (void)line_len;
    }
}

static void report(const struct counts *k)
{
    printf("lines   %10ld\n", k->lines);
    printf("words   %10ld\n", k->words);
    printf("chars   %10ld\n", k->chars);
    /* TODO: longest line, average word, top letters */
}

int main(int argc, char *argv[])
{
    struct counts k = {0};
    (void)argc;
    (void)argv;     /* TODO: milestone 5 */
    scan(&k);
    report(&k);
    return 0;
}
```

## Testing

Write tiny inputs whose answers you know, and compare with `wc`:

```sh
printf ''                 | ./wordstat -l -w -c    # 0 0 0
printf 'one'              | ./wordstat -l -w -c    # 1 1 3 (last line without \n)
printf 'a  b\n\n c\n'     | ./wordstat -w          # 3
for f in *.txt; do
    diff <(./wordstat -l -w -c < "$f" | tr '\n' ' ') \
         <(wc -l -w -c < "$f" | awk '{print $1, $2, $3, ""}') || echo "MISMATCH: $f"
done
```

(Note that `wc -l` counts newline characters, so it reports 0 for `printf 'one'`; decide whether to match it and document your choice.)

## Stretch goals

- Accept file names as arguments, printing per-file results and a total, like `wc`.
- Add `-u` to report the number of distinct words (you'll need the techniques of [Chapter 6](/book/structures/)).
- Count UTF-8 characters instead of bytes: a byte starts a new character unless `(c & 0xC0) == 0x80`.
- Print a sentence count and a Flesch reading-ease score.

<details class="hint"><summary>Hint: the final line</summary>

After the loop, if the last character read was not `'\n'` (and at least one character was read), the input ended mid-line: count one more line and check it against the longest. Keep `prev` the way Exercise 1-4 does.

</details>
