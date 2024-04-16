<!-- ---
layout: post
title: External and Internal Cheats (Basics)
tags: [game-hacking, reversing, journey, assault-cube]
date: 2022-06-17 21:20:00
--- -->

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

(everything about ReadProcessMemory,WriteProcessMemory,OpenProcess and others is explained on msdn documentation).

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
