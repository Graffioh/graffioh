# Bertologies collection

This place is a collection of bertologies (or analogies, as you prefer) that I post on my [X](https://x.com/graffioh), so don't expect to be rigorous or well formatted.

## Normalization in NN (Batch norm, Layer norm...)

imagine you are reordering your room.
you have a bunch of items that you need to put in the right place, but every once in a while these items changes position.

it's going to be hard to reorder them without losing (vanishing or exploding) your mind.
that's why we buy a bag, and we put all these items in it before reordering, so that they will be arranged in a more "compact way" making our life easier.

but keep in mind that some of them might be already in the right place so we put them back in the right spot!

## Model merging

[blog post](https://crisostomi.github.io/blog/2025/model_merging)

imagine you are a ML student in a valley and you need to gather books to increase your knowledge (instantaneously). 
these books are scattered across many convexities and you need to gather them all in a reasonable amount of time. 

is it doable or the books are lost forever?
actually you can, but you need to find the "right valley", using certain techniques, where convexities can be connected through holes directly (or linearly) otherwise it will be much of a burden.

## Attention sinks using graphs

[blog post](https://t.co/7NTqrsP7dH)

imagine you are playing clash of clans, you start from the town hall, from there you build all the buildings, walls etc
the more you advance th level, the more walls/buildings you can put, but everything start always from the town hall.


this means that each layer "give" more power to the town hall => it will always become more important to the attackers, because the more power, the more resources!

## Transformer

imagine you are playing an advanced whisper game. you are one player in a sequence, your job is to encode in some way the information that the previous players have said and then whisper it to the next player.

but why do i say players in plural? here is the catch! each player has magical earphones that let them hear all the previous players at once, not just the one immediately before them. but these earphones have an issue: you can only hear the players preceding you, excluding the ones after you.
note: you encode the information by picking only some informations from the previous players, the most relevant one, putting them together in your *head*, and then produce your own version of the message, adding a little of your own imagination :)


## Chain rule

imagine you are a STEM university student and you need to understand a very though equation.
what do you do? you try to understand it piece by piece. but to do so, you also need to understand where each part comes from. that's the key.

you go from composed concepts all the way down to the simple parts, such as axioms or similar and once you do that, you chain everything back together.

drifting a bit from the understanding part, the main idea is that by chaining, you can see how a change in one of the simple parts affects the final result.

## K-fold Cross Validation

imagine you are a wannabe teacher learning how to grade exams, and there are other wannabe teachers who you are competing with.

you only have 5 friends who are willing to take this practice exam, and a real professor who can only review 1 exam at a time, to take as a reference.

since 1 exam isn’t enough to judge how good your grading is you rotate: each time, you pick a different friend exam for the professor to review, while you grade the others.

you repeat this process k times until every friend exam has been checked once by the professor...smart, right? this way you get a more reliable idea of how good you are at grading overall, instead of relying on just one exam.

little detail that can lead to confusion: k is the number of folds, so the number of exams that are graded by the professor, but in this case since k = 1, we do the process k times.

## Probability vs Likelihood

what's the difference between probability and likelihood?
imagine you are a robot handyman and in your inventory you have a set of tools at your disposal to fix things.

### Probability

you already know which tool to use for the job, and you want to know how likely it is that the thing will get fixed

### Likelihood

you have observations of things that have already been fixed, and you want to figure out which tool was best for the job.

however, they are the same number:
saying "a wrench fixes things 80% of the time" is probability and saying "a fixed thing matches what you’d expect if a wrench did the job 80% of the time" is likelihood

## Overfitting and Underfitting

imagine you are a minecraft player and your job is to build houses.

### Overfitting

all your playtime went into building in creative, extreme houses and shit like that (high variance).

now you started your first ever survival run, then the night comes, what will you do to protect yourself from mobs? of course build a 1x1 and wait for the morning...well you won't be able to, because you only learned how to build beautiful houses :(

### Underfitting

now imagine you only went in the mines and never built any house, you just survived by digging into the stone and mine for materials, without learning how to build something (high bias).

at some point you get exhausted from mining, and you want to build a real house! well you can't because you never learned to :(
(i hope you like this one)


## P-Value

imagine we are conducting an experiment about humans and number of arms, now we pick a few samples from the population and make observations.

in our world we all know that there exists humans with > 2 arms, right? (this is also called null hypothesis).

however in our sample, there are only humans with 2!!! and because this outcome will be really strange if the null hypothesis was true, then the p-value is very small and this means that we can reject this "default" hypothesis.

a small p-value means that our observed data (or relationship) is as extreme or more extreme than the one expected, so we update our belief and we can also consider new alternative hypotheses.


## Bias and Variance

imagine we live in a world with two types of dogs: 
- normal dogs 
- alcans (random made up word lol)

### Bias

if a baby has only ever seen normal dogs, then the first time he sees an alcan he'll say “wow what a weird normal dog”.

his rule: “all dogs look like the ones i know” is too simple, so he always makes the same kind of mistake.

### Variance

imagine this baby is actually a supermachine that pays attention to every tiny detail of dogs and it learns a very complicated rule that perfectly separates normal dogs from alcans.
when it sees a new dog with some missing or unusual details, it gets confused: sometimes it says “normal dog,” other times “alcan”. 

the rule now is too sensitive, so its guesses jump around.


