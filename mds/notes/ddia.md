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

### Hardware faults

hdd crash, faulty ram, blackout, unplugging the wrong network cable...

redundancy is the key to prevent this (add replicas)

as the data volumes and app computing demands have increased, software fault-tolerance techniques are preferred (or added) to hardware redundancy

### Software errors

software faults cause more problems then hardware faults, since hardware faults are most of the time indipendent with eachothers, while software fault can cause many more "chained" failures in comparison

### Human errors

humans are unreliable, even with the best intentions.

most of the outages are caused by humans and not software/hardware faults

## Scalability

> cope with increased load

### Describing load

load is described by **load parameters**

each system could have different key load parameters used to discuss about scalability

### Describing performance

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

### Approaches for coping with load

vertical scaling (more compute) & horizontal scaling (more machines) 

it depends on the system and its load parameters

don't scale up prematurely

## Maintainability

- **operability**: making life easy for operations
- **simplicity**: managing complexity
- **evolvability**: making change easy

# Chapter II (Data Models and Query Languages)

a data model is basically about data storage (relational/document/graph database) and data show/manipulation (json/xml/tables)

### The birth of noSQL

actually a catchy twitter hashtag for a meetup lol

### The object-relational mismatch

**impedance mismatch** due to the object oriented programming and relational model natures, if data is stored in relational tables, an awkward translation layer is required between the object in the code and in the database table/rows/columns

ORM tried to reduce the amount of boilerplate required for the translation layer

**document models**/JSON models (mongoDB, couchDB etc..) have a better *locality* than multi-table schema of a relational database

### Many-to-one and many-to-many relationships

using id for certain fields such as geographic regions or industry names due to easy maintanaibility and avoiding useless duplication since the values are fixed (letting the user choose from a dropdown list)

^ **normalization** that requires many to one relationships (many people live in one particular region or work in one particular industry)

document databases are *join-free* (not rethinkDB), but this is bad if the app start growing and more interconnected features are gonna be added

### Are document databases repeating history?

**network data model**: tree/linked list representation, difficult to make changes

the relational model simplified everything that was complicated in the network data model by using simple tables (relations) and rows (tuples)

the difference between document (hierarchical) and relation databases lies in one-to-many relationships, that are within their parent record rather than in a separate table

### Relational vs document databases today

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

### Declarative queries on the web

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

### Triple-stores model

information stored in the form of three parts statements: (*subject, predicate, object*)

example: (Jim, likes, bananas)

# Chapter III (Storage and Retrieval)

it's important to understand, as a developer, which storage engine is appropriate for the application

*log-structured* and *page-oriented* storage engines

storage engines optimized for transactional workloads or analytics?

## Data Structures That Power Your Database

a **log** is an append-only sequence of records

a lot of dbs internally use a log

an **index** is an additional structure that is derived from the primary data for faster info retrieval (keep some additional metadata on the side which acts as a signpost)

well-chosen indexes speed up read queries but every index slows down writes

indexes for key-value data are the most common ones (but not the only)

### Hash indexes

in-memory hash map where the key is mapped to the byte offset of where the data is located

used in Bitcask, storage engine, that offers high-performance reads and writes, but all the keys needs to fit in the available RAM

well suited for situations where the value for each key is updated frequently and there aren't too many different keys

when using logs, how do we avoid running out of disk space?\ 
when a certain log size is reached, we use **compaction**, means throwing away duplicate keys and keeping only the most recent update for each key in the segments

its usually a common practice to also **merge** multiple segment while compacting, since compaction create smaller segments

a lot of problems with hash indexes:

- when deleting a record a *tombstone* (special deletion record) needs to be appended
- if the db is restarted, in-memory hash maps are lost, so bitcask speeds up recovery by storing a snapshot of each segment hash map on disk
- db crash causing a corrupted record to be appended to the log, Bitcask files include checksums to ignore those records

append-only design turns out to be good for several reasons:

- appending and segment merging are sequential write operations, much faster than random writes, especially on magnetic spinning-disk hard drives (but also preferable on ssd)
- concurrency and crash recovery much simpler since it's append-only/immutable, no consistency issues

but hash index also has limitations:

- must fit in memory (RAM)
- range queries not efficient (scanning over all keys between kitty00000 and kitty99999)

### SSTables and LSM-trees

in **Sorted String Table** we basically require that the sequence of key-value pairs is *sorted* by key in the segment files

we also require that each key only appears once within each merges segment file (the compaction process ensures that)

advantages over log segments with hash indexes:

- merging segments is simple and efficient, the approach is like the one used in the *mergesort* algo (start reading input files side by side -> look at the first key in each file -> copy the lowest key to the output file -> repeat). when multiple segments contain the same key, we can keep the value from the most recent segment and discard the values in older segments since the values are written to the database during some period of time.
- in order to find a particular key in the file it's no longer needed to keep an index of all the keys in memory. just store one key every few kilobytes since the keys are sorted and if you want to find let's say the key 69, we'll start from the key where the index is the most close to 69  
- grouping records before writing it to disk, every few kilobytes so the index needs to point at the start of each group, saving disk space and reducing I/O bandwidth use

#### constructing and maintaining sstables (lsm-tree)

to maintain sorted structure in memory is easy, just use avl or rb trees

this in-memory tree is sometimes called a **memtable**

when the memtable gets bigger than some threshold (typically a few mb), write it out to disk as an sstable file

this new sstable file becomes the most recent segment of the database

in order to serve a read request, first try to find the key in the memtable, then most recent ondisk segment, then next-older segment and so on...

but there is a problem: if the databse crashes, the most recent writes (that are in the memtable and not yet in the db) are lost

to avoid this, just store a separate log on disk (even not sorted) just to restore the memtable when the crash happens

this algo and indexing structure described in the previous section is called **LSM-Tree** (*log-structured merge-tree*)

#### performance optimizations

lsm-tree algo can be slow when looking up keys that do not exist in the db: you have to check the memtable, then the segments all the way back to the oldest before making sure that the key doesn't exist

to optimize this, storage engines use **Bloom filters** that it's used to approximate the contents of a set and it can tell if the key appear or not in the db

there are also different strategies to determine the order and timing of how sstables are compacted and merged (*size-tiered* and *leveled* compaction)

the basic idea of lsm-trees (keeping a cascade of sstables that are merged in the background) is simple and effective even when the dataset gets bigger and bigger

### B-trees

the most widely used indexing structure is the **B-tree**

b-tree have a small similarity with SSTables, kv pairs sorted by key, but that0s it

the approach we saw earlier break the database down into variable-size segments, while, b-trees break the database down into *fixed-size blocks/pages* (4KB, just like pages in OS memory), and read/write 1 page at a time

eah page is identified using an address (reference), similar to a pointer, but on disk instead of in memory

and is split in "ranges"

at the root level, there is page, where the lookup starts

at the leaf level, there are the actual values

a four-level tree of 4KB pages, with a branching factor of 500, can store up to 256TB


#### making b-trees reliable

the basic write operation here is to overwrite a page on disk (hardware operation) with new data, while, with lsm-trees and similar, we only append to files but never modifies them in place

in order to make the database resilient to crashes, we inlcude an additional data structure in disk: **write-ahead log** (WAL or *redo log*)

append-only file to which every b-tree modification must be written before it can be applied to the pages of the tree itself

also be careful about concurrency control, if multiple threads are going to access the b-tree at the same time

in this case, **latches** are used (lightweight locks)

#### b-tree optimizations

- instead of WAL, some dbs uses a copy-on-write scheme, also useful for concurrency control
- save space in pages by not storing the entire key, but abbreviating it
- pages can be positioned anywhere on disk and this layout can be not efficient, that's why many btrees implementations try to lay out the tree so that leaf pages appear in sequential order (lsm-trees does that)
- additional pointers, which allows scanning keys in order without jumping back to parent pages
- btrees variants, *fractal trees*, borrow log-structured ideas to reduce disk seeks (nothing to do with math fractals btw)

### Comparing b-trees and lsm-trees











