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
