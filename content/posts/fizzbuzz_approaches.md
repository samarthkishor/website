+++
title = "Three Completely Different Approaches to the FizzBuzz Problem"
author = ["Samarth Kishor"]
date = 2020-03-11T22:49:00-04:00
lastmod = 2020-06-29T22:52:32-04:00
tags = ["programming", "python", "OCaml", "lisp"]
draft = false
+++

Here's a solution to the classic infamous FizzBuzz problem in Python:

```python
for i in range(1, 31):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```

```text
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
16
17
Fizz
19
Buzz
Fizz
22
23
Fizz
Buzz
26
Fizz
28
29
FizzBuzz
```

This program is really simple and is probably the most common approach. You just
need to understand how `if` statements work and you're good to go.

We can take this up a notch by using type-driven exhaustive pattern-matching so
that our programming language can actually tell us if we've made a mistake in
our implementation. Here's version 2 of the FizzBuzz program using the OCaml
programming language:

```ocaml
open Base

let () =
  for i = 1 to 30 do
    match Int.rem i 3, Int.rem i 5 with
    | 0, 0 -> Stdio.print_endline "FizzBuzz"
    | 0, _ -> Stdio.print_endline "Fizz"
    | _, 0 -> Stdio.print_endline "Buzz"
    | _, _ -> Stdio.printf "%d\n" i
  done
```

```text
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
16
17
Fizz
19
Buzz
Fizz
22
23
Fizz
Buzz
26
Fizz
28
29
FizzBuzz
```

Notice the `match` expression right after the `for` loop. OCaml has a really
powerful type system that can catch some tricky edge cases in our logic at
compile time. The function `Int.rem` is just like modulo in other languages (I'm
using the `Base` alternate standard library for OCaml---the default language
comes with a `mod` operator). All the `match` expression in the code above is
doing is saying: "If i mod 3 is 0 and i mod 5 is 0, then print FizzBuzz, else if
i mod 3 is 0 and i mod 5 is anything, then print Fizz, else if i mod 3 is
anything and i mod 5 is 0, then print Buzz, else print i if both are anything".

That looks an awful lot like a standard `if` statement to me. The real advantage
comes when you forget to include a case:

```ocaml
open Base

let () =
  for i = 1 to 30 do
    match Int.rem i 3, Int.rem i 5 with
    | 0, 0 -> Stdio.print_endline "FizzBuzz"
    | 0, _ -> Stdio.print_endline "Fizz"
    | _, 0 -> Stdio.print_endline "Buzz"
    (* | _, _ -> Stdio.printf "%d\n" i <-- commented out *)
  done
```

```text
Characters 45-207:
  ....match Int.rem i 3, Int.rem i 5 with
      | 0, 0 -> Stdio.print_endline "FizzBuzz"
      | 0, _ -> Stdio.print_endline "Fizz"
      | _, 0 -> Stdio.print_endline "Buzz"
Warning 8: this pattern-matching is not exhaustive.
Here is an example of a case that is not matched:
(1, 1)
Exception: Match_failure ("//toplevel//", 50, 4).
Raised at file "//toplevel//", line 53, characters 14-40
Called from file "toplevel/toploop.ml", line 180, characters 17-56
```

This is really cool---OCaml's compiler knows when the `match` statement doesn't
cover all the possible cases and will even give you an example of a case that
wasn't met! Once we include that last case, the program will successfully
compile. Depending how you structure your pattern matching, the compiler will
sometimes even tell you if you've used redundant or incorrect cases. It's a
killer feature and I wish more languages had it. Exhaustive pattern matching
like this is usually unique to strongly typed functional programming languages,
although Rust has also adopted this feature and I'm sure others will follow.

Now for the third and wildest approach to solving the FizzBuzz problem---this
time with Clojure. Clojure is a Lisp dialect that emphasizes functional
programming and immutable data structures. This language also happens to have
great support for lazy sequences---a feature that this particular FizzBuzz
program uses heavily.

A lazy sequence is not evaluated immediately---instead, it delays its evaluation
until it is needed by another function.

To illustrate this, here's the documentation for the `cycle` function in
Clojure:

```clojure
(doc cycle)
```

```text
-------------------------
clojure.core/cycle
([coll])
  Returns a lazy (infinite!) sequence of repetitions of the items in coll.
```

How do you use these so-called infinite sequences without using up all the
memory in your computer? The key to using lazy sequences is that these functions
are not evaluated until they are needed by another function. So running this:

```clojure
(cycle '("Fizz" "Buzz"))
```

would just hang the Clojure session because it's waiting to be evaluated. Let's
fix that by taking some values from this infinite sequence.

```clojure
(take 10 (cycle '("Fizz" "Buzz")))
```

|      |      |      |      |      |      |      |      |      |      |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| Fizz | Buzz | Fizz | Buzz | Fizz | Buzz | Fizz | Buzz | Fizz | Buzz |

Now we can write a completely different FizzBuzz implementation leveraging the
power of these lazy sequences. I modified the example from [this blog post](http://www.petecorey.com/blog/2018/07/09/golfing-for-fizzbuzz-in-clojure-and-elixir/) so the
output would match my Python and OCaml programs.

```clojure
(doseq
    [x
     (->>
      (map list
           (range 31)
           (cycle ["Fizz" "" ""])
           (cycle ["Buzz" "" "" "" ""]))
      (rest)
      (map (fn [lst]
             (let [i (first lst)]
               (if (or (= 0 (mod i 3)) (= 0 (mod i 5)))
                 (apply str (concat (rest lst)))
                 (apply str (concat lst)))))))]
  (println x))
```

```text
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
16
17
Fizz
19
Buzz
Fizz
22
23
Fizz
Buzz
26
Fizz
28
29
FizzBuzz
```

The four lines of code below is the heart of the program. It uses the `range`
function to assign numbers to the first elements of the lists and then uses the
two `cycle` functions to assign either the empty string, Fizz, or Buzz to the
second and third elements of the list respectively. It's a really neat
declarative way of implementing FizzBuzz and my mind was completely blown when I
understood what the program really does.

```clojure
(map list
     (range 31)
     (cycle ["Fizz" "" ""])
     (cycle ["Buzz" "" "" "" ""]))
```

| 0   | Fizz | Buzz |
| --- | ---- | ---- |
| 1   |      |      |
| 2   |      |      |
| 3   | Fizz |      |
| 4   |      |      |
| 5   |      | Buzz |
| 6   | Fizz |      |
| 7   |      |      |
| 8   |      |      |
| 9   | Fizz |      |
| 10  |      | Buzz |
| 11  |      |      |
| 12  | Fizz |      |
| 13  |      |      |
| 14  |      |      |
| 15  | Fizz | Buzz |
| 16  |      |      |
| 17  |      |      |
| 18  | Fizz |      |
| 19  |      |      |
| 20  |      | Buzz |
| 21  | Fizz |      |
| 22  |      |      |
| 23  |      |      |
| 24  | Fizz |      |
| 25  |      | Buzz |
| 26  |      |      |
| 27  | Fizz |      |
| 28  |      |      |
| 29  |      |      |
| 30  | Fizz | Buzz |

I never knew FizzBuzz could be solved in so many different ways and it's a neat
little problem to illustrate the strengths and styles of different programming
languages: Python is great for writing legible imperative code that's simple yet
expressive. OCaml is great for writing safe strongly typed code with exhaustive
compiler checks when you need them. Clojure is great for writing highly dynamic
functional code which uses lots of abstractions that makes working with data
much easier.
