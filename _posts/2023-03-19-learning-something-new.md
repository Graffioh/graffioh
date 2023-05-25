---
layout: post
title: Learning something new
tags: [programming, tech, back-end, mobile, swift]
date: 2023-03-19 16:20:00
og_image: https://i.imgur.com/Jqnav0s.jpg
---

I needed to make an iOS App in 1 month with other 5 people from different backgrounds. The focus was to help lawyers network with eachother using an app.

The main feature was an "Assignment board" that a lawyer could use to post assignments, receive requests and send requests for other assignments.

My job was to make the back-end from the ground up and that was a new thing for me (all my projects were offline). 

I will not go too in depth because it's a private project that maybe in future could be published.

So my initial questions were: "Where do I start? What technologies should I use?". I've used C++ for personal projects and PostgreSQL/Java for an (offline) university project, so I had only a vague idea that a DB needs to be deployed online otherwise it would be another offline project :')

Prior to this app I used Firebase for a chat app made in 1 week, it was pretty easy and straightforward with the well written documentation and everything from the back-end already set-up.

Yeah now you are saying: "Well you have only 1 month, you can go with something already built and stable like Firebase, but also Realm or Cloudkit could be good." and guess what I did....Let's learn [Express.js](https://expressjs.com/) and [MongoDB](https://www.mongodb.com/)!

After some research I understood that Express.js is a [Node.js](https://nodejs.org/en) framework and that's a runtime environment for javascript used to run the code like we were using C++, with this we can create a server that act like a bridge between the database and the app.

In 2 days I got all the basic (really really basic) theoretical knowledge about: What is a CRUD app, What is a REST API, Info about Network protocols (HTTP, TCP/IP, DNS, UDP..) and so on. Now it's time to get started!

During my research on Express.js/MongoDB, I stumbled across this gem: [The Net Ninja playlist](https://www.youtube.com/playlist?list=PL4cUxeGkcC9jBcybHMTIia56aV21o2cZ8). Pure gold to build a fast and easy base for our server with also basic MongoDB queries. Additional resources were also: [Coding garden speedrun](https://www.youtube.com/watch?v=EzNcBhSv1Wo), official documentations and a lot of stack overflow.

After the base, the front-end has been connected with the back-end part using Swift API calls, easy peasy lemon squeezy, aaaaand everything was working fine on my machine....*yes, on my machine*.

It's time for new beautiful questions:"Where do I deploy the server? Where do I deploy the database?"

The first answer was [Render.com](https://render.com/) and the second was [MongoDB Atlas](https://www.mongodb.com/atlas/database) (both free tiers, for testing purpose they are fine, but in future it could be better to put the server on cloudflare workers or similar)

{% include figure.html path="assets/img/back-end-arch.PNG" title="img" class="img-fluid rounded z-depth-1" %}

Overall it was a very linear experience, there were some spikes when building advanced queries with MongoDB but it's been a good journey. Of course I didn't build the most scalable solution due to my lack of experience, but it worked, so for now I'm satisfied but also not satisfied. 

In the recent version we also built a Log-In mechanism integrated with Apple Login!

I'm always open to learn new things and to re-invent myself as a software engineer and computer scientist, the curiosity and the willpower is fundamental in our field, the ones that will lack those, are going to fail.





