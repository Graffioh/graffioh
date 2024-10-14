# Chapter I (Foundations of Data Systems)

nowadays apps are data-intensive not compute-intensive, that's why there is so much emphasis on how we manage and improve datas operations performance

databases, caches, queues etc... are the same tools (used to store data) but with different characteristics that make them unique

three concerns that are important in most software systems:

- Reliability
- Scalability
- Maintainability

## Reliability

> continuing to work correctly, even when things go wrong

the things that can go wrong are called **faults** and systems that anticipate faults and can cope with them are called **fault-tolerant** (or resilient) but they can only tolerate a certian types of faults (f.e. imagine a black hole swallowing the entire planet earth and all servers on it, tolerance of this fault would require web hosting in space, impossible due to budget approval...even though YC recently announced some startup who wanted to host data in space or smth like that)

**fault != failure**, where *fault* is usually a component of the system deviating from its spec and a *failure* is when the system is unable to give the required service to the user due to the service that stops working

it seems stupid, but in these fault-tolerant systems it can make sense to increase the rate of fault by triggering them deliberately (so you can test that the system actually works even during natural faults)

this strategy was used by netflix in this article: [Netflix Chaos Monkey](https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116)

### hardware faults

hdd crash, faulty ram, blackout, unplugging the wrong network cable...

redundancy is the key to prevent this (add replicas)

as the data volumes and app computing demands have increased, software fault-tolerance techniques are preferred (or added) to hardware redundancy

### software errors

software faults cause more problems then hardware faults, since hardware faults are most of the time indipendent with eachothers, while software fault can cause many more "chained" failures in comparison

### human errors

humans are unreliable, even with the best intentions.

most of the outages are caused by humans and not software/hardware faults

## Scalability

> cope with increased load

### describing load

load is described by **load parameters**

each system could have different key load parameters used to discuss about scalability

### describing performance

in online systems we care about **response time**

latency = duration that a request is waiting to be handled (is *latent*)

response time = what the client sees (network, queueing and other delays), how long the user needs to wait

if we measure the time using a delta from the start of the operation to the end, we are doing a **coordinated omission** where we basically omit various delays that can occur during the operation

[HdrHistogram](http://hdrhistogram.org) is a good tool to measure latency

if you want to know the typical response time, don't use the mean (average response time) but use the median (with percentiles)

median also known as **p50** (50th percentile)

p95, p99, p999 (95%, 99%, 99.9%) are other common percentiles

amazon focuses on p999 (**tail latency**), because usually the customer with the slowest requests are often those who have made many purchases (a lot of data in their account)

but even for amazon, focusing on p9999 was a lot expensive so they stayed with p999

when several backend calls are needed to serve a request, a single slow request can slow down the entire end-user request

### approaches for coping with load

vertical scaling (more compute) & horizontal scaling (more machines) 

it depends on the system and its load parameters

don't scale up prematurely

## Maintainability

- **operability**: making life easy for operations
- **simplicity**: managing complexity
- **evolvability**: making change easy

# Chapter II (Data Models and Query Languages)

a data model is basically about data storage (relational/document/graph database) and data show/manipulation (json/xml/tables)

## Relational model vs Document model

best known data model today is SQL with relational model

### the birth of noSQL

actually a catchy twitter hashtag for a meetup lol

### the object-relational mismatch

**impedance mismatch** due to the object oriented programming and relational model natures, if data is stored in relational tables, an awkward translation layer is required between the obejct in the code and in the database table/rows/columns

ORM tried to reduce the amount of boilerplate required for the translation layer

JSON models (mongoDB, couchDB etc..) have a better *locality* than multi-table schema of a relational database

### many-to-one and many-to-many relationships

using id for certain fields such as geographic regions or industry names due to easy maintanaibility and avoiding useless duplication since the values are fixed (letting the user choose from a dropdown list)

^ **normalization** that requires many to one relationships (many people live in one particular region or work in one particular industry)

document databases are *join-free* (not rethinkDB), but this is bad if the app start growing and more interconnected features are gonna be added

### are document databases repeating history?

**network data model**: tree/linked list representation, difficult to make changes

the relational model simplified everything that was complicated in the network data model by using simple tables (relations) and rows (tuples)

the difference between document (hierarchical) and relation databases lies in one-to-many relationships, that are within their parent record rather than in a separate table

### relational vs document databases today

it's not possible to say in general which data model leads to simpler code, it depends on the relations in the app

for example:

- many to many relations -> relational
- app with document-like structure -> document
- highly interconnected data -> graph 

document databases schema can be considered **schema-on-read** while relational databases schema can be considered **schema-on-write**

schema-on-read is similar to dynamic type checking whereas schema-on-write is similar to static type checking

the locality advantage of document databases only applies if you need large parts of the document at the same time (like rendering a webpage that needs the entire document content)

it's better to keep document smalls otherwise there will be overhead on data write and retrieval

## Query Languages for Data




















