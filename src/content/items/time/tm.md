---
name: "tm"
kind: type
header: time
summary: "Broken-down calendar time: year, month, day, hour, and so on."
signature: "struct tm {\n    int tm_sec;    /* seconds after the minute, 0\u201360 */\n    int tm_min;    /* minutes after the hour, 0\u201359 */\n    int tm_hour;   /* hours since midnight, 0\u201323 */\n    int tm_mday;   /* day of the month, 1\u201331 */\n    int tm_mon;    /* months since January, 0\u201311 */\n    int tm_year;   /* years since 1900 */\n    int tm_wday;   /* days since Sunday, 0\u20136 */\n    int tm_yday;   /* days since January 1, 0\u2013365 */\n    int tm_isdst;  /* daylight saving flag */\n};"
source: https://sourceware.org/glibc/manual/latest/html_node/Broken_002ddown-Time.html
---

`tm_isdst` is positive if daylight saving time is in effect, zero if not, and negative if unknown.

Note the offsets: `tm_mon` counts from 0 and `tm_year` from 1900, so 2026-11-24 has `tm_year == 126` and `tm_mon == 10`.

glibc adds the POSIX/BSD members `tm_gmtoff` (seconds east of UTC) and `tm_zone` (abbreviation); they aren't in ISO C.
