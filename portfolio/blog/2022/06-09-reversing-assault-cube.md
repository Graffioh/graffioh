<!-- ---
layout: post
title: Reversing Assault Cube (v1.2.0.2)
tags: [game-hacking, reversing, journey, assault-cube]
date: 2022-06-09 14:00:00
--- -->

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

**[video](https://www.youtube.com/watch?v=huTILhprxls)**
