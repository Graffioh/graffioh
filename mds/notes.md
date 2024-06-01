# let's go with go

doing [a tour of go](https://go.dev/tour)

C while is spelled **for {...}** in go haha

it's possible to use **defer** to defers the execution of a fuction until the sorrounding function returns
(defers are pushed onto a stack, so call in LIFO order)

([defer,panic,recover blog post](https://go.dev/blog/defer-panic-and-recover))\
defer is used for various clean-up actions (f.e. closing files, releasing mutexes or printing a footer lol)

**panic** stops the normal flow of execution, starts executing defer functions and then return to the caller.

**recover** is to regain control of a panicking goroutine\
(end blogpost)

go has **no pointer arithmetic**

**slice** powerful when working with arrays: a[low : high]

with **slice literals** is possible to do this thing:

~~~go
q := []int{2, 3, 5, 7, 11, 13}
~~~

to create dinamically-sized arrays use **make** + **slice**

~~~go
a := make([]int, 5)  // len(a)=5
b := make([]int, 0, 5) // len(b)=0, cap(b)=5
~~~

use **append** to append elements to a slice

[go slices: usage and internals](https://go.dev/blog/slices-intro))
**arrays** in go are values and not pointers to the first array element! so assigning/passing it around will make a copy if not using "\*array"

we can think of arrays in go like a sort of _indexed struct_

slices are everywhere in go code, arrays are not

"a slice is a descriptor of an array segment"

s = make([]byte, 5)

![slice-internal](https://go.dev/blog/slices-intro/slice-1.png)

s = s[2 : 4]
![slice-internal2](https://go.dev/blog/slices-intro/slice-2.png)

(end blogpost)

use make to construct a **map**:

~~~go
m := make(map[string]int)
~~~

**value receiver**, method related to a specific type (struct), it operates on a copy of the struct

**pointer receiver** let the method modify receiver values, but it's also useful when using large struct (no copy overhead)

<u>best practice is to have all method with value receiver OR pointer receiver</u>

**type assertion** with \<var\>.(\<type\>)

**io.Reader** with **Reader()** = read end of a stream data

**goroutines** are lightweight threads

**channels** used to communicate between goroutines, send and receive values between different parts ensuring safe concurrency

~~~go
ch := make(chan int, 100) // 100 is the buffer length, optional param if you need buffered channels
ch <- v    // Send v to channel ch.
v := <-ch  // Receive from ch, and
           // assign value to v.
~~~

they act like mutex locks, so while a side is doing things, the other side is closed

a sender can **close** a channel to indicate that no more values will be sent (<u>only the sender should close a channel</u>)

~~~go
v, ok := <-ch // ok is false if there are no more values to receive and channel is closed
~~~

closing operation is not mandatory

**select** lets a goroutine wait on multiple communication operations, it blocks until one of its cases can run, then it executes that case, if multiple are ready, the coice is random

~~~go
select {
    case c <- x:
        //...
    case <- quit:
        //...
        return
}
~~~

time for concurrency exercise: _Equivalent Binary Trees_

solved it

**sync.Mutex** used to ensure mutual exclusion <u>without</u> using channels (if you don't need communication between goroutines)

end tour of go, really great to understand the language, 10/10 recommend.

# react for two computers

[dan react conf 24 presentation](https://www.youtube.com/watch?v=T8TZQ6k4SLE) at 5:15:00

thing to remember for the whole presentation: server -> client, where server is something that send a response based on a request

funny that he said you can think about html as a script to tell what the computer should display, probabily related to server components explanation

example with a traditional server -> client approach, with slow loading speed if connection is slow

example with a different approach, where the html document is handled and **returned** by the server, so the "client script" can actually be sent into the response from client request whenever the page loads.
the advantage is that the datas that were requested from the script are automatically loaded into it thanks to lifting the fetch instruction on top of the return value, so no fetch is required when the user does an interaction because the fixed data is already there

server code:

~~~javascript
if (url === "/") {
  // regular fetch operation but he also does other operations here
  // to minimize html code that is sent as a response
  const response = await fetch("...");
  const json = await response.json();
  return `<!doctype html>
    <html>
        <head>
        ...
        </head>
        <body>
            <script>
                function onClick() {
                    const data = ${JSON.stringify(json)};
                    ...
                }
            </script>
        </body>
        ...
    </html>
    `;
}
~~~

he says that the approach on top is pretty much like a php approach (i've never written a line of php so idk)

so the server does pretty much all the synchronous computation to serve the client with a "fixed" html code and a script that doesn't need to do async operations = good performance even on slow internet

but the code written in this way is unreadable, so that's why they created server components?

lastly he does some metaphors with an async component (from the server) and a sync one (from the client), saying that this two parts are separated, if one part needs something can be imported indipendently

another funny metaphor is with doors that let pass some information from a component to another, the "door" is actually the html code that let us pass things between the server and the client

_"we entered the matrix"_

# random react things

https://react.dev/learn

basic thing but never thought of react components as pure functions, so not possible to have f(x) = y1 and f(x) = y2

useState is just an array of pairs, with an index that increment for every fetched state ([deep-dive](https://medium.com/@ryardley/react-hooks-not-magic-just-arrays-cd4f1857236e) to do)

states values are fixed within the same rendering (**snapshots**), so if you wanna update a value in a state you need to request a new render

re-render happens only after all the state updates have been processed (**batching**, performance boost but only when safe to do)

it's possible to change fixed state value in the same render calling set multiple times and using an updater function:

n => n + 1 is called an **updater function** and is using a queue that is processed during re-render and is used to keep track of n

~~~javascript
n = 0;
setNumber((n) => n + 1);
setNumber((n) => n + 1);
setNumber((n) => n + 1);
n = 3;
~~~

i'm sure that 90% of react bootcamp devs don't know these things

reading something in react docs about spread operation and remembered primeagen that talkd about bad performances with it or something like that, but i did a quick search and it actually depends on the situation

started: https://www.youtube.com/watch?v=T8TZQ6k4SLE (dan abramov part around 5:15:00)

remembered about dan abramov blog posts to read: https://overreacted.io
