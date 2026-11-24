---
chapter: tutorial
summary: Tables, character I/O, counting and histograms.
---

Try each exercise before opening the hint, and open the hint before the solution. There is almost always more than one good answer; the solutions show one reasonable approach.

Compile everything with warnings on:

```sh
cc -std=c17 -Wall -Wextra -o ex ex.c
```

## Exercise 1-1 · A table in reverse <span class="diff easy">easy</span>

Modify the kilometers-to-miles program from [section 1.3](/book/tutorial/#13-the-for-statement) so it prints a heading line above the columns and lists distances from 100 **down** to 0.

<details class="hint"><summary>Hint</summary>

Start the loop variable at the upper limit, test with `>=`, and step with `-=`. Print the heading once, before the loop.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>

int main(void)
{
    printf("%5s %8s\n", "km", "miles");
    printf("%5s %8s\n", "-----", "--------");
    for (int km = 100; km >= 0; km -= 10)
        printf("%5d %8.2f\n", km, km * 0.621371);
    return 0;
}
```

Using the same width for the header (`%5s`) as for the values (`%5d`) keeps the columns lined up.

</details>

## Exercise 1-2 · A temperature function <span class="diff easy">easy</span>

Write a function `double c_to_f(double celsius)` and use it to print a Celsius-to-Fahrenheit table from −40 °C to 100 °C in steps of 20. (F = C × 9/5 + 32.)

<details class="hint"><summary>Hint</summary>

Be careful with `9 / 5`: both operands are integers, so it equals `1`. Write `9.0 / 5.0` or multiply first.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>

double c_to_f(double celsius)
{
    return celsius * 9.0 / 5.0 + 32.0;
}

int main(void)
{
    for (int c = -40; c <= 100; c += 20)
        printf("%4d C = %6.1f F\n", c, c_to_f(c));
    return 0;
}
```

The first line of output, `-40 C = -40.0 F`, is a handy sanity check: it's the one temperature where the two scales agree.

</details>

## Exercise 1-3 · Counting white space <span class="diff easy">easy</span>

Write a program that counts spaces, tabs and newlines in its input separately and prints the three totals.

<details class="hint"><summary>Hint</summary>

One `while ((c = getchar()) != EOF)` loop with three `if`s (or an `else if` chain) and three counters.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>

int main(void)
{
    int c;
    long spaces = 0, tabs = 0, newlines = 0;

    while ((c = getchar()) != EOF) {
        if (c == ' ')
            spaces++;
        else if (c == '\t')
            tabs++;
        else if (c == '\n')
            newlines++;
    }
    printf("spaces %ld, tabs %ld, newlines %ld\n", spaces, tabs, newlines);
    return 0;
}
```

</details>

## Exercise 1-4 · Squeeze blanks <span class="diff easy">easy</span>

Copy input to output, replacing every run of one or more spaces with a single space.

<details class="hint"><summary>Hint</summary>

Remember the previous character. Print the current one unless both it and the previous one are spaces.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>

int main(void)
{
    int c, prev = EOF;

    while ((c = getchar()) != EOF) {
        if (!(c == ' ' && prev == ' '))
            putchar(c);
        prev = c;
    }
    return 0;
}
```

Initializing `prev` to `EOF` (which can never equal `' '`) means the very first character is always printed.

</details>

## Exercise 1-5 · One word per line <span class="diff easy">easy</span>

Print each word of the input on a line of its own. A word is a maximal run of characters that aren't spaces, tabs or newlines. Don't print empty lines.

<details class="hint"><summary>Hint</summary>

Use the `inside`/`outside` state from [section 1.5.4](/book/tutorial/#154-counting-words). Print a newline when you *leave* a word.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdbool.h>
#include <stdio.h>

int main(void)
{
    int c;
    bool inside = false;

    while ((c = getchar()) != EOF) {
        if (c == ' ' || c == '\t' || c == '\n') {
            if (inside) {
                putchar('\n');
                inside = false;
            }
        } else {
            putchar(c);
            inside = true;
        }
    }
    if (inside)            /* input ended in the middle of a word */
        putchar('\n');
    return 0;
}
```

</details>

## Exercise 1-6 · Word-length histogram <span class="diff medium">medium</span>

Print a horizontal histogram of word lengths: for each length from 1 to 15, one row with that many `#` characters per word of that length. Lump words of 15 or more characters into the last row.

<details class="hint"><summary>Hint</summary>

Track the length of the current word. When a word ends, increment `count[len]` (capped at 15) and reset `len` to 0. Then print one row per array element.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <stdio.h>

#define MAXLEN 15

int main(void)
{
    int c, len = 0;
    int count[MAXLEN + 1] = {0};

    while ((c = getchar()) != EOF) {
        if (c == ' ' || c == '\t' || c == '\n') {
            if (len > 0)
                count[len > MAXLEN ? MAXLEN : len]++;
            len = 0;
        } else {
            len++;
        }
    }
    if (len > 0)
        count[len > MAXLEN ? MAXLEN : len]++;

    for (int i = 1; i <= MAXLEN; i++) {
        printf("%2d%s | ", i, i == MAXLEN ? "+" : " ");
        for (int j = 0; j < count[i]; j++)
            putchar('#');
        putchar('\n');
    }
    return 0;
}
```

</details>

## Exercise 1-7 · A vertical histogram <span class="diff hard">hard</span>

Change the letter-frequency program from [section 1.6](/book/tutorial/#16-arrays) to draw **vertical** bars, with the letters along the bottom. Scale the bars so the tallest is 20 rows high.

<details class="hint"><summary>Hint</summary>

First find the maximum count. Then print rows from the top (height 20) down to 1. In row `r`, column `i` gets a `#` if letter `i`'s scaled height is at least `r`. Scaled height is `counts[i] * 20 / max`, rounded up so that any nonzero count shows at least one `#`.

</details>

<details class="solution"><summary>Solution</summary>

```c
#include <ctype.h>
#include <stdio.h>

#define HEIGHT 20

int main(void)
{
    int counts[26] = {0}, height[26];
    int c, max = 0;

    while ((c = getchar()) != EOF)
        if (isalpha(c))
            counts[tolower(c) - 'a']++;

    for (int i = 0; i < 26; i++)
        if (counts[i] > max)
            max = counts[i];
    if (max == 0)
        return 0;

    for (int i = 0; i < 26; i++)          /* ceiling of counts * HEIGHT / max */
        height[i] = (counts[i] * HEIGHT + max - 1) / max;

    for (int row = HEIGHT; row >= 1; row--) {
        for (int i = 0; i < 26; i++)
            printf("%c ", height[i] >= row ? '#' : ' ');
        putchar('\n');
    }
    for (int i = 0; i < 26; i++)
        printf("%c ", 'a' + i);
    putchar('\n');
    return 0;
}
```

`(a + b - 1) / b` is the standard integer idiom for rounding a positive division **up**.

</details>
