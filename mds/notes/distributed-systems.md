# [Intro to system design/distributed systems](https://www.youtube.com/watch?v=MbjObHmDbZo)

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

- easy
- limit to scalability
- single point of failure

upgrade a specific area of the server that is going slow (cpu/memory/io/bandwidth

is limited, after a threshold it's useless to upgrade (a lot of money for small performance boost)

![graph-img](https://imgur.com/M8GQlev.jpg)

### horizontal

 if your server is running slow, just get more servers that can scale up/down

- more complex, but more efficient long term
- redundancy built in
- need load balancer to distribute traffic
- cloud providers make this easier

kubernetes, docker, hadoop deals with horizontal scaling

![graph-img2](https://imgur.com/cO5ntx7.jpg)

## Load balancers




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
