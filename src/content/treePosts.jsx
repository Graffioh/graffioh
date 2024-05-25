const treePosts = {
  children: [
    {
      name: "aboutme.md",
      path: "aboutme.md",
      content: `# About me

I'm Umberto, 21 years old from Italy, Computer Science student.

I'll be sharing my journey in the CS field, my personal thoughts and technical stuffs.

![griffith-castle](https://imgur.com/eSaFXnQ.jpg)
    `,
      children: [],
    },
    {
      name: "contacts.md",
      path: "contacts.md",
      content: `# Contacts
+ [X](https://x.com/graffioh)
+ [github](https://github.com/graffioh)
+ [discord](http://discordapp.com/users/165500587109122049)
+ [linkedin](https://www.linkedin.com/in/umberto-breglia/)
    `,
      children: [],
    },
    {
      name: "projects.md",
      path: "projects.md",
      content: `## DietiDeals24

Auction site assignment for software engineering university class (Next.js, Spring boot, PostgreSQL, AWS ECS, AWS RDS, AWS S3)

[github repo (with demo)](https://github.com/Graffioh/dietideals24ucm) | [website link](https://dietideals24.vercel.app)

## Hivemind (WIP)

Simple social network for web technologies class (Typescript, React + Vite, Go, PostgreSQL)

[github repo](https://github.com/Graffioh/hivemind)

## Pontus

iOS app for lawyers, make them network in an easy and fast way for judicial substitution (Swift, Express.js, MongoDB, Render)

[demo](https://www.youtube.com/watch?v=eavKse5ax44&feature=youtu.be)

## ScoutThis

iOS app for photographers and location scouts, keep track of locations and equipments with photos and notes (Swift)

## PhotoEditAppClone

iOS app to edit photos, made most of the tools from scratch for learning purpose (Swift)

[github repo (with demo)](https://github.com/Graffioh/PhotoEditAppClone)

## ArcAim

Arcade aim game (C++)

[github repo (with demo)](https://github.com/Graffioh/ArcAim)

## Other minor projects

[AirChat](https://github.com/Graffioh/AirChat) | [LaboratorioScientificoUCM](https://github.com/Graffioh/LaboratorioScientificoUCM)
    `,
      children: [],
    },
    {
      name: "blog",
      path: "blog/",
      content: "",
      children: [
        {
          name: "2022",
          path: "blog/2022/",
          content: "",
          children: [
            {
              name: "06-07-the-journey-so-far.md",
              path: "blog/2022/06-07-the-journey-so-far.md",
              content: `<!-- ---
layout: post
slug: journey-1
title: The journey so far
tags: [game-hacking, reversing, journey]
date: 2022-06-06 15:00:00
--- -->

# The journey so far

The focus of this journey is to get a good understanding of how an anti-cheat work and how to develop it especially for FPS games.

Even though I have university, I preferred to do a "side" project instead of studying only for the exams, because **for me**, if you will graduate without any side project, you wont get very far.

So lets begin!

I started with tutorials on [Cheat Engine](https://cheatengine.org/), a powerful memory tool for game hackers that is really straightforward.

From there I got a lot of knowledge, from the basic memory concepts to assembly and reverse engineering.

After having a good level of confidence with CE (Cheat engine), I started to look for cheat forums as I wanted to go more in depth with External/Internal Cheats.

I stumbled across [Unknown Cheats](https://www.unknowncheats.me/forum/index.php) and [Guided Hacking](https://guidedhacking.com/). I saw that Guided Hacking changed during the time, it was completely free, but now you need to donate like 15 euros to view posts and download sources.

I wasn't really into it, I didn't want to spend money for things that you can actually learn for free in these days, so I went for Unknown Cheats.

There I started basic external tutorials, with Windows API, in concomitance with [Windows Internals](https://www.amazon.com/Windows-Internals-Part-architecture-management/dp/0735684189/ref=sr_1_1?crid=VCH9SCIRFZDR&keywords=windows+internals+part+1&qid=1654597554&s=books&sprefix=windows+internals+part%2Cstripbooks-intl-ship%2C140&sr=1-1), a really great book by Pavel Yosifovich.

I really liked studying these things, so I decided to donate to Guided Hacking for a yearly subscription, as they had a really good "path" to follow.

![spongebob](https://imgur.com/fF1GAX4.jpg)

After some experience with External cheats and C++, I went into Internal Cheats as I liked it more, yeah....I like pointers.

In addition to getting experience with Internal Cheats and C++, I started using [REClass.NET](https://github.com/ReClassNET/ReClass.NET/tree/96b36cf7a97d41863b6d75098f681615884d55f7), debuggers like [x64dbg](https://x64dbg.com/) and a disassembler.

For the disassembler I use IDA. (not Ghidra because for IDA there a lot of resources online + plugins).

Following Guided Hacking tutorial I reversed [Assault Cube](https://assault.cubers.net/), and made an Internal cheats with no recoil, flyhack, god mode and other things, some of them works in multiplayers and some of them don't.

Now I am "reversing" CS:GO (of course still following tutorials but not copy-pasting), with quite a bit of difficulty, but I'm sure I will get through this too.

This is not an easy journey, and I like hard things (no contradictions).

_Off-Topic_: Miura's friend just announced that Him and Miura's assistants will resume the serialization of Berserk!!
        
        
        `,
              children: [],
            },
            {
              name: "06-09-reversing-assault-cube.md",
              path: "blog/2022/06-09-reversing-assault-cube.md",
              content: `<!-- ---
layout: post
title: Reversing Assault Cube (v1.2.0.2)
tags: [game-hacking, reversing, journey, assault-cube]
date: 2022-06-09 14:00:00
--- -->

# Reversing Assault Cube (v1.2.0.2)

Assault Cube is an open source FPS game, now it's outdated, but for practicing game hacking is really good, because the reversing part is easy (except maybe for some functions).

When reversing a game, We don't mind if the cheat is gonna be External or Internal (maybe I will do a post explaining it based on my knowledge in the future), both of them have pros and cons, and both of them are really similar when we talk about coding the cheat.

Assault Cube cheat table (for Cheat Engine):

![ptr-table](https://imgur.com/iqGomMZ.jpg)

The goal is to get a cheat table like that, it's not complete, but you can do a lot of things with these pointers and offsets.

Remember, there are more ways to get the same result, even in reversing.

I will try to explain how to get some good pointers/offsets to work with but I will not go too in depth, as there are a lot of good resources online like [Guided Hacking](https://guidedhacking.com/) and [Unknown Cheats](https://www.unknowncheats.me/forum/index.php).

## From beginner to advanced:

1. **BEGINNER** (Local player and Health):

The basic way is through Cheat Engine and "find out what accesses this address", but there are other ways for example with REClass.Net.

We gonna start with a basic scan for the health, using granades and decreasing our health, by doing that and after some hits we will find something like this:

![beginner-1](https://imgur.com/29krO2A.jpg)

Now we need a pointer to that otherwise everytime We restart the game, that address is gonna change, and we'll need to do this process again.

To find a pointer do a pointer scan with pointermaps or as you want.

Now that we have a pointer, We have the offset too (in our case 0xF8), and with It We can finally modify our health with our cheat.

Through health you can find the local player too.

![beginner-2](https://imgur.com/PJMaO8r.jpg)

With the local player + offsets we can basically access every properties of that particular class.

2. **INTERMEDIATE** (Current ammo and Weapon Damage):

We gonna use REClass.Net, a powerful tool to find offsets based on local player (in this case).

Before REClass just scan your ammo that you see for your current weapon type, for example rifle ammo and after that you will find the pointer.

Now that we have the rifle ammo ptr, We can find the current weapon offset by reversing with "Multi-level pointer base calculation".

For reference the calculation is like this (took this formula from Guided Hacking):

    Address = Value = ?
    base ptr -> address + offset 4 = address
    base ptr -> address + offset 3 = address
    base ptr -> address + offset 2 = address
    static base -> address + offset 1 = address

And with some scans we have this:

    00FCA190 = Value = 20
    00FCA474 -> 00FCA190 + 0 = 00FCA190
    00FCA3B4 -> 00FCA460 + 14 = 00FCA474
    ac_client.exe+10F4F4 -> 00FCA040 + 374

So the current Weapon offset is 374.

We still have to find the weapon damage, and we will do it with REClass, it will look like this:

![intermediate-1](https://imgur.com/kKUDBJW.jpg)

![intermediate-2](https://imgur.com/z6JlYpH.jpg)

As we can see there are a lot of properties beyond the weapon damage, but they need to be reversed.

3. **HARD** (Recoil function with IDA):

From the process showed for the weapon damage, We see that We found recoil too (after some testing).

Using that offset, on Cheat Engine we will find out what accesses to that address, go to disassembler, and retrieve the address:

![hard-1](https://imgur.com/zoyi60K.jpg)

Now It's time for IDA.

Going to that address and Decompiling the assembly instructions We get this:

![hard-2](https://imgur.com/FOCQqzO.jpg)

Confusing right? It's not easy but with some practice everything will make sense.

After reversing it (I'm not gonna explain the whole process because I'm not the one that should teach you these things):

![hard-3](https://imgur.com/KORQoi4.jpg)

(IDA fucked up the indentation)

As we can see, there is a multilevel pointers calculation to go to the recoil offset, now We can conclude that the instruction where we need to operate on is this one.

To implement no recoil, We can just simply nop this instruction. (**nopping** is pratically "hiding" that particular instruction without impacting the whole program, and that instruction will never be executed).

I hope that you liked this little post :)

[video](https://www.youtube.com/watch?v=huTILhprxls)
        
        `,
              children: [],
            },
            {
              name: "06-17-external-and-internal-assault-cube.md",
              path: "blog/2022/06-17-external-and-internal-assault-cube.md",
              content: `<!-- ---
layout: post
title: External and Internal Cheats (Basics)
tags: [game-hacking, reversing, journey, assault-cube]
date: 2022-06-17 21:20:00
--- -->

# External and Internal Cheats (Basics)

External and Internal are two types of Cheats, both of them are good, and of course they have pros and cons.

I'm gonna explain what I know so far about these two types in a very basic way, with cheat examples, I might say something wrong, so suggestion are strongly accepted (twitter: [@graffioh](https://twitter.com/graffioh) or Discord: Graffioh#2823).

(Assault Cube v. 1.2.0.2)

**External Cheat**

The External cheat will run in a separate process than the game hacked.

When we are external, We are going to use the Windows API, our best friend will be [MSDN](https://docs.microsoft.com), You MUST use it, one of the most important thing for a programmer is to read the documentation, everything is basically written there, so no execuses.

The template is basically this:

    // Get Process ID

    // Get Module Address

    // Open the Process

    // Read or Write to that address

Basically we get the Process ID with GetProcID function, the module base with GetModule (both of these func will be explained later), and the Proc ID enable us to open the process.

![img-1](https://imgur.com/nt5NtWB.jpg)

With that we are going to operate on the memory.

Before overwriting the health we need to open the process using the ID, after that lets declare localPlayer using the module Base + offset (found by reversing the game).
Now we need the health Address to write to it, the offset is already reversed, but It's a multi-level pointer so let's use findDMAAddy function (by Fleep from Guided Hacking) and we can calculate the pointer by doing that.

![img-2](https://imgur.com/VjhmGgm.jpg)

Now we can use ReadProcessMemory to read the actual health value, and WriteProcessMemory to overwrite the value.

(everything about ReadProcessMemory, WriteProcessMemory, OpenProcess and others is explained on msdn documentation).

![img-3](https://imgur.com/TiaAor3.jpg)

I hope everything makes sense until now.

Now let's go on our implemented functions to get the Process ID, the Module Base address and the multi-level pointer.

The basic concept that are needed are:

1. [What is a process](https://www.tutorialspoint.com/what-is-a-process-in-operating-system): a process is an istance of an executable that is running on our PC.

2. What is an Handle: an handle will give us the ability to manage the "access" permissions for the process.

3. What is a Snapshot: a snapshot is just a "screenshot" (or a snapshot) of the current active processes

Functions:

- _GetProcID_

  For the process ID we will use a snapshot of the current active processes, and with that snapshot, We can iterate through it and find the correct process by using his .exe name.

![getprocid](https://imgur.com/ZiYcCyu.jpg)

- _GetModule_
  This is really similar to GetProcID but there the snapshot will be a little different, but the mechanism is the same.

![getmodule](https://imgur.com/QUmExSP.jpg)

- FindDMAAddy

  A simple and powerful function, by passing the handle to the process, the base pointer and the offsets, it will calculate the multi-level pointer with a for loop and ReadProcessMemory.

![finddmaaddy](https://imgur.com/esN6pY4.jpg)

Thats it, if you want a really good starting tutorial for external go [there](https://www.unknowncheats.me/forum/programming-for-beginners/267073-coding-hacking-introduction-guide-practical-external-game-hacking.html).

**Internal Cheat**

Oh now we are on the juicy part.

When we are internal is all about pointers, and as the opposite to the external cheat, it will run inside the game with an injected DLL (a dll is a set of data and code that can be used inside a program).

The injector used is the [Guided Hacking one](https://guidedhacking.com/resources/guided-hacking-dll-injector.4/) .

For me this is really really easy compared to the external counterpart, but It's really hard to master it.

We need to create a thread, and in that thread we are gonna run the hack

    DWORD WINAPI MainThread(HMODULE hModule)
    {
        ...
    }

(remember I'm still not expert so I don't really know how the good hackers setups the code).

So from there, We need only to get the module base address by doing:

![modulebase](https://imgur.com/grg2QX1.jpg)

And the local player:

![localplayer](https://imgur.com/rUH4yRc.jpg)

I'm used to do a toggle "menu" like this where we can separate each functionality like overwriting health, overwriting ammo, no recoil and more:

![togglehealth](https://imgur.com/yOdhVHJ.jpg)

Now we will continous write the new health value:

![ifhealth](https://imgur.com/0pbIwFC.jpg)

I don't really know what to explain in this part, everything is straightforward with some practice.

If you are concerned about pointers, by doing for example \*(int\*) we are casting the address to an int pointer and after that we dereference it to write the value on the address. Almost everything is done by doing that play with the pointers.

_Additional Notes:_

- uintptr_t type is for portability, it works both for 32 and 64 bit compared to DWORD that only works for 32 bit architecture.

- GetModuleHandle(NULL) automatically get us the .exe module.

- Always close Handles and "free" the thread after we use it.

Again, this is a basic basic start, but I wanted to share it.

**CONCLUSIONS**

Making cheat is fun, no doubt, you can basically do whatever you want modifying the game.

Selling the cheats or using them is a very scummy move and my goal is to prevent that.

If you are interested you can follow [Guided Hacking Bible](https://guidedhacking.com/threads/ghb0-game-hacking-bible-introduction.14450/) path or go to [Unknown Cheats](https://www.unknowncheats.me/forum/index.php) and search things.

Everything is up to you, I'm doing this for educational purpose.

![twoways](https://imgur.com/51RlvHW.jpg)
        
        `,
              children: [],
            },
            {
              name: "08-01-life-update-1.md",
              path: "blog/2022/08-01-life-update-1.md",
              content: `<!-- ---
layout: post
title: Life Update I
tags: [personal life, journey]
date: 2022-08-01 14:30:00
--- -->

# Life Update I

So, here we are again, from now on there will be a little shift regarding this blog's topic.

I got into a sort of Internship in Apple, precisely a 9 months "training program" called [Apple Developer Academy](https://www.developeracademy.unina.it/it/) in collaboration with my University.
The Academy is based on mobile development (code+design) in a team environment, really different from what you do in Uni, so I decided to apply and after some selection I got accepted with other 220 people.

This has been an hard choice, because I needed to choose between full time uni or this sort of internship+uni. Of course the first choice would have been less stressful, as I already said, I always choose the hard and rewardful path and this is how I got in this situation.

Based on what I said, In this period I will not continue to use my free-time on reversing unfortunately because now my priorities have been shifted.
I can try to keep this blog updated with little sort of life/what I've been learning update every month, but who knows.

See you guys. \*shake the hand\*

![shakehand](https://imgur.com/ZmBSlhr.jpg)
        
        `,
              children: [],
            },
            {
              name: "12-21-life-update-2.md",
              path: "blog/2022/12-21-life-update-2.md",
              content: `<!-- ---
layout: post
title: Life Update II
tags: [personal life, journey]
date: 2022-12-21 15:30:00
--- -->

# Life Update II

Yo it's been a while!

![graffiohrecap](https://imgur.com/3HyIZqh.jpg)

So, what happened during these months? The usual stuffs: gym, university, friends and coding.

This is gonna be a quick recap of what I did and what I learnt, if you don't care, it's fine don't worry :)

## Summer

While studying for discrete math exam (actual torture), I did a simple game with SFML and C++ in my spare time. I got a lot of knowledge and I really enjoyed developing it. Of course it's basic C++ with some C++11 features, nothing advanced.

The name is ArcAim and this is the [repo](https://github.com/Graffioh/ArcAim) on github. (There are also videos!)

This project will not be left over, I'll try to update it as much as possible, but new things are behind the corner, so who knows.

## Autumn/Winter

University started, Apple course started, pain started (jk).

So during this time, I met a lot of people (foreigners and not), got better in english and improved my professional skills like presenting a product to an audience and building something in a team.

There are some private _things_ that I can't share, but also public ones like:

- A photo editing app clone: [repo+video](https://github.com/Graffioh/PhotoEditAppClone)
- A chat app: [repo+video](https://github.com/Graffioh/AirChat)

What I learnt?

- Swift
- Git workflow in team
- Project management with various time constraints
- A little bit of design

## Future

Remember:

The future is <ins>not certain</ins>, the future <ins>is dark</ins>, there will be <ins>hard times</ins>, but we must step over them and <ins>go on</ins>.

(yes I like motivational speech, no I don't like andrew tate)

This small TED talk is over, thank you for listening me.
        
        `,
              children: [],
            },
          ],
        },
        {
          name: "2023",
          path: "blog/2023/",
          content: "",
          children: [
            {
              name: "03-19-learning-something-new.md",
              path: "blog/2023/03-19-learning-something-new.md",
              content: `<!-- ---
layout: post
title: Learning something new
tags: [programming, tech, back-end, mobile, swift]
date: 2023-03-19 16:20:00
og_image: https://i.imgur.com/Jqnav0s.jpg
permalink: /REwithGraffioh//blog/2023/learning-something-new/
--- -->

# Learning something new

I had to create an iOS App within one month, collaborating with five individuals from diverse professional backgrounds.

The main focus was to develop an app to facilitate networking among lawyers. The key feature was an 'Assignment board,' where lawyers could post their assignments, receive and send assignment requests.

As for my role, I had to build the back-end from scratch, which was a new experience for me since all my previous projects were offline. I won't go too in-depth as it is a private project that might be published in the future.

So my initial questions were: "Where do I start? What technologies should I use?". I've used C++ for personal projects and PostgreSQL/Java for an (offline) university project, so I had only a vague idea that a DB needs to be deployed online otherwise it would be another offline project :')

Prior to this app I used Firebase for a chat app made in 1 week, it was pretty easy and straightforward with the well written documentation and everything from the back-end already set-up.

Yeah now you are saying: "Well you have only 1 month, you can go with something already built and stable like Firebase, but also Realm or Cloudkit could be good." and guess what I did....Let's learn [Express.js](https://expressjs.com/) and [MongoDB](https://www.mongodb.com/)!

After some research I understood that Express.js is a [Node.js](https://nodejs.org/en) framework and that's a runtime environment for javascript used to run the code like we were using C++, with this we can create a server that act like a bridge between the database and the app.

In 2 days I got all the basic (really really basic) theoretical knowledge about: What is a CRUD app, What is a REST API, Info about Network protocols (HTTP, TCP/IP, DNS, UDP..) and so on. Now it's time to get started!

During my research on Express.js/MongoDB, I stumbled across this gem: [The Net Ninja playlist](https://www.youtube.com/playlist?list=PL4cUxeGkcC9jBcybHMTIia56aV21o2cZ8). Pure gold to build a fast and easy base for our server with also basic MongoDB queries. Additional resources were also: [Coding garden speedrun](https://www.youtube.com/watch?v=EzNcBhSv1Wo), official documentations and a lot of stack overflow.

After the base, the front-end has been connected with the back-end part using Swift API calls, easy peasy lemon squeezy, aaaaand everything was working fine on my machine...._yes, on my machine_.

It's time for new beautiful questions:"Where do I deploy the server? Where do I deploy the database?"

The first answer was [Render.com](https://render.com/) and the second was [MongoDB Atlas](https://www.mongodb.com/atlas/database) (both free tiers, for testing purpose they are fine, but in future it could be better to put the server on cloudflare workers or similar)

![pontus-sys-design](https://imgur.com/DZsQBRU.jpg)

Overall it was a very linear experience, there were some spikes when building advanced queries with MongoDB but it's been a good journey. Of course I didn't build the most scalable solution due to my lack of experience, but it worked, so for now I'm satisfied but also not satisfied.

In the recent version we also built a Log-In mechanism integrated with Apple Login!

I'm always open to learn new things and to re-invent myself as a software engineer and computer scientist, the curiosity and the willpower is fundamental in our field, the ones that will lack those, are going to fail.
        
        `,
              children: [],
            },
            {
              name: "06-25-thoughts-CS-and-SWEs.md",
              path: "blog/2023/06-25-thoughts-CS-and-SWEs.md",
              content: `<!-- ---
layout: post
title: My thoughts on CS, SWEs and more
tags: [programming, tech, computer-science, education, swe]
date: 2023-06-25 04:20:00
og_image: https://i.imgur.com/SZmanIp.jpg
--- -->

# My thoughts on CS, SWEs and more

Why am I making this post? What is life? Are we alone in the universe? I don't know.

As a Computer Science student, I used to have a wrong perception of the topic. I would often say things like, "They are not teaching me to code," "These math classes are useless," or "We'll never use Bézout's Theorem," and so on...

Something clicked inside my head after watching this [video by Leslie Lampart](https://www.youtube.com/watch?v=rkZzg7Vowao) and this tweet by John Carmack:

![carmackscreen](https://imgur.com/obDlvqi.jpg)

I only had a vague idea of coding and nothing more when it came to my association with Computer Science.

Now I understand that we are studying **Computer Science**, not simply attending a coding bootcamp. Our purpose is to deeply understand the computer, starting from the math behind it all the way up to the concrete aspects. Sure, these things may seem boring to many of us, but I believe it's not a problem with the "subject" itself, but rather how we were educated in the years prior to university or college.
I have always had a lack of understanding in math, and even now, I still struggle with it. Because of this, I often perceive it as an unpleasant subject, but I realize it's simply because I am not proficient in it.

At the same time that my thinking was evolving, I realized that as a **Software Engineer**, it is crucial to satisfy clients by building a **product** for them. They don't care about how you wrote the code, which language you used, or what architecture you chose. It is important to focus on the right things rather than getting caught up in questions like, "What IDE/Editor should I use?" or "What is the best keyboard?" or "I want to use X programming language, but Y is more suitable for the job (mostly because it's faster to develop with it)." All these things are meaningless. Choose what works best for you, but remember that delivering a product is what truly matters.

Of course, this approach has some downsides when it comes to the quality of the product. Take, for example, the Twitch web app; it is heavy, sluggish, and not performant. However, since it is profitable, it is considered 'okay'.

I'm still new to the field as I haven't had a job as a Software Engineer yet. I still need to finish my University studies and potentially wait for an internship opportunity in Summer 2024. However, based on my current understanding, these are my considerations.

The key is to build things and strive to create meaningful products for people. The tool doesn't matter, what truly matters is adaptability. I'm not saying this just for the sake of it, but for me, it applies to everything in our field.

I'm not scared of AI and all of this nonsense. If it becomes my assistant, it's just another tool for me to use in my work, and that's a good thing.

(Thanks to ChatGPT for improving the readibility of this post).
        
        `,
              children: [],
            },
            {
              name: "08-21-The-b-in-the-alphabet-stands-for-build.md",
              path: "blog/2023/08-21-The-b-in-the-alphabet-stands-for-build.md",
              content: `<!-- ---
layout: post
title: The B in the alphabet stands for build
tags: [tech, computer-science, e/acc, future, build]
date: 2023-08-21 00:00:00
og_image: https://i.imgur.com/vwFzWGt.jpg
image: https://i.imgur.com/vwFzWGt.jpg
--- -->

# The B in the alphabet stands for build

## What's "building"?

> "The action of "building" refers to the process of creating, constructing, or assembling a physical or conceptual entity by combining various components, materials, or elements in a deliberate and organized manner. This process involves planning, designing, and executing the necessary steps to bring the desired structure, object, system, or concept into existence. Building can encompass a wide range of activities, from constructing physical structures like buildings, bridges, and machinery to creating digital products, relationships, or abstract ideas through careful arrangement and coordination of parts or elements." \
> \- gpt3.5

From the beginning of time until now, humanity has consistently been engaged in the act of building, from physical building to digital building.

As engineers we have the power in our hands. We are wizards, we could create anything from 0 and that could be or not be a big leap for humanity. We will never know if we don't **start building**.

## The tools are not relevant.

No one will care which tools do you use.

Did big part of humanity really care about the nitty-gritty details of how the Web, Linux, ffmpeg, Modern LLMs or the iPhone came into existence and the specific tools used? Probably not. What truly matters is the end result, and now we're lucky to have these innovations at our fingertips. The creators simply dived in and started building.

I was a competitive FPS player and even there, we were split in two categories:

1. Those who focused on understanding the game deeply.

2. Those who cared about mouse, keyboards, in-game sensitivity, crosshair and the entire setup.

Naturally, the majority of professional players fell into the first category, while in the second category there were some talented and hard working players who managed to go pro, but around 90% of them fell short because they prioritized the wrong elements.

I was among the 90% of the second category.

I won't repeat that same mistake. I won't get caught up in choosing an editor, a specific Linux distro, or a shiny new programming language. Instead, i'll just build and ship, to learn, iterate, and improve.

## Let's build the future together.

Personally, I'm uncertain about which product holds the potential to create a significant leap for humanity; it might be AGI or something like superconductors (rip LK-99). The essential aspect is to dream big and be optimists. ([really good related video](https://www.youtube.com/watch?v=o48X3_XQ9to))

Lately, i've been following the e/acc scene on X, yeah they are mostly "shitpoasters" but they are also highly skilled individuals with the ability to bring impactful change in our world. I've been inspired by them to make this little post.

I wanted to share my thoughts and maybe inspire others to **build, ship and shape the future**.

&nbsp;

![futurecities](https://imgur.com/xv8VcCo.jpg)
        
        `,
              children: [],
            },
          ],
        },
        {
          name: "2024",
          path: "blog/2024/",
          content: "",
          children: [
            {
              name: "01-12-The-process.md",
              path: "blog/2024/01-12-The-process.md",
              content: `<!-- ---
layout: post
title: "The process"
tags: [tech, personal-improvement]
date: 2024-01-12 00:00:00
og_image: https://images.nightcafe.studio/jobs/PwSQPN4k32Wgu6g9cEEn/PwSQPN4k32Wgu6g9cEEn_2x.jpg?tr=w-1600,c-at_max
image: https://images.nightcafe.studio/jobs/PwSQPN4k32Wgu6g9cEEn/PwSQPN4k32Wgu6g9cEEn_2x.jpg?tr=w-1600,c-at_max
--- -->

# "The process"

> A process is a series of steps or actions that are taken in order to achieve a particular result or goal

Seems easy, right? Mmmm, not really. It depends on the result that needs to be achieved. Keep that in mind, but also remember that all goals can be achieved.

Why am I talking about process in general? A "process", based on that definition is something that _<u>for sure</u>_ will make you achieve a goal, right? Well, it depends, I will explain why by talking about my experience with "the process".

## My experience

I first encountered this word when I was at the Apple Developer Academy. They always emphasized the importance of it, saying almost on every occasion: “trust the process”.
At first, I didn’t give much meaning to this phrase, but as time passed, it started to make more sense.
It’s not a straightforward discovery; you will understand it at the right time. For me, it was when I realized that I could learn anything by trusting the process and **doing the work**.

Why is **doing the work** in bold? Because “trust the process” doesn’t mean “just wait and you will achieve whatever you want”. Instead, it means “work hard and you will almost certainly achieve whatever you want” (at least based on my interpretation). Now, it’s my mantra.

Do I need to learn a new programming concept? A new programming language? A new math concept (hardcore challenge)? No problem. I’ll put in the work and trust the process. But why am I so sure and confident? Because I’ve experimented with it and found that it works...almost certainly.

Twitter post made some weeks ago related to that:

<blockquote class="twitter-tweet"><p lang="en" dir="ltr" data-theme="dark">still can’t realize how much i improved during this year, unbelievable.<a href="https://twitter.com/graffioh/status/1738992218797486248?ref_src=twsrc%5Etfw"></p>&mdash; bertø (@graffioh) December 24, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

I just flowed through the process and now I am much better than before. A little reminder, always compare yourself to your past self.

I have almost reached my token limit, so let's close this post with something motivational

## Trust the process even if "it works...almost certainly"

Of course, there’s always a little probability that it won’t work, but we like risks, right? Otherwise, it’s useless to aim for great things.

What could go wrong even if you are _“trusting the process”_? Maybe you are not working hard enough, maybe you have trouble in your personal life, maybe the goal has changed…A lot of things could happen, so this is the little probability of failure that I am talking about.

If you have something great to aim for, don't trash it because your sorrounding say it so, instead you need to be motivated by it, you need to prove them wrong, but most importantly prove **yourself** wrong.

Now back to studying for DSA exam, cya.
    
    `,
              children: [],
            },
            {
              name: "04-20-In-the-making-of-my-first-webshite.md",
              path: "blog/2024/04-20-In-the-making-of-my-first-webshite.md",
              content: `<!-- ---
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

For testing purpose the Spring boot app was deployed on <del>[Render](https://render.com)</del> [Fly.io](https://fly.io) and for the db [Neon](https://neon.tech) was used.

For production, everything is managed with AWS and Docker;
Elastic Container Service ([ECS](https://aws.amazon.com/en/ecs/)) for Spring boot app, Simple Storage ([S3](https://aws.amazon.com/en/s3/)) for handling images and Relational Database Service ([RDS](https://aws.amazon.com/en/rds/)) for PostgreSQL db

![system-design-diagram](https://imgur.com/CAERKBO.jpg)

### AWS

I'll open a little section about AWS, because...well it's a mess, that's it, no more to say.

## 05/11 Update
Found out two things:
+ There were problems with OAuth login and Fly.io / any load balanced environment due to how Spring session manages OAuth authentication flow
+ AWS from February 2024 started charging for public IPs (idle or active) + subtle hidden costs so not worth for a university project

Still using AWS S3 and RDS, but the Spring Boot app is deployed on Microsoft Azure (Azure Container App, ACA) with Affinity session turned ON .

## Closing thoughts

Everything is possible till you recognize your skill issues and work to overcome them.

It was fun developing it, using javascript/typescript will give you the freedom to do everything, even if not in the most performant way, but it's really versatile. After all javascript rules the world.

[website link](https://dietideals24.vercel.app)
            `,
              children: [],
            },
          ],
        },
      ],
    },
    // {
    //   name: "blog-drafts",
    //   content: "",
    //   children: [],
    // },
  ],
};

export default treePosts;
