# [resource repo](https://github.com/leonardomso/33-js-concepts?tab=readme-ov-file#1-call-stack)

javascript is single threaded single concurrent language

## Call stack

present inside the javascript engine together with the heap

LIFO

single call stack because single threaded

is a mechanism for the js interpreter to keep track of function calls (what function is being run and what functions are called from within that function...)

usual call stack thing, notihing js specific


## Value vs Reference in js

primitive types by value

Array - Function - Object by reference (all called Objects)

pure functions are function that are individual, don't alter anything in outer scope.

.map and .filter are pre functions because they copy the array without altering the original array

then nothing else js specific


## Javascript Coersion

it exists because js is a weakly-typed language

- explicit: c casting - (int) (char) ...
- implicit: automatic casting

always use === (of course)

## () => {} vs function() {}

**() => {}**

- you can declare anonymous functions
- not hoisted
- used to avoid 'polluting' the global scope
- used in callbacks when the function doesn't need to be available to the entire application

**function() {}**

- used if you want to create a function on the global scope

## IIFE functions

~~~js
!function() {
    alert("Hello from IIFE!");
}();
~~~

that's a one time alert, so IIFE are functions declared and executed in the same line basically and then die

there are different variations of IIFE

## Event loop 

[goat blog post](https://www.lydiahallie.com/blog/event-loop) from [lydia hallie](https://www.youtube.com/@theavocoder)

![event-loop-gif](https://res.cloudinary.com/dq8xfyhu4/video/upload/s--sZ6uzDo8--/eo_7,so_3/v1712236281/Screen_Recording_2024-04-04_at_8.11.05_AM_ldumcm.mp4)

since js is single threaded, there needs to be a mechanism to handle async functions other than WEB API ones; here comes the help of the **event loop**

### Event loop purpose

> needs to check if the call stack is empty and then move tasks from task/microtask queue to call stack

### Task queue

the **task queue (or callback queue)** is responsible to hold various tasks such as WEB API callbacks and event handlers

### setTimeout

the settimeout delay is related to the delay whenever the callback get passed in the task queue not the call stack.\
so if the callstack is not empty, then the settimeout delay is not the effective delay.

### Working with promises and Microtask queue

for promises there is no more the task queue, instead **microtask queue** is used

**<ins>THE EVENT LOOP PRIORITISE THE MICROTASK QUEUE OVER TASK QUEUE</ins>**

## Execution context [video](https://www.youtube.com/watch?v=zdGfo6I1yrA)

> execution context define the environment in which the code is executed

uses environment records to keep track of the variables

there are 2 phases within the **global execution context**:

- Creation
- Execution

3 main components: **Realm**, **LexicalEnvironment**, **VariableEnvironment**

> **Realm** is an isolated environment in which our code run

a new realm is created whenever:

- a new tab is opened, 
- the browser is refreshed, 
- using web workers 
- and so on...

> **Lexical environment** and **Variable environment** both points to the **Global environment record** present in the Realm

the **hoisting** happens during the creation phase

## setTimeout 

the max delay for setTimeout depends on the environment, but usually is 2^31 - 1 = 24.85 days

if you need a delay bigger than this you should consider other approaches

## Classes

> **classes** are a syntactic sugar over existing prototype based inheritance

js is all about functions

### func constructor

so the constructor here is something like this

~~~js
function Vehicle(make, model, color) {
        this.make = make,
        this.model = model,
        this.color = color,
        this.getName = function () {
            return this.make + " " + this.model;
        }
}

let car = new Vehicle("Toyota", "Corolla", "Black");
let car2 = new Vehicle("Honda", "Civic", "White");
~~~

all good but the problem here is that for every new instance the methods are copied and if you wanna add a new attribute you need to modify the function.

### prototype

> **prototype** is a default property of a function

it has a constructor function and a _\_proto_\_ object

the proto object is called *dunder proto* and points to the prototype property of the function

this prototype object can be used to add new attributes and method

~~~js
car.prototype.year = "2016";
~~~

^ but this change is only related to that car object and not for car2, car3 ... carn

while **reference type properties** are shared among all instances

### now to classes

> classes in js are basically a combination of constructor function and prototype

~~~js
class Vehicle {
    constructor(make, model, color) {
        this.make = make;
        this.model = model;
        this.color = color;
    }

    getName() {
        return this.make + " " + this.model;
    }
}
~~~

then usual things for classes in most PL


