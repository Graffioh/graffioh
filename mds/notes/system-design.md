# System design interview approach

4 steps:

## Outline use cases, constraints and assumptions

- who is going to use it
- how are they going to use it
- how many users
- what does the system do
- what are inputs and outputs of the system
- how much data do we expect to handle
- how many requests per second
- what is the read/write ratio

## Create a high level design

- Sketch main components and connections
- Justify ideas

## Design core components

Dive into details for each core component

## Scale the design

From the high level to a more detailed design where we identify and address bottlenecks

for example if we need to address scalability issues, then we are going to take in considerations things such as load balancer, horizontal scaling, caching and database sharding.

## Remember: calculations are important

> [Back-of-the-envelope](https://highscalability.com/google-pro-tip-use-back-of-the-envelope-calculations-to-choo/) calculations are estimates you create using a combination of though experiments and common performance numbers to get a good feel for which designs will meet your requirements

created by Google, adviced by Jeff Dean

### Power tables

~~~js
Power           Exact Value         Approx Value        Bytes
---------------------------------------------------------------
7                             128
8                             256
10                           1024   1 thousand           1 KB
16                         65,536                       64 KB
20                      1,048,576   1 million            1 MB
30                  1,073,741,824   1 billion            1 GB
32                  4,294,967,296                        4 GB
40              1,099,511,627,776   1 trillion           1 TB
~~~

### Latency numbers

~~~py
Latency Comparison Numbers
--------------------------
L1 cache reference                           0.5 ns
Branch mispredict                            5   ns
L2 cache reference                           7   ns                      14x L1 cache
Mutex lock/unlock                           25   ns
Main memory reference                      100   ns                      20x L2 cache, 200x L1 cache
Compress 1K bytes with Zippy            10,000   ns       10 us
Send 1 KB bytes over 1 Gbps network     10,000   ns       10 us
Read 4 KB randomly from SSD*           150,000   ns      150 us          ~1GB/sec SSD
Read 1 MB sequentially from memory     250,000   ns      250 us
Round trip within same datacenter      500,000   ns      500 us
Read 1 MB sequentially from SSD*     1,000,000   ns    1,000 us    1 ms  ~1GB/sec SSD, 4X memory
HDD seek                            10,000,000   ns   10,000 us   10 ms  20x datacenter roundtrip
Read 1 MB sequentially from 1 Gbps  10,000,000   ns   10,000 us   10 ms  40x memory, 10X SSD
Read 1 MB sequentially from HDD     30,000,000   ns   30,000 us   30 ms 120x memory, 30X SSD
Send packet CA->Netherlands->CA    150,000,000   ns  150,000 us  150 ms

Notes
-----
1 ns = 10^-9 seconds
1 us = 10^-6 seconds = 1,000 ns
1 ms = 10^-3 seconds = 1,000 us = 1,000,000 ns
~~~


# Intro to system design/distributed systems

resources:
- [video](https://www.youtube.com/watch?v=MbjObHmDbZo)
- [blog post](https://lethain.com/introduction-to-architecting-systems-for-scale/)

> A **distributed system**, also known as distributed computing, is a system with multiple components located on different machines that communicate and coordinate actions in order to appear as a single coherent system to the end-user.

main charateristics of distributed systems:

- no shared clock (if clocks gets out of sync they will cause a **clock-drift**, time travel)
- no shared memory
- shared resources (so they need to be able to communicate)
- concurrency and consinstency

and what are the benefits?

- more reliable, fault tolerant (no single point of failure)
- scalability
- lower latency, increased performance
- cost effective (don't buy a single large machine, just buy a lot of cheap machines spread across the globe for example)

## Performance metrics

- **Scalability** (ability of a system to grow and manage increased traffic)
- **Reliability** (probability a system will fail during a period of time,hard to define)\
to measure this we can use **MTBF** (mean time between failure)\
MTBF = (total elapsed time - total downtime) / number of failures
- **Availability** (amount of time a system is operational during a period of time, requiring downtime for updates is bad)\
Availability % = (available time / total time) * 100
- **Efficiency** (how well the system performs, metrics with **latency** and **throughput**)
- **Manageability** (speed and difficulty involved with maintaining the system)

if a system is 100% reliable then it will be for sure 100% available, because is never gonna break

> if a plane is in the air, you want it to be 100% reliable.

## Latency

![latency-img](https://imgur.com/2YXjxXH.jpg)

key takeaways

- avoid network/db calls whenever possible (really slow)
- replicate data across data centers for disaster recovery or performance
- use CDN (content distribution network) to reduce latency
- cache a lot

## map reduce by google explained simple
> is a technique used when you need to do big calculations based on a lot of different datas that are stored in different servers. just let the servers do the calculations for their own stored datas and then send the results to the "main" server that will put everything together and will give the end result

## useful calculations

### Time

- 60 seconds * 60 minutes = 3600 seconds per hour
- 3600 x 24 hours = 86.400 seconds per day
- 86.400 * 30 days = 2.500.000 seconds per month

### Traffic estimates

- average daily active users * average reads/write per user

### Memory

- read request per day * average request size * .2

### Bandiwidth

- requests per day * request size

### Storage

- writes per day * size of write * time to store the data

## Horizontal vs Vertical scaling

### vertical

if your server is running slow, just get a bigger and more performant server 

upgrade a specific area of the server that is going slow (cpu/memory/io/bandwidth)

- easy
- limit to scalability
- single point of failure


is limited, after a threshold it's useless to upgrade (a lot of money for small performance boost)

![graph-img](https://imgur.com/M8GQlev.jpg)

### horizontal

 if your server is running slow, just get more servers that can scale up/down

- more complex, but more efficient long term
- redundancy built in *(the duplication of critical components (web server, database server, etc.) to increase reliability and availability)*
- need load balancer to distribute traffic
- cloud providers make this easier

kubernetes, docker, hadoop deals with horizontal scaling

![graph-img2](https://imgur.com/cO5ntx7.jpg)

## Load balancers

nginx, haproxy, f5, citrix

- balance incoming traffic to multiple servers
- sw or hw based
- improve reliability and scalability

### routing methods

- round robin (simple, uneven traffic because of different types of datas)
- least connections (based on num of client connections, useful for chat or streaming apps)
- least response time (based on how quickly servers respond)
- ip hash (based on IP, useful for stateful sessions)

### types of load balancers (l4 vs l7)

**Layer 4**

- only has access to tcp and udp data
- faster
- lack of information = uneven traffic

it's good on the edge of a data center/network because it can look and spot bad actors/ddos attacks

usually thanks to this, a lot of data centers will first route all the incoming traffic to a l4 lb before allowing it to go through the whole application

**Layer 7**

- full access to http protocol and data
- ssl termination
- check for authentication
- smarter routing options
- more CPU intensive

active and passive lb if the active goes down

## Caching

- improve performance of app
- save money $$$

usual cache stuffs

pseudo code of hashtable caching (redis)

- **reading**
~~~py
def app_req(tweet_id):
	cache = {}

	data = cache.get(tweet_id)

	if data:
		return data
	else:
		data = db_query(tweet_id)
		cache[tweet_id] = data
		return data
~~~

- **writing**
~~~py
def app_update(tweet_id, data):
	cache = {}

	db_update(data)

	// remove stale data
	cache.pop(tweet_id)
~~~

active and passive cache if the active goes down, both cache needs to have the same datas

### cache eviction

- prevent stale data
- cache only most valuable data to save resources

**ttl** used to prevent stale data, after a time period, the cache entry is deleted

**LRU/LFU**, used to save only most valuable resources, least recently used/least frequently used

### Thundering herd by facebook

something related to cache eviction is a case study by facebook called **thundering herd**, is based on a problem that they had.

basically whenever a post is updated, the cache needs to refresh the data, but at the same time there were 1000+ requests where they requested data that is gonna be deleted, so the solution was to have an old-data cache and a new data-cache

## Database scaling

most apps are very **read** heavy

### Basic scaling techniques

- **indexes**\
	index based on column to speed up look-up.\
	speed up read performances, writes and updates become slightly slower, more storage required
- **denormalization**\
	add redundant data to tables to reduce joins.\
	boosts read performance, slows down writes, risk inconsistent data across tables
- **connection pooling**\
	allow multiple app threads to use the same db connection.\

- **vertical scaling**\
	just get a bigger server.
- **caching**

### Advanced techniques

**Replication** 

- create replica servers to handle reads
- master server dedicated only to writes
- hard to create/mantain

**Partitioning**

2 types:

- sharding (horizontal partitioning, same schema but split across multiple DBs)
- vertical partitioning (dividing schema into separate tables, generally by functionality)

## Async power

![async-img](https://github.com/donnemartin/system-design-primer/raw/master/images/54GYsSx.png)

reduce request time for expensive operations, without doing them in-line

also called **off-line processing**

### Message queues

> **message queues** receive, hold and deliver messages

the user is not blocked and the job is processes in the background

for example: posting a tweet, the tweet could be instantly posted but in reality it could take some time before your tweet is actually delivered to all of your followers.

if the queues start to grow significantly it could results in cache misses, disk reads and slower performance

it comes in help **back pressure** that can help limiting the queue size

### Task queues

> **task queue** is a specialized type of message queue, that is used specifically for distributing and processing tasks or job, so units of work

## CDN (Content distribution networks)

"is a particular kind of cache"

used to serve large amounts of static media based on geographic position

![cdn-img](https://cf-assets.www.cloudflare.com/slt3lc6tev37/7Dy6rquZDDKSJoeS27Y6xc/4a671b7cc7894a475a94f0140981f5d9/what_is_a_cdn_distributed_server_map.png)

## A new layer between web server and the database

separating out the web layer from the application layer (or platform layer) allows you to scale and configure both layers independently.

for example adding a new API results in adding application servers without necessarily adding additional web servers. 
this app/platform server can be basically **microservices**, which are a suite of indipendetly deployable small modular services. where each service runs a unique process

this of course will add complexity in terms of deployments and operations

![meme1](https://programmerhumor.io/wp-content/uploads/2023/09/programmerhumor-io-backend-memes-linux-memes-6b3eccb82753699.jpg)

