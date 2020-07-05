+++
title = "Remote Linux Process Hacking through SSH"
author = ["Samarth Kishor"]
date = 2020-03-09T22:10:00-04:00
lastmod = 2020-06-29T22:31:41-04:00
tags = ["programming", "lisp", "linux"]
draft = false
+++

There's this really cool [process hacking series](https://www.youtube.com/playlist?list=PLBgJcoaU2hl-JnoVOzjYB5qk%5FPfYjPm-I) on YouTube by Keist Zenon. He
uses the programming language Common Lisp to interact with processes on his
Linux machine. I tried following the tutorial on my Mac, but macOS does not have
the same `ptrace` commands and system call interfaces as Linux so this did not
work out. However, I have VirtualBox set up on my Mac with a Debian VM which I
use whenever I need Linux.

Here's the idea: is it possible to hack processes on my Linux VM from Emacs on
my Mac? I found out that it's not only possible, but it's actually surprisingly
easy.

## Configuring the Virtual Machine {#configuring-the-virtual-machine}

First you'll need to set up a Bridged Adapter on your VirtualBox VM to allow
your host machine to connect to it via SSH. [This YouTube tutorial](https://www.youtube.com/watch?v=ErzhbUusgdI) was pretty
helpful. You'll just have to change how you enable the SSH service on your Linux
VM---I'm on Debian so I had to run the command

```sh
systemctl status ssh | cat | grep active
```

```text
Active: active (running) since Fri 2020-03-13 18:24:14 EDT; 33s ago
```

to see if SSH was enabled.

To attach and manipulate this process, we need to use the `ptrace` function. You
can see the documentation for it with the command `man 2 ptrace` (2 stands for
the second section of the manual, since we want the C system call function for
`ptrace` instead of the general UNIX command). We could use C for process
hacking, but it's a lot nicer to use an interactive language like Lisp. Plus,
it's possible to interact with a remote Lisp REPL from your host machine's local
Emacs instance through SSH. Common Lisp is pretty amazing---I don't know if many
other programming languages have these features.

Clone [Keist's GitHub repo](https://github.com/k-stz/cl-ptrace) to your VM to get his Common Lisp library for process
hacking with `ptrace`. The code here is essentially the same as the tutorial,
except you might have to remove the line that says

```common-lisp
(:file "cl-ptrace/async-functions")
```

since that file doesn't exist in the repo for some reason. Install your Common
Lisp implementation of choice (I use `sbcl` since it's well-supported on most
platforms) and follow the instructions on the [Quicklisp website](https://www.quicklisp.org/beta/) to install
Quicklisp. Quicklisp is the unofficial package manager for Common Lisp.

Once you've successfully installed Quicklisp, you need to set up a Lisp REPL on
the remote VM so it can talk to your local Emacs editor. Quit out of your `sbcl`
repl and run it as root. We need Lisp to run as root since the `ptrace` system
calls need root access.

```sh
sudo sbcl
```

In his tutorial, Kaiste avoided this problem by running Emacs as root since he
was hacking processes from the same machine. However, we don't want to do this
since running Emacs as root can be dangerous, plus we are trying to hack
processes on our _remote_ machine from our _local (host)_ Emacs editor, so
running Emacs locally as root wouldn't really be useful.

Use Quicklisp to load/install `ASDF` and `slynk`, and then create a `slynk`
server on port 4006. You can use the default port 4005 if it's open.

```common-lisp
(ql:quickload :asdf)
(ql:quickload :slynk)
(slynk:create-server :port 4006)
```

If you get stuck, follow the instructions in [the SLY manual](https://joaotavora.github.io/sly/#Setting-up-the-Lisp-image), but I think
Quicklisp makes this process a bit easier.

Now fire up a new terminal and get your VM's ip address. On Debian, the command
is

```sh
hostname -I
```

After that, SSH into your VM from your _host_ machine to create an SSH tunnel
that we'll take advantage of later.

```sh
ssh -L4006:localhost:4006 <username>@<ip-address>
```

Change `4006` to the port that `slynk` is using to run your Lisp server, and
change the `<username>` and `<ip-address>` fields. Remember to run this command
from your host machine, not the VM.

Once your SSH tunnel is set up, follow the instructions in section 8.1.3 of the
SLY manual (linked above) to configure Emacs to translate filenames between the
remote and host machines. Make sure you have TRAMP installed and working in
Emacs. Now you can connect to your VM from your host machine's Emacs using
TRAMP. `C-x C-f /ssh:<username>@<ip-address>` should do the trick. Now you can
navigate to the `cl-ptrace` repo.

The setup is pretty much over: now we can start hacking. Compile the `spam.c`
file in the `cl-ptrace` repo on your VM into the executable `spam` and run it.

```sh
gcc spam.c -o spam
./spam
```

We want to get the process id (`pid`) of this `spam` program so we can interact
with it. To do this, run the command

<a id="code-snippet--spam-pid"></a>

```sh
ps -a | grep spam | awk '{ print $1 }'
```

```text
1543
```

We can then display information about the process with `top`. You can get a
nicer output by using the `htop` program.

```sh
top -p $PID
```

We can even limit the output of `top` to just get the CPU usage. The `sed`
commands are just for making the output nicer.

```sh
top -p $PID -n 2 -b | grep Cpu | sed 's/\:/\: /' | sed 's/us,.*/ /'
```

| %Cpu(s): | 53.6  |
| -------- | ----- |
| %Cpu(s): | 100.0 |

Notice that the `spam` program is taking up over 90% of the CPU since it's an
infinite `while` loop in a single-threaded process.

## Hacking in Emacs {#hacking-in-emacs}

Next, switch back to Emacs (on the host machine) and make sure you're in the
remote `cl-ptrace` repo via TRAMP. We want to connect to the remote Lisp server
from Emacs, so run the command `M-x sly-connect`, keep the default host as
`localhost`, and change the port to the `slynk` server port.

Now you have a local Lisp REPL that is connected to your VM via the SSH tunnel
we created earlier. Load the file `cl-ptrace.asd` with the command `M-x sly-load-file`. The file is on the remote VM, but this isn't a problem because
TRAMP should be configured to handle the remote filenames (we did this earlier).
This should load the file into the `sly` REPL. Then run `(asdf:load-system "cl-ptrace")` to load the `cl-ptrace` library into the REPL, and run
`(in-package :cl-ptrace)` to start using the library.

Make sure that you're root by running the function `(am-i-root?)`. It should
return `T`. Now you've successfully created a mechanism to hack remote processes
from your local machine using Common Lisp and Emacs. Go ahead and follow along
with the rest of Kaiste's videos---they're amazing.
