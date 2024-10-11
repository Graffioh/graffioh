# chapter I

nowadays apps are data-intensive not compute-intensive, that's why there is so much emphasis on how we manage and improve datas operations performance

databases, caches, queues etc... are the same tools (used to store data) but with different characteristics that make them unique

three concerns that are important in most software systems:

- Reliability
- Scalability
- Maintainability

## Reliability

> continuing to work correctly, even when things go wrong

the things that can go wrong are called **faults** and systems that anticipate faults and can cope with them are called **fault-tolerant** (or resilient) but they can only tolerate a certian types of faults (f.e. imagine a black hole swallowing the entire planet earth and all servers on it, tolerance of this fault would require web hosting in space, impossible due to budget approval...even though YC recently announced some startup who wanted to host data in space or smth like that)

**fault != failure**, where *fault* is usually a component of the system deviating from its spec and a *failure* is when the system is unable to give the required service to the user

it seems stupid, but in these fault-tolerant systems it can make sense to increase the rate of fault by triggering them deliberately (so you can test that the system actually works even during natural faults)

this strategy was used by netflix in this article: [Netflix Chaos Monkey](https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116)









