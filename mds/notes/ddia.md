# Chapter I (Foundations of Data Systems)

nowadays apps are data-intensive not compute-intensive, that's why there is so much emphasis on how we manage and improve datas operations performance

databases, caches, queues etc... are the same tools (used to store data) but with different characteristics that make them unique

three concerns that are important in most software systems:

- Reliability
- Scalability
- Maintainability

## Reliability

> continuing to work correctly, even when things go wrong

the things that can go wrong are called **faults** and systems that anticipate faults and can cope with them are called **fault-tolerant** (or resilient) but they can only tolerate a certain types of faults (f.e. imagine a black hole swallowing the entire planet earth and all servers on it, tolerance of this fault would require web hosting in space, impossible due to budget approval...even though YC recently announced some startup who wanted to host data in space or smth like that)

**fault != failure**, where *fault* is usually a component of the system deviating from its spec and a *failure* is when the system is unable to give the required service to the user due to the service that stops working

it seems stupid, but in these fault-tolerant systems it can make sense to increase the rate of fault by triggering them deliberately (so you can test that the system actually works even during natural faults)

this strategy was used by netflix: [Netflix Chaos Monkey](https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116)

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

### the birth of noSQL

actually a catchy twitter hashtag for a meetup lol

### the object-relational mismatch

**impedance mismatch** due to the object oriented programming and relational model natures, if data is stored in relational tables, an awkward translation layer is required between the object in the code and in the database table/rows/columns

ORM tried to reduce the amount of boilerplate required for the translation layer

**document models**/JSON models (mongoDB, couchDB etc..) have a better *locality* than multi-table schema of a relational database

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

document databases -> **schema-on-read** (assimilable to dynamic type checking)\
relational databases -> **schema-on-write** (assimilable to static type checking)

schema-on-read is similar to dynamic type checking whereas schema-on-write is similar to static type checking

the locality advantage of document databases only applies if you need large parts of the document at the same time (like rendering a webpage that needs the entire document content)

it's better to keep document smalls otherwise there will be overhead on data write and retrieval

## Query Languages for Data

relational model uses declarative language, where you just specify the pattern of the data you want, what condition the results must meet and how you want the data to be transformed (sorted, grouped...) but not **HOW** to achieve that goal

other models uses an imperative language that is the opposite

with declarative database engines can make performance changes without impacting the language, since it's not imperative

declarative are preferred for parallel programming since they specify only the pattern of the results not the whole algorithm used

### declarative queries on the web

html and css -> declarative\
javascript manipulating the dom -> imperative

## Graph-Like Data Models

if in the app are presents a lot of many-to-many relations and the connections between data become more complext, it becomes natural to start modeling your data as a *graph*

we can thing of a graph store as consisting of two relational tables:

~~~sql
CREATE TABLE vertices (
	vertex_id integer PRIMARY KEY,
	properties json
);

CREATE TABLE edges (
	edge_id integer PRIMARY KEY,
	tail_vertex integer REFERENCES vertices (vertex_id), # where the edge starts
	head_vertex integer REFERENCES vertices (vertex_id), # where the edge ends
	label text,
	properties json
);

CREATE INDEX edges_tails ON edges (tail_vertex);
CREATE INDEX edges_heads ON edges (head_vertex);
~~~

any vertex can have an edge to any other vertex

really "evolvable"

the id is used to refer directly to a particular vertex or edge, so the traverse is optional in this case

### triple-stores model

information stored in the form of three parts statements: (*subject, predicate, object*)

example: (Jim, likes, bananas)

# Storage and Retrieval

it's important to understand, as a developer, which storage engine is appropriate for the application

*log-structured* and *page-oriented* storage engines

storage engines optimized for transactional workloads or analytics?

## Data Structures That Power Your Database

a **log** is an append-only sequence of records

a lot of dbs internally use a log

an **index** is an additional structure that is derived from the primary data for faster info retrieval (keep some additional metadata on the side which acts as a signpost)

well-chosen indexes speed up read queries but every index slows down writes

indexes for key-value data are the most common ones (but not the only)

### hash indexes

in-memory hash map

used in Bitcask, storage engine, that offers high-performance reads and writes, but all the keys needs to fit in the available RAM

well suited for situations where the value for each key is updated frequently and there are not too many different keys

when using logs, how do we avoid running out of disk space? basically using **compaction** for data segments, means throwing away duplicate keys in the log and keeping only the most recent update for each key in the segments

before doing compaction on the segments, its usually a common practice to also **merge** multiple segment and the compact them

a lot of problems with hash indexes:

- when deleting a record a *tombstone* (special deletion record) needs to be appended
- if the db is restarted, in-memory hash maps are lost, so bitcask speeds up recovery by storing a snapshot of each segment hash map on disk
- db crash causing a corrupted record to be appended to the log, Bitcask files include checksums to ignore those records

and so on...














