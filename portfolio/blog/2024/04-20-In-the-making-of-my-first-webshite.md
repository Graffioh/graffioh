<!-- ---
layout: post
title: "In the making of a webshite"
tags: [programming, tech, swe, frontend, backend, js, java]
date: 2024-04-02 00:00:00
og_image:
image:
--- -->

# In the making of my first webshite

## General overview

**Disclaimer**: the goal of this assignment was to provide a good quality software documentation rather than a good quality software.

The assignment was about an auction app, requested by some clients, with specific features, such as: login via credentials and socials, social profile, insert and view auctions of various types (fixed time, english, descending) with images, and notifications.

The frontend can be a mobile application, desktop application, or website.
As for the backend, we have a choice, but with one requirement: we should have used an object-oriented programming language.

I won't talk about everything, for example I will skip the part on requirement engineering, testing and a few other minor things.

## Choices

The choice was a website.

### Frontend

Among all the frameworks, the interest was in learning something useful for the job market, so React was chosen.

After going through the 'Getting Started' section of the React website, it was clear that they suggested using another framework instead of the basic Create React App (CRA), yay more abstraction!! So [Next.js](https://nextjs.org) was chosen as it was the most popular option, even though it's more of a product than a web framework nowadays.

For styling [TailwindCSS](https://taialwindcss.com), because it's cool.

### Backend

As for the backend, [Spring Boot](https://spring.io/projects/spring-boot) was chosen because Java is the enterprise king, and we all love Java...And PostgreSQL for the Database.

### Miscellaneous

Used [Trello](https://www.trello.com) to plan all the work, [Github](https://github.com/Graffioh/dietideals24ucm) to store the code, [Overleaf](https://www.overleaf.com) with LaTeX to write documentation and a little bit of LLMs to not feel alone ;)

#### Git workflow
Simple git workflow where there is a main branch for production, dev branch for development and branches for every features.

## The starting point

Started prototyping the frontend using Figma and the [shadcn/ui](https://ui.shadcn.com) design components template. There was no struggle with Figma so far because I had already used it during my time at the Apple Developer Academy, so it wasn't a big issue.

After creating acceptable screen prototypes, everything was transposed to the Next.js frontend. Approximately a month and a half was spent on creating the frontend, learning React/Next.js, website best practices and completing other exams, after which the frontend was ready.

Of course, the website was chosen also because it's portable; the browser can be accessed everywhere. For a good website, there needs to be a mobile-optimized version as well, and thanks to TailwindCSS, it wasn't a big problem.

Now it's time for the backend!

Backend was a collection of REST API Controllers with simple CRUD operations.

There were two things that needed a little more attention, due to my inexperience and skill issue:

- _Authentication_
- _Auction timer_

### Authentication

Never handled auth till now, so some solutions were found: NextAuth.js, Clerk or simple auth from scratch. Of course the simple auth from scratch is the smarter and only solution.

It was implemented using JWT tokens and a little bit of Spring boot security for OAuth2 (Social logins). I spent a whole week learning about all of these things, with cookies and web policies, but after all, it was easy.

### Auction timer

It needed to be "real-time".

For English and Descending auctions was similar with some variations. Basically, after the timer was set, it needed to decrease until the end, but with some caveats:

- _English_: Every time a new offer was placed, the timer needed to reset. If the timer finished without new offers, then the auction was over.

- _Descending_: The timer would run until the end, then restart and decrement the offer by the set decrement amount. The first bidder to place an offer would win the auction.

For the last auction type

- _Fixed Time_: it was a simple timer. When it arrived at the end, the best offerer would get the auction.

The decision was made to manage the Fixed Time auction timer sort of "frontend-wise", by calculating how much time was left client-side. Only when the timer finished, a request to the backend was made to set the attribute "isOver" for that auction to true.

However, for the English and Descending auctions, as they needed to be real-time, a client-side approach was not an option. Instead, the timer was handled with a scheduled task backend-wise. While this solution may not be the most optimal for scaling, it worked.

## Deployment

The frontend is deployed on Vercel, even though i could've dockerized it and deployed anywhere else, but not worth it imho.

For testing purpose the Spring boot app was deployed on [Render](https://render.com) and for the db [Neon](https://neon.tech) was used.

For production, everything is managed with AWS and Docker;
Elastic Container Service ([ECS](https://aws.amazon.com/en/ecs/)) for Spring boot app, Simple Storage ([S3](https://aws.amazon.com/en/s3/)) for handling images and Relational Database Service ([RDS](https://aws.amazon.com/en/rds/)) for PostgreSQL db

![system-design-diagram](https://imgur.com/CAERKBO.jpg)

### AWS

I'll open a little section about AWS, because...well it's a mess, that's it, no more to say.

## Closing thoughts

Everything is possible till you recognize your skill issues and work to overcome them.

It was fun developing it, using javascript/typescript will give you the freedom to do everything, even if not in the most performant way, but it's really versatile. After all javascript rules the world.
