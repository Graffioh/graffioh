# [React hooks deep dive](https://medium.com/@ryardley/react-hooks-not-magic-just-arrays-cd4f1857236e)

- don't call hooks inside loops, conditions or nested functions
- only call hooks from react functions

## how useState work under the hood

1) Initialisation

two empty arrays (state, setters) and a cursor (set to 0)

![img](https://miro.medium.com/v2/resize:fit:1280/format:webp/1*LAZDuAEm7nbcx0vWVKJJ2w.png)

2) First render (page refresh for example)

push state and setters into array and for every push the counter increment

![img2](https://miro.medium.com/v2/resize:fit:1260/format:webp/1*8TpWnrL-Jqh7PymLWKXbWg.png)

3) Subsequent render

reset the cursor and read values for each array

![img3](https://miro.medium.com/v2/resize:fit:1254/format:webp/1*qtwvPWj-K3PkLQ6SzE2u8w.png)

4) Event handling

each setter has a reference to its cursor position, so by calling setter we can change state variable

![img4](https://miro.medium.com/v2/resize:fit:1260/format:webp/1*3L8YJnn5eV5ev1FuN6rKSQ.png)

that's it

now the blog shows a naive implementation not representative of how hooks really works under the hood (pseudocode)

~~~js
let state = [];
let setters = [];
let firstRun = true;
let cursor = 0;

function createSetter(cursor) {
  return function setterWithCursor(newVal) {
    state[cursor] = newVal;
  };
}

// This is the pseudocode for the useState helper
export function useState(initVal) {
  if (firstRun) {
    state.push(initVal);
    setters.push(createSetter(cursor));
    firstRun = false;
  }

  const setter = setters[cursor];
  const value = state[cursor];

  cursor++;
  return [value, setter];
}
~~~

### why never call useState in conditional/loops

~~~js
let firstRender = true;

function RenderFunctionComponent() {
  let initName;
  
  if(firstRender){
    [initName] = useState("Rudi");
    firstRender = false;
  }
  const [firstName, setFirstName] = useState(initName);
  const [lastName, setLastName] = useState("Yardley");

  return (
    <Button onClick={() => setFirstName("Fred")}>Fred</Button>
  );
}
~~~

for the first render everything works fine, the problem appears during subsequent renders, because the first useState is not called again, so the count breaks and there always be inconstinstency

![img5](https://miro.medium.com/v2/resize:fit:1274/format:webp/1*aK7jIm6oOeHJqgWnNXt8Ig.png)

---

# [You might not need an effect](https://react.dev/learn/you-might-not-need-an-effect)

- You don't need Effects to transform data for rendering
- You don't need Effects to handle user events

also <ins>don't use a state</ins> if something can be calculated from existing props or state 

~~~jsx
// INEFFICIENT
function FilteredList({ items }) {
  const [filteredItems, setFilteredItems] = useState(items);

  useEffect(() => {
    setFilteredItems(items.filter(item => item.isImportant));
  }, [items]);

  return <ul>{filteredItems.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}

// EFFICIENT
function FilteredList({ items }) {
  const filteredItems = items.filter(item => item.isImportant);

  return <ul>{filteredItems.map(item => <li key={item.id}>{item.name}</li>)}</ul>;
}
~~~
&nbsp;

<ins>transform data during the rendering</ins>

### How to tell if a calculation is expensive? (when to memoize)

~~~jsx
console.time('filter array');
const visibleTodos = getFilteredTodos(todos, filter);
console.timeEnd('filter array');
~~~

better with [CPU Throttling](https://developer.chrome.com/blog/new-in-devtools-61/#throttling) options from chrome dev tool

> Use Effects only for code that should run because the component was displayed to the user

this is a good approach to app-wide initialization logic

~~~jsx
if (typeof window !== 'undefined') { // Check if we're running in the browser.
   // ✅ Only runs once per app load
  checkAuthToken();
  loadDataFromLocalStorage();
}

function App() {
  // ...
}
~~~

&nbsp;

a lot more things, this article is really awesome.

---


# Escape hatches from react.dev/learn

## Refs

> use **Refs** when you want to remember some information but that information doesn't need to trigger a re-render

that's why they are used to reference HTML standard components (only standard ones, your customs can't be referenced)

if you need to reference multiple elements, let's say in a loop, you can't use **useRef** because you can't put hooks inside loops conditions etc...

one way is to use useRef to get a single ref to the parent element and then use *querySelectorAll*

the most reliable way is to pass a function to the ref attribute (callback)

<ins>you don't want to access with ref.current refs during rendering</ins>

<ins>usually you access refs from event handlers</ins>

~~~jsx
function getMap() {
   if (!itemsRef.current) {
   // Initialize the Map on first usage.
   itemsRef.current = new Map();
   }
   return itemsRef.current;
}

<li
  key={cat.id}
  ref={node => {
    const map = getMap();
    if (node) {
      map.set(cat, node);
    } else {
      map.delete(cat);
    }
  }}
>
~~~

> you can flush the DOM by using **flushSync**, used to instruct react to update the DOM synchronously

<ins>use refs only when you have to step outside of react (focusing/scrolling on elements) and never to modify the DOM manually!</ins>

## Effects

> **Effects** let you specify side effects that are caused by rendering itself (used for synchronization with some external system), rather than by a particular event 

Effects run at the end of a commit after the screen updates (after every render)

### usage of useEffect with browser media API

~~~jsx
import { useState, useRef, useEffect } from 'react';

function VideoPlayer({ src, isPlaying }) {
  const ref = useRef(null);

  if (isPlaying) {
    ref.current.play();  // Calling these while rendering isn't allowed.
  } else {
    ref.current.pause(); // Also, this crashes.
}
~~~

this is not allowed, because you can't play or pause during rendering, since the dom node is not present before the rendering lol + you don't modify the dom during this phase

the solution is simply with an effect:

~~~jsx
useEffect(() => {
    if (isPlaying) {
      ref.current.play();
    } else {
      ref.current.pause();
    }
});
~~~

NEVER DO THIS BELOW (infinite loop) 

~~~jsx
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(count + 1);
});
~~~

there is no external system, that's simple

to skip unnecessary useEffect execution use dependencies in "[ ]"

### nothing vs [ ] vs [a, b]

~~~jsx
useEffect(() => {
  // This runs after every render
});

useEffect(() => {
  // This runs only on mount (when the component appears)
}, []);

useEffect(() => {
  // This runs on mount *and also* if either a or b have changed since the last render
}, [a, b]);
~~~

&nbsp;

the **ref** object, if present in a useEffect, should *almost* never be declared inside the array of dependencies, because refs have stable identity (you'll always get the same object from the same useRef calls). the same applies to set functions of useState.

Strict mode here helps us even with Effects to spot for **cleanup bugs**

~~~jsx
 useEffect(() => {
    const connection = createConnection();
    connection.connect();
    return () => {
      connection.disconnect(); // cleanup
    };
}, []);
~~~

after the cleanup (in development) the right sequence <ins>after a re-mount</ins> should be: **setup → cleanup → setup**

using useEffect to fetch data is not really recommended, there are a lot of things to do for a good result without problems. just use useSWR or react query.


# [back to react.dev/learn](https://react.dev/learn)

these 2 codes are the same thing

**destructuring**
~~~jsx
function Avatar({ person, size }) {
  // ...
}
~~~~

~~~jsx
function Avatar(props) {
  let person = props.person;
  let size = props.size;
  // ...
}
~~~~

---

**props are immutable**, so whenever a prop changes, a new prop object will be passed and js engine will reclaim the memory of the old one

**&& conditional rendering** will return value of its right side if the left side is true

never put numbers on the left side of &&, because there is a boolean conversion by js

> **KEEP COMPONENTS PURE**: don't change obj or var that existed before rendering | same inputs, same output

---

> **Hooks** are special functions that are only available while react is rendering 

can't call hooks in conditions, loops or nested funcs

always call hooks on top level of the component, this might remind you of modules

---

for UI patterns like selection from a big nested structure, keep id or index in state instead of the object itself

flatten the structure if updating deeply nested state is complicated (using [immer](https://immerjs.github.io/immer/))

---

never nest component function definitions because the state will reset like in these 2 photos if you change some nested component

![img-nesting-1](https://react.dev/_next/image?url=%2Fimages%2Fdocs%2Fdiagrams%2Fpreserving_state_diff_same_pt1.dark.png&w=1920&q=75)

![img-nesting-2](https://react.dev/_next/image?url=%2Fimages%2Fdocs%2Fdiagrams%2Fpreserving_state_diff_same_pt2.dark.png&w=1920&q=75)

## Reducer

> convert State to a **Reducer** to simplify states when there are a lot of updates across many event handlers

from these 3 "complex" handlers for the same state

~~~jsx
function handleAddTask(text) {
  setTasks([
    ...tasks,
    {
      id: nextId++,
      text: text,
      done: false,
    },
  ]);
}

function handleChangeTask(task) {
  setTasks(
    tasks.map((t) => {
      if (t.id === task.id) {
        return task;
      } else {
        return t;
      }
    })
  );
}

function handleDeleteTask(taskId) {
  setTasks(tasks.filter((t) => t.id !== taskId));
}
~~~

to this with the reducer pattern

~~~jsx
function handleAddTask(text) {
  dispatch({
    type: 'added',
    id: nextId++,
    text: text,
  });
}

function handleChangeTask(task) {
  dispatch({
    type: 'changed',
    task: task,
  });
}

function handleDeleteTask(taskId) {
  dispatch({
    type: 'deleted',
    id: taskId,
  });
}
~~~

and then write the *reducer function*

~~~jsx
function tasksReducer(tasks, action) {
  switch (action.type) {
    case 'added': {
      return [
        ...tasks,
        {
          id: action.id,
          text: action.text,
          done: false,
        },
      ];
    }
    case 'changed': {
      return tasks.map((t) => {
        if (t.id === action.task.id) {
          return action.task;
        } else {
          return t;
        }
      });
    }
    case 'deleted': {
      return tasks.filter((t) => t.id !== action.id);
    }
    default: {
      throw Error('Unknown action: ' + action.type);
    }
  }
}
~~~

and finally use the hook

~~~jsx
import { useReducer } from 'react';

const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
~~~

there are pros and cons

you can mix reducers and state as you like

## Context

don't always use **Context** to avoid prop drilling etc..

when to use?

- theming (dark/light mode)
- current account
- when building your own router

[combine reducer with context](https://react.dev/learn/scaling-up-with-reducer-and-context) to scale up



# [Rendering](https://ui.dev/why-react-renders)

**view = f(state)**

> rendering is when react calls your ~~function~~ component with the intent of *eventually* updating the view

what happens during rendering?

- react creates a snapshot of the component, which capture everything that react needs to update the view for that specific time (props, state, event handlers and description of the ui)

- takes the description of the ui and uses it to update the view

the initial render will start at the **root** of the application

~~~jsx
import { createRoot } from "react-dom/client";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(<App />);
~~~

now the interesting part about react is the **re-rendering** that adds interactivity etc...

> re-render happens only when the state of a component changes

<ins>how to say that the state of a component changed?</ins>\
basically from the **event handler**, when its invoked, it has access to props and state of the snapshot before, so if the event handler contains an invocation of **useState** AND there is actually a new state, then the re-rendering happens.

## guess the output

~~~jsx
 const [status, setStatus] = React.useState("clean")

  const handleClick = () => {
    setStatus("dirty")
    alert(status)
  }

  return (
    <button onClick={handleClick}>
      {status}
    </button>
  )
~~~

> first clean (the very first snapshot), then dirty for the consequent calls

---

~~~jsx
  console.count("Rendering Counter")
  const [count, setCount] = React.useState(0)

  const handleClick = () => {
    console.count("click")
    setCount(count)
  }
~~~

> click: 1 - click: 2...

there is no click: 0, because react re-render only when the state changes comparing it to the snapshot, and the first state and the snapshot were both 0 at the start

---

other things about **batching**...

> whenever a state changes, react will re-render the component that owns the state AND all of its child components

we can sort of disable this mechanism and allow the re-render only when the child own state changes, we should use **Memo**

if you use **StrictMode** react will re-render 2 times not only 1 (StrictMode only in development mode, because it's used to find common bugs like not mantaining the purity of the function)

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
