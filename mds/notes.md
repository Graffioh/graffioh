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

# load balancing (overview)

## [cloudflare blog](https://www.cloudflare.com/en-gb/learning/performance/what-is-load-balancing/)

load balancing is basically distributing computational workloads between two or more computers, to reduce overload/idle time, improve performances/latency => improve ux

![loadbalancing-img1](https://www.datocms-assets.com/48294/1697786828-load-balancing-3-benefits-of-load-balancing.png?auto=format&dpr=0.84&w=1920)

a load balancer is a standalone tool/app that can be either hardware or software based.

there are two main algorithm categories to choose which server to assign a request to:

- **static**: distribute workloads without taking into account the current state of the system, so the requests are assigned based on a predetermined plan. quick to set up but inefficient
- **dynamic**: opposite of static, but is more difficult to configure due to different factors like the server health, overall server capacity, size of the task...

dynamic load balancers performs regular server health checks to spot if server are performing slowly or are failed (in this case the load balances do a *failover*, so traffic re-routing)

## [load balancing algorithms](https://www.cloudflare.com/en-gb/learning/performance/types-of-load-balancing-algorithms/)

**dynamic**

- *least connection*: assumes all connections require equal processing power, checks which servers have the fewest connections open at the time
- *weighted leat connection*: least connection but the admin can assign different wieghts to each server
- *weighted response time*: send traffic to server with the quickest response time by computing average of each server response time in combination with the number of connections each server has open
- *resource based*: distributes load based on what resources each server has available at the time. an agent is running on each server and measures available CPU and memory

**static**

- *round robin*: distributes traffic in rotation using the DNS
- *weighted round robin*: same as round robin but with weights
- *ip hash*: combines incoming ip addresses of traffic source and destination using a mathematical function to hash it and uses this hash to load balance

# database indexes

## [blog post](https://medium.com/@rtawadrous/introduction-to-database-indexes-9b488e243cc1)

an index irl is basically an index that is at the end of a book or something like this:

![index-irl](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*czofk-NEw-JHQHa3Zc0fqw.jpeg)

use indexes to help the db engine to not make a full scan of datas every query

two types of indexes:\
- **clustered index (primary key)**: each table can have only one clustered index, the data rows are rearranged in the order of the indexed columns and records are stored in the leaf nodes if we think storage as a tree
- **non clustered index (secondary key)**: table can have multiple of them, stored in a separate data structure, records not stored in the leaf nodes

### under the hood
db engine will keep everything in sync and will do the heavy work

so indexes improves performances but also comes at a cost

clustered index b+ tree by id:
![bplustree1-index](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*vDO2GGa4oyDcI_jl41BQXg.png)

non clustered index b+ tree by email and id:
![bplustree2-index](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*DLHknnmdhz_5ClUr1OqTiw.png)

different indexes implementation as data structures with different pros and cons:

- **b+ tree**
- **hash**
- **bitmap**
- **sparse**

## [video](https://www.youtube.com/watch?v=-qNSXK7s7_w)

select execution time comparison:

- for id WHERE id: 0.141 ms
- for name WHERE id: 2.520 ms
- for id WHERE name: 3199.724 ms WTF (full table scan, no index)

~~~sql
create index users_username on users(username);
~~~

will implement indexes in web technologies project for users table just for fun

# the argon wrath (go)

so tried to implement password verification with argon but failed miserably so found this [blog post](https://www.alexedwards.net/blog/how-to-hash-and-verify-passwords-with-argon2-in-go#:~:text=Verifying%20Passwords,-The%20final%20aspect&text=In%20essence%2C%20the%20steps%20to,same%20as%20the%20original%20one.) and started reading it

even if argon has 3 variants, for password hashing it's preferably to use **Argo2id** (hybrid of Argon2d and Argon2i)

the argon algo accepts various parameters:

- **Memory** — The amount of memory used by the algorithm (in kibibytes).
- **Iterations** — The number of iterations (or passes) over the memory.
- **Parallelism** — The number of threads (or lanes) used by the algorithm.
- **Salt length** — Length of the random salt. 16 bytes is recommended for password hashing.
- **Key length** — Length of the generated key (or password hash). 16 bytes or more is recommended.

memory and iterations control the computational cost (and time cost) of hashing, more cost more difficult is for the hacker to guess the password

for login/signup hashing, it's better for ux to have a runtime less than 500ms

formally argon2 is a key-derivation func, so the key that is produced is our hashed password

now with a random salt everytime a different hashed password will appear (with the same string)

to store the password the standard way is to create an encoded rep of the hashed password which looks like this:

$argon2id$v=19$m=\<memory>,t=\<iterations>,p=<parallelism>$\<base64-salt>$\<base64-hash>

in my case:\
$argon2id$v=19$m=19456,t=2,p=1$...$...

to **verify the password** there are a few steps:
- Extract the salt and parameters from the encoded password hash stored in the database.
- Derive the hash of the plaintext password using the exact same Argon2 variant, version, salt and parameters.
- Check whether this new hash is the same as the original one.

i implemented everything like the article suggested and it actually work.

feels good

![bojji](https://m.media-amazon.com/images/M/MV5BMzc0NTgxMTMtMmIzMS00ZmJhLWI5NjItZGNlN2Y1ZDM1YmUxXkEyXkFqcGdeQVRoaXJkUGFydHlJbmdlc3Rpb25Xb3JrZmxvdw@@._V1_.jpg)

# password auth best practices

still reading [The Copenhagen Book](https://thecopenhagenbook.com)

- at least 8 chars long
- all valid unicode chars should be allowed, including whitespace
- use [zxcvbn](https://github.com/dropbox/zxcvbn) for weak password
- detect leak password using [haveibeenpawned](https://haveibeenpwned.com/API/v3)

passwords must be salted and hased before storage.

**argon2id** with salting is recommended

hashing is to generate a unique representation of the input, so same input same hash...it's not reversible unlike encryption

recommended to not use MD5, SHA-1 and SHA-256 for password

**salting** is a common technique to add random values to each password before hashing to prevent brute force attacks

```go
salt = randomValues()
hash = hashPassword(password + salt) + salt
```

when comparing password hashes use constant time comparison instead of "==", to ensure protection against time-based attacks (where an attacker can extract infos using how long it took to compare the password with the hash lol)

the standard way should be with argon2id, scrypt and bcrypt:

```go
import (
	"crypto/subtle"
	"golang.org/x/crypto/argon2"
)

var storedHash []byte
var password []byte
hash := argon2.IDKey(password, salt, 2, 19*1024, 1, 32)

if (subtle.ConstantTimeCompare(hash, storedHash)) {
	// Valid password.
}
```

argon2id recommended minimum parameters

- **memorySize**: 19456 (19MB)
- **iterations**: 2
- **parallelism**: 1
- **optional**: use secret parameter

scrypt recommended minimum parameters

- **N**: 16384
- **P**: 16
- **r**: 1
- **dkLen**: 64

bcrypt **work factor** should be minimum 10

**MFA** is the best defense against brute-force attacks

a good rule of thumb is that error messages needs to be vague like "incorrect username or password", not "incorrect username" or "incorrect password".

for ux perspective it's more user friendly with targeted error messages, ofc

- don't prevent users from copy-pasting password as it discourages users from using password managers (clever)
- ask the current password when a user attempts to change their password
- [open redirect](https://thecopenhagenbook.com/open-redirect)

# basic auth from scratch (sort of)

[The Copenhagen Book](https://thecopenhagenbook.com) by the creator of Lucia-auth ([pilcrow](https://x.com/pilcrowonpaper))

store a **token** on the server

```sql
CREATE TABLE token (
	token STRING NOT NULL UNIQUE,
	expires_at INTEGER NOT NULL,
	user_id INTEGER NOT NULL,

	FOREIGN KEY (user_id) REFERENCES user(id)
)
```

where this token should be for example a **session for auth** and should be stored as a cookie

using this session cookie we can everytime retrieve (if present) user infos thanks to user_id foreign key

token must be **generated using a cryptographically secure random generator** and must be case-sensitive (generally)

```go
import (
	"crypto/rand"
	"encoding/base32"
)

bytes := make([]byte, 15)
rand.Read(bytes)
sessionId := base32.StdEncoding.EncodeToString(bytes)
```

if you need to store tokens that require an extra level of security (password reset tokens), there should be hashing using SHA-256

a new session with a session_id should be created whenever a user signs in

you could also implement sessions for non-authenticated users

the **session lifetime** is important for security reasons

for security-critical apps, the session should expire automatically and should match how long the user is expected to use the app in a single sitting, to prevent **session hijacking** (stealing a session)

for a social app tho, a good practice is to set the expiration time to a reasonable value, like 30 days

```go
func validateSession(sessionId string) (*Session, error) {
	session, ok := getSessionFromStorage(sessionId)
	if !ok {
		return nil, errors.New("invalid session id")
	}
	if time.Now().After(session.ExpiresAt) {
		return nil, errors.New("expired session")
	}
	return session, nil
}
```

sessions should be _invalidated_ whenever a user signs out (delete from db and cookies)

session cookies should have the following attributes:

- **HttpOnly**: Cookies are only accessible server-side
- **SameSite=Lax**: Use Strict for critical websites
- **Secure**: Cookies can only be sent over HTTPS
- **Max-Age** or Expires: Must be defined to persist cookies
- **Path=/**: Cookies can be accessed from all routes

when using cookies **CSRF protection** must be implemented

CSRF attacks consists of an attacker that makes authenticated requests on behalf of users when credentials are stored in cookies

_CSRF can be prevented by only accepting POST and POST-like (PUT, DELETE) requests made by browsers from a trusted origin_

use CORS in a strict way and check **Origin header** for non-GET requests

```go
func handleRequest(w http.ResponseWriter, request *http.Request) {
  	if request.Method != "GET" {
		originHeader := request.Header.Get()

		if originHeader != "https://example.com" {
			// Invalid request origin
			w.WriteHeader(403)
			return
		}
  	}
  	// ...
}
```

(the origin header has been supported by all modern browsers since around 2020, chrome and safari even before 2020)

SameSite=Lax is recommended, it will only be sent on cross-site requests if the request uses a safe HTTP method such as GET (it's crucial that the app doesn't use GET requests for modifying resources when using Lax (who does that?))

SameSite flag determines when the browser includes the cookie in requests

<u>DON'T send cookies inside URLs as query params or inside form data, DON'T store session ids inside localStorage or sessionStorage</u>

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

# react for two computers

[dan react conf 24 presentation](https://www.youtube.com/watch?v=T8TZQ6k4SLE) at 5:15:00

thing to remember for the whole presentation: server -> client, where server is something that send a response based on a request

funny that he said you can think about html as a script to tell what the computer should display, probabily related to server components explanation

example with a traditional server -> client approach, with slow loading speed if connection is slow

example with a different approach, where the html document is handled and **returned** by the server, so the "client script" can actually be sent into the response from client request whenever the page loads.
the advantage is that the datas that were requested from the script are automatically loaded into it thanks to lifting the fetch instruction on top of the return value, so no fetch is required when the user does an interaction because the fixed data is already there

server code:

```javascript
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
```

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

```javascript
n = 0;
setNumber((n) => n + 1);
setNumber((n) => n + 1);
setNumber((n) => n + 1);
n = 3;
```

i'm sure that 90% of react bootcamp devs don't know these things

reading something in react docs about spread operation and remembered primeagen that talkd about bad performances with it or something like that, but i did a quick search and it actually depends on the situation

started: https://www.youtube.com/watch?v=T8TZQ6k4SLE (dan abramov part around 5:15:00)

remembered about dan abramov blog posts to read: https://overreacted.io
