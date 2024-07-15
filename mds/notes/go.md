# go concurrency

## [rob pike I/O 12 concurrency talk](https://www.youtube.com/watch?v=f6kdp27TYZs)

> concurrency is a way to "simulate/interact with" the real world

a *go routine*:
- is a way to run a function but in an indipendent way, it basically don't wait for the answer to come back
- it has it's own "dynamic" call stack (grows and shrinks as required)
- it's not a thread (there might be 1 thread running with 1000 go routines)
- they are cheap

in go **"concurrency is the composition of indipendently executing go routines"**

a *channel*:
- is used to communicate between goroutines, "<-"
- implement synchronization as well, because a channel is a blocking operation, so till the sender sent and receiver received, it's blockd (<ins>buffered channels doesn't have this property</ins>)

> don't communicate by sharing memory, share memory by communicating

patterns:

- [**generator**](https://go.dev/talks/2012/concurrency.slide#25): more readability
- [**fan-in (multiplexing)**](https://go.dev/talks/2012/concurrency.slide#27): pattern to make the channels "indipendent", they are not "blocking" (sort of) anymore, decouple execution.\
by using [wait](https://go.dev/talks/2012/concurrency.slide#29) as an attribute channel of type bool, it's possible to restore the sequencing
- [**daisy-chain**](https://go.dev/talks/2012/concurrency.slide#40): channel chaining with one receiver at the end for the chain

a [select](https://go.dev/talks/2012/concurrency.slide#32) is like a switch but each case is a communication (good for fan-in, timeout a communication, quit a channel and more)

proceed to build a toy and fake search engine to show how go is used in system programming

## [running multiple http servers in one go](https://freedium.cfd/https://medium.com/rungo/running-multiple-http-servers-in-go-d15300f4e59f)

**http.ListenAndServe()**** starts an http server and <ins>blocks the current goroutine</ins>

so we'll use another goroutine different from the main function that will launch another server

~~~go
func main() {
	http.HandleFunc("/", handler)

	log.Println("Servers ON")

	go func() {
		http.ListenAndServe(":6970", nil)
	}()

	http.ListenAndServe(":6969", nil)
}
~~~

it's better to use a WaitGroup to orchestrate goroutines than running them directly on main

~~~go
func main() {
	wg := new(sync.WaitGroup)
	wg.Add(2)

	http.HandleFunc("/", handler)

	log.Println("Servers ON")

	go func() {
		http.ListenAndServe(":6970", nil)
		wg.Done()
	}()

	go func() {
		http.ListenAndServe(":6969", nil)
		wg.Done()
	}()

	wg.Wait()
}
~~~
(maybe use defer wg.Done()?)

other things about servemux, close, shutdown

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

```go
q := []int{2, 3, 5, 7, 11, 13}
```

to create dinamically-sized arrays use **make** + **slice**

```go
a := make([]int, 5)  // len(a)=5
b := make([]int, 0, 5) // len(b)=0, cap(b)=5
```

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

```go
m := make(map[string]int)
```

**value receiver**, method related to a specific type (struct), it operates on a copy of the struct

**pointer receiver** let the method modify receiver values, but it's also useful when using large struct (no copy overhead)

<u>best practice is to have all method with value receiver OR pointer receiver</u>

**type assertion** with \<var\>.(\<type\>)

**io.Reader** with **Reader()** = read end of a stream data

**goroutines** are lightweight threads

**channels** used to communicate between goroutines, send and receive values between different parts ensuring safe concurrency

```go
ch := make(chan int, 100) // 100 is the buffer length, optional param if you need buffered channels
ch <- v    // Send v to channel ch.
v := <-ch  // Receive from ch, and
           // assign value to v.
```

they act like mutex locks, so while a side is doing things, the other side is closed

a sender can **close** a channel to indicate that no more values will be sent (<u>only the sender should close a channel</u>)

```go
v, ok := <-ch // ok is false if there are no more values to receive and channel is closed
```

closing operation is not mandatory

**select** lets a goroutine wait on multiple communication operations, it blocks until one of its cases can run, then it executes that case, if multiple are ready, the coice is random

```go
select {
    case c <- x:
        //...
    case <- quit:
        //...
        return
}
```

time for concurrency exercise: _Equivalent Binary Trees_

solved it

**sync.Mutex** used to ensure mutual exclusion <u>without</u> using channels (if you don't need communication between goroutines)

end tour of go, really great to understand the language, 10/10 recommend.
