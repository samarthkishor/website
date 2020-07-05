+++
title = "Interactive OCaml Development"
author = ["Samarth Kishor"]
date = 2020-03-08T22:06:00-04:00
lastmod = 2020-06-29T22:21:41-04:00
tags = ["OCaml", "programming"]
draft = false
+++

Interactive development features are mostly found in dynamically-typed
interpreted programming languages like Python or JavaScript. While OCaml is a
statically-typed compiled language, it is still possible to program in an
interactive style using a REPL. However, OCaml will never be quite as flexible
and interactive as something like Lisp because of its greatest feature: the
strong static type system.

## Testing functions using the REPL {#testing-functions-using-the-repl}

One of the nicest features of OCaml is that is has both a byte-code compiler
(`ocamlc`) and a native-code compiler (`ocamlopt`). This means that you can
develop programs in an interactive, [bottom-up](http://www.paulgraham.com/progbot.html) style using the REPL. Bottom-up
development is a technique most-often leveraged by Lisp programmers in which you
can write a single function, compile it and send it to the REPL, and then test
that function interactively in the REPL. OCaml's fast bytecode compiler makes it
possible to use this technique that is usually unique to Lisps and interpreted
languages.

### Sending code to the REPL in Emacs {#sending-code-to-the-repl-in-emacs}

I'll describe the process for interactive development using Emacs which is my
text editor of choice. Similar techniques should exist for other editors such as
VS Code or Vim.

OCaml's REPL is called `utop` and it has a lot of nice features that make it
well-suited for interactive development. If you're using Emacs, you can send
your OCaml code to `utop` to be evaluated. Here's an example of using `utop` to
test a single function.

```ocaml
open Base

let sum_list list = List.fold ~f:( + ) ~init:0 list
```

To send this code to `utop`, highlight it and press `C-x C-r` (or `M-x utop-eval-region RET`). You can even send an entire buffer to `utop` by pressing
`C-c C-b` via the function `utop-eval-buffer`. If you use the `dune` build
system and configure Emacs appropriately (instructions on how to do this are in
the [utop documentation](https://github.com/ocaml-community/utop#main-setup)), a dialog will pop up saying: "utop command line: opam
config exec -- dune utop . -- -emacs". Press `RET` to evaluate the code.

You might have seen a message saying "Error: unbound module Base". This code
uses [Jane Street's Base alternative standard library](https://opensource.janestreet.com/base/) which makes things a bit
more complicated, since `utop` does not know about Base by default.

To solve this, create a new file in the same directory called `.ocamlinit`.
`utop` reads this file before starting and executes the commands specified. You
just need to include a single line to load the Base library into `utop`:

```ocaml
#require "base";;
```

Now try the previous steps again to load the `sum_list` function into `utop`. If
this still doesn't work, make sure your `opam` environment is set up correctly
by running the command `opam switch` in a terminal and following the
instructions.

Once everything is working, go ahead and test the function in the REPL by
running `sum_list [1; 2; 3];;` (the double semicolons at the end of the line are
important because `utop` uses them to mark the end of an expression). If you
want to make changes to the function, simply switch back to the OCaml buffer,
edit the code, and send it back to `utop`.

### Working with multiple files in the REPL {#working-with-multiple-files-in-the-repl}

The technique I described above works great within a single file, but things get
complicated once you send code from multiple files to the same `utop` instance.
For example, say you made the `sum_list` function within a file called
`test.ml` and sent that code to `utop`. Now you want to use `Test.sum_list`
within another file, so you create a new file called `use_test.ml` which
implements a new function:

```ocaml
let double_sum_list list = (Test.sum_list list) * 2
```

Now when you go to send this new function to `utop`, you run into an error:
"Error: Unbound module Test".

Here's the full sample `utop` session:

```nil
utop[0]> open Base

let sum_list list = List.fold ~f:( + ) ~init:0 list
;;
val sum_list : int list -> int = <fun>
utop[1]> sum_list [1; 2; 3];;
- : int = 6
utop[2]> let double_sum_list list = (Test.sum_list list) * 2
;;

Error: Unbound module Test
```

Since OCaml isn't really made to be an interactive programming language, there
isn't a clean solution for this problem as far as I'm aware. However, you can
hack around this using the same `.ocamlinit` file that I mentioned before.

Kill `utop` and modify the `.ocamlinit` file to look like this:

```ocaml
#require "base";;
#mod_use "test.ml";;
```

The `#mod_use` function tells `utop` to import the given file into the REPL as a
module. This is important because it lets us call `sum_list` as `Test.sum_list`.
`#mod_use` essentially wraps up the functions from the file into a module and
sends that module to be evaluated in the REPL, which is basically how the OCaml
compiler treats OCaml files. We don't want to change our development style to
work with the REPL since `utop` is configurable enough.

There is one caveat with this approach: you have to edit `.ocamlinit` and
restart `utop` whenever you create a new file. If you switch files (say you were
sending code from `use_test.ml` to the REPL but now want to work with
`test.ml`), you have to restart `utop` each time to ensure that it has the most
up-to-date version of all your files/modules. This is a bit of a pain and I'm
not sure if there's a solution to this problem given OCaml's static nature.

## Pretty-printing {#pretty-printing}

A major part of interactive development is seeing the results of functions in
the REPL. Since OCaml has a strong type system without dynamic dispatch, you can
only print strings---this means that you have to write functions to convert your
user-defined types (which are everywhere in idiomatic OCaml code) to strings
each time you want to print them. This is a pain, but luckily there's an elegant
solution: [ppx](https://github.com/ocaml-ppx/ppx%5Fderiving#plugin-show).

`ppx` is a syntax extension to OCaml which acts as a macro that automatically
generates code to pretty-print a custom type (`ppx_deriving.show`), generate
equality functions (`ppx_deriving.eq`), etc.

To pretty-print custom types annotated with `[@@deriving show]` in `utop`, you'll need to
once again modify the `.ocamlinit` file and add the following line:

```ocaml
#install_printer Module.pp;;
```

where `Module` is the name of the module which has the corresponding `pp`
function. Here's an example of one such module that pretty-prints a custom
hash-table with the `Depths` module, where `type t`... `[@@deriving show]` refers
to the `Resolver.t` type:

```ocaml
module Depths = struct
  type t = (string, int) Hashtbl.t

  let pp ppf values =
    Caml.Format.open_hovbox 1;
    Caml.Format.print_cut ();
    if Hashtbl.length values = 0
    then Caml.Format.fprintf ppf "@[<hov 2>{}@]"
    else (
      Caml.Format.fprintf ppf "@[<hov 1>{@ @]";
      Hashtbl.iteri values ~f:(fun ~key ~data ->
          Caml.Format.fprintf ppf "@[<hov 2>%s: %d,@ @]" key data);
      Caml.Format.fprintf ppf "@[<hov 1>}@]");
    Caml.Format.close_box ()
  ;;
end

type t =
  { statements : Parser.statement list
  ; scopes : Scopes.t
  ; depths : Depths.t
  ; parsed_statements : Parser.statement list
  }
[@@deriving show]
```

Here are the corresponding lines in `.ocamlinit` which tell `utop` which types
to pretty-print (the above code is from a file called `resolver.ml`):

```ocaml
#install_printer Resolver.pp;;
#install_printer Resolver.Depths.pp;;
```

Now `utop` knows to call the respective `pp` function whenever it needs to print
type information for the corresponding module. I needed to write the custom
`Depths.pp` function by hand since `ppx_deriving.show` is not powerful enough to
work for all custom types. This is one drawback of strong static type systems.

## Tracing function execution {#tracing-function-execution}

Say you want to now debug the `resolve` function in your `Resolver` module, but
the return value of `resolve` is of type `Resolver.t`. If you didn't have the
`[@@deriving show]` `ppx` annotation on `type t` and didn't write the custom
`Scopes.pp` and `Depths.pp` functions, this would be part of the output of
tracing a call to `Resolver.resolve` in `utop` (I cut off the rest of the output
since it wasn't important):

```ocaml
utop[1]> #trace Resolver.resolve;;
Resolver.resolve is now traced.
utop[2]> Scanner.make_scanner "var x = 1; { var y = 2; }"
|> Scanner.scan_tokens
|> Parser.make_parser
|> Parser.parse
|> Resolver.make_resolver
|> Resolver.resolve;;
Resolver.resolve <--
  {Resolver.statements =
    [Parser.VarDeclaration
      {Parser.name =
        {Scanner.token_type = Scanner.Identifier; lexeme = "x";
         literal = Value.LoxNil; line = 1};
       init =
        Parser.Literal
         {Parser.token =
           {Scanner.token_type = Scanner.Number; lexeme = "1";
            literal = Value.LoxNumber 1.; line = 1};
          value = Value.LoxNumber 1.}};
     Parser.Block
      [Parser.VarDeclaration
        {Parser.name =
          {Scanner.token_type = Scanner.Identifier; lexeme = "y";
           literal = Value.LoxNil; line = 1};
         init =
          Parser.Literal
           {Parser.token =
             {Scanner.token_type = Scanner.Number; lexeme = "2";
              literal = Value.LoxNumber 2.; line = 1};
            value = Value.LoxNumber 2.}}]];
   scopes = <abstr>; depths = <abstr>;
```

Notice this last line: `scopes = <abstr>; depths = <abstr>;`. The `<abstr>`
value indicates that OCaml does not know how to print values of the `Scopes.t`
or `Depths.t` type since there are no dedicated `pp` functions for those types.

Once I added the `[@@deriving show]` annotation back to `type t`, wrote the
`Scopes.pp` and `Depths.pp` functions, and added the relevant `#install_printer`
lines to `.ocamlinit`, this was the full output of the same trace to
`Resolver.resolve`:

```ocaml
utop[1]> #trace Resolver.resolve;;
Resolver.resolve is now traced.
utop[2]> Scanner.make_scanner "var x = 1; { var y = 2; }"
|> Scanner.scan_tokens
|> Parser.make_parser
|> Parser.parse
|> Resolver.make_resolver
|> Resolver.resolve;;
Resolver.resolve <--
  { Resolver.Resolver.statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ];
    scopes = {}; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve <--
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "1"; literal = (Value.Value.LoxNumber 1.); line = 1 };
             value = (Value.Value.LoxNumber 1.) }))
      ];
    scopes = {}; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve -->
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "1"; literal = (Value.Value.LoxNumber 1.); line = 1 };
             value = (Value.Value.LoxNumber 1.) }))
      ];
    scopes = {}; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve <--
  { Resolver.Resolver.statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                 line = 1 };
               value = (Value.Value.LoxNumber 2.) })
          })
      ];
    scopes = {}; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve <--
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "2"; literal = (Value.Value.LoxNumber 2.); line = 1 };
             value = (Value.Value.LoxNumber 2.) }))
      ];
    scopes = { y: declared, }; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve -->
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "2"; literal = (Value.Value.LoxNumber 2.); line = 1 };
             value = (Value.Value.LoxNumber 2.) }))
      ];
    scopes = { y: declared, }; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve -->
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "2"; literal = (Value.Value.LoxNumber 2.); line = 1 };
             value = (Value.Value.LoxNumber 2.) }))
      ];
    scopes = { y: declared, }; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve <--
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "2"; literal = (Value.Value.LoxNumber 2.); line = 1 };
             value = (Value.Value.LoxNumber 2.) }))
      ];
    scopes = {}; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve -->
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "2"; literal = (Value.Value.LoxNumber 2.); line = 1 };
             value = (Value.Value.LoxNumber 2.) }))
      ];
    scopes = {}; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
Resolver.resolve -->
  { Resolver.Resolver.statements =
    [(Parser.Parser.Expression
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "2"; literal = (Value.Value.LoxNumber 2.); line = 1 };
             value = (Value.Value.LoxNumber 2.) }))
      ];
    scopes = {}; depths = {};
    parsed_statements =
    [(Parser.Parser.VarDeclaration
        { Parser.Parser.name =
          { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
            lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
          init =
          (Parser.Parser.Literal
             { Parser.Parser.token =
               { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                 lexeme = "1"; literal = (Value.Value.LoxNumber 1.);
                 line = 1 };
               value = (Value.Value.LoxNumber 1.) })
          });
      (Parser.Parser.Block
         [(Parser.Parser.VarDeclaration
             { Parser.Parser.name =
               { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
                 lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
               init =
               (Parser.Parser.Literal
                  { Parser.Parser.token =
                    { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                      lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                      line = 1 };
                    value = (Value.Value.LoxNumber 2.) })
               })
           ])
      ]
    }
- : Resolver.t =
{ Resolver.Resolver.statements =
  [(Parser.Parser.Expression
      (Parser.Parser.Literal
         { Parser.Parser.token =
           { Scanner.Scanner.token_type = Scanner.Scanner.Number;
             lexeme = "2"; literal = (Value.Value.LoxNumber 2.); line = 1 };
           value = (Value.Value.LoxNumber 2.) }))
    ];
  scopes = {}; depths = {};
  parsed_statements =
  [(Parser.Parser.VarDeclaration
      { Parser.Parser.name =
        { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
          lexeme = "x"; literal = Value.Value.LoxNil; line = 1 };
        init =
        (Parser.Parser.Literal
           { Parser.Parser.token =
             { Scanner.Scanner.token_type = Scanner.Scanner.Number;
               lexeme = "1"; literal = (Value.Value.LoxNumber 1.); line = 1 };
             value = (Value.Value.LoxNumber 1.) })
        });
    (Parser.Parser.Block
       [(Parser.Parser.VarDeclaration
           { Parser.Parser.name =
             { Scanner.Scanner.token_type = Scanner.Scanner.Identifier;
               lexeme = "y"; literal = Value.Value.LoxNil; line = 1 };
             init =
             (Parser.Parser.Literal
                { Parser.Parser.token =
                  { Scanner.Scanner.token_type = Scanner.Scanner.Number;
                    lexeme = "2"; literal = (Value.Value.LoxNumber 2.);
                    line = 1 };
                  value = (Value.Value.LoxNumber 2.) })
             })
         ])
    ]
  }
utop[8]>
```

Notice how `utop` now knows how to print the `Scopes.t` and `Depths.t` types,
like `scopes = { y: declared, }; depths = {};`, instead of just `scopes = <abstr>; depths = <abstr>;`. This technique is incredibly useful for debugging
by tracing functions in the REPL and using the REPL interactively in general.

I hope this overview of interactive OCaml development with `utop` was useful.
Even though OCaml is a language that has an uncompromisingly strict static type
system, it's still possible to get some of the useful interactive features
of more dynamic languages like Lisp through a configurable plugin-based REPL and
syntax extensions that help minimize boilerplate. Sometimes you really can have
your cake and eat it too!
