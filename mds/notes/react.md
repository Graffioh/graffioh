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
