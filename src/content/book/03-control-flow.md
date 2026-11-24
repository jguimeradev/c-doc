---
title: Control Flow
number: "3"
order: 3
summary: Statements and blocks, decisions, loops, and jumps.
---

By default statements run one after another, top to bottom. Control-flow statements change that: they choose between alternatives, repeat work, or jump elsewhere. C has a compact set of them, similar to most languages descended from it.

## 3.1 Statements and Blocks

Put a semicolon after an expression such as `count = 0` or `puts("hi")` and it becomes a **statement**. The semicolon ends each statement; it isn't placed *between* statements.

Curly braces group any number of declarations and statements into a **block** (a *compound statement*). Wherever a single statement is allowed, a block may be used instead. No semicolon follows the closing brace. Names declared inside a block are visible only within it.

## 3.2 If-Else

```text
if (condition)
    statement-when-true
else
    statement-when-false
```

The `else` branch is optional. The condition is any expression; nonzero means true. So `if (remaining)` and `if (remaining != 0)` are the same test.

When `if` statements are nested, an `else` attaches to the **closest** unmatched `if`, no matter how the code is indented:

```c
if (logged_in)
    if (is_admin)
        show_admin_panel();
else                     /* misleading: this pairs with "if (is_admin)" */
    show_login_form();
```

Braces make the intent unambiguous, which is why many teams require them everywhere:

```c
if (logged_in) {
    if (is_admin)
        show_admin_panel();
} else {
    show_login_form();
}
```

## 3.3 Else-If

Chaining `else if` handles a choice among several cases:

```c
const char *grade(int score)
{
    if (score >= 90)
        return "A";
    else if (score >= 80)
        return "B";
    else if (score >= 70)
        return "C";
    else if (score >= 60)
        return "D";
    else
        return "F";
}
```

Conditions are checked from the top; the first one that's true is taken and the rest are skipped. The trailing `else` catches whatever's left, and can be dropped when there's nothing to do in that case.

Binary search is a classic use of a three-way decision. Given an array sorted in increasing order, it halves the search range on each step:

```c
/* find: index of target in sorted a[0..n-1], or -1 */
int find(const int a[], int n, int target)
{
    int lo = 0, hi = n - 1;

    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;   /* written this way to avoid overflow */
        if (a[mid] < target)
            lo = mid + 1;
        else if (a[mid] > target)
            hi = mid - 1;
        else
            return mid;
    }
    return -1;
}
```

[`bsearch`](/stdlib/fn.bsearch/) in the standard library does the same for arrays of any type.

## 3.4 Switch

`switch` compares an integer expression against a list of **constant** values and jumps to the matching `case`:

```c
/* apply: apply arithmetic operator op to a and b */
double apply(char op, double a, double b, int *ok)
{
    *ok = 1;
    switch (op) {
    case '+':
        return a + b;
    case '-':
        return a - b;
    case '*':
    case 'x':           /* accept x as a synonym for * */
        return a * b;
    case '/':
        if (b != 0)
            return a / b;
        break;          /* division by zero: fall out to the error */
    default:
        break;          /* unknown operator */
    }
    *ok = 0;
    return 0;
}
```

Each `case` label must be a distinct integer constant expression. `default` runs when nothing matches; it's optional.

The crucial detail: execution **falls through** from one case into the next unless something (`break`, `return`, `goto`) leaves the `switch`. Stacking labels with no code between them, like `'*'` and `'x'` above, is the intended use. Accidentally leaving out a `break` is a classic bug, so end every non-empty case with one, including the last, and mark deliberate fall-through with a comment or C23's `[[fallthrough]];`. GCC and Clang warn with `-Wimplicit-fallthrough`.

## 3.5 Loops: While and For

```text
while (condition)
    body
```

repeats `body` as long as `condition` is nonzero, testing before each pass. The body may run zero times.

```text
for (init; condition; update)
    body
```

behaves like

```text
init;
while (condition) {
    body
    update;
}
```

(the one difference involves `continue`, covered below). Any of the three parts may be left empty; an empty condition means "always true", so `for (;;)` loops until something inside breaks out.

Reach for `for` when a loop has a clear counter or cursor; it puts the setup, test and step side by side. Here's insertion sort, which grows a sorted prefix of the array one element at a time:

```c
/* insertion_sort: sort a[0..n-1] into increasing order */
void insertion_sort(int a[], int n)
{
    for (int i = 1; i < n; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];     /* shift larger element right */
            j--;
        }
        a[j + 1] = key;
    }
}
```

The **comma operator** evaluates two expressions left to right and yields the right one. Its main use is in `for` loops that track two variables:

```c
/* is_palindrome: true if s reads the same both ways */
bool is_palindrome(const char *s)
{
    for (size_t i = 0, j = strlen(s); i + 1 < j; i++, j--)
        if (s[i] != s[j - 1])
            return false;
    return true;
}
```

The commas separating function arguments or declared variables are punctuation, not the comma operator.

## 3.6 Loops: Do-While

`do … while` checks its condition **after** each pass, so the body always runs at least once:

```text
do
    body
while (condition);
```

It suits tasks that must happen once before you can decide whether to repeat, like prompting until the input is acceptable:

```c
int choice;
do {
    printf("Pick 1-3: ");
    fflush(stdout);
    if (scanf("%d", &choice) != 1)
        return -1;                     /* input closed or not a number */
} while (choice < 1 || choice > 3);
```

Or summing the digits of a number, where even `0` has one digit to process:

```c
int digit_sum(unsigned n)
{
    int sum = 0;
    do {
        sum += n % 10;
        n /= 10;
    } while (n > 0);
    return sum;
}
```

## 3.7 Break and Continue

`break` leaves the innermost enclosing loop or `switch` immediately:

```c
/* first_negative: index of first negative value in a, or -1 */
int first_negative(const double a[], int n)
{
    int i;
    for (i = 0; i < n; i++)
        if (a[i] < 0)
            break;
    return (i < n) ? i : -1;
}
```

`continue` skips the rest of the current iteration and starts the next one: in `while` and `do` it jumps to the condition, in `for` to the update step. It has no meaning in a `switch` by itself.

```c
char line[256];
while (fgets(line, sizeof line, cfg) != NULL) {
    if (line[0] == '#' || line[0] == '\n')
        continue;                 /* skip comments and blank lines */
    parse_setting(line);
}
```

`continue` is most worthwhile when it saves indenting a long loop body one more level.

## 3.8 Goto and Labels

`goto label;` jumps to a statement marked `label:` elsewhere in the same function. Anything you can do with `goto` can be done without it, and code that jumps around freely is hard to follow. Still, there are two places where experienced C programmers use it on purpose.

**Leaving nested loops at once.** `break` only exits one level:

```c
for (int r = 0; r < rows; r++)
    for (int c = 0; c < cols; c++)
        if (grid[r][c] == target) {
            found_r = r;
            found_c = c;
            goto done;
        }
done:
    ;
```

**Single exit for cleanup.** When a function acquires several resources, jumping to a common cleanup section avoids duplicating release code on every error path. This pattern is pervasive in operating-system code:

```c
int copy_file(const char *src, const char *dst)
{
    int result = -1;
    FILE *in = NULL, *out = NULL;
    char *buf = NULL;

    if ((in = fopen(src, "rb")) == NULL)
        goto cleanup;
    if ((out = fopen(dst, "wb")) == NULL)
        goto cleanup;
    if ((buf = malloc(BUFSIZ)) == NULL)
        goto cleanup;

    size_t n;
    while ((n = fread(buf, 1, BUFSIZ, in)) > 0)
        if (fwrite(buf, 1, n, out) != n)
            goto cleanup;
    if (!ferror(in))
        result = 0;

cleanup:
    free(buf);
    if (out != NULL && fclose(out) == EOF)
        result = -1;
    if (in != NULL)
        fclose(in);
    return result;
}
```

Labels look like identifiers followed by a colon, and are visible throughout the function that contains them.
