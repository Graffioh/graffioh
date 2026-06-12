# bpe tokenizer

```github
https://github.com/Graffioh/lmfromscratch/blob/main/assignment1-basics/cs336_basics/bpe_parallel.py
```

**test_train_bpe.py**

## initial run without any optimization:

```
 160236054 function calls (160201169 primitive calls) in 35.700 seconds

   Ordered by: internal time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        4   21.950    5.487   32.243    8.061 bpe_parallel.py:74(merge)
87823813/87822895    4.782    0.000    4.782    0.000 {built-in method builtins.len}
 62809434    4.634    0.000    4.634    0.000 {method 'append' of 'list' objects}
     6469    1.417    0.000    1.711    0.000 bpe_parallel.py:61(pretokenize)
8975/8974    0.633    0.000    0.891    0.000 {built-in method builtins.max}
        4    0.305    0.076    0.305    0.076 {built-in method _imp.create_dynamic}
  5341566    0.257    0.000    0.257    0.000 bpe_parallel.py:98(<lambda>)
     1186    0.188    0.000    0.188    0.000 {method 'read' of '_io.BufferedReader' objects}
        5    0.130    0.026    0.130    0.026 {built-in method gc.collect}
...
```

## using a reverse index to prune the search space:

$$
\text{31.9\% reduction - 1.47x speedup}
$$


```python
# optimization 1 - use a reverse index with <pair>: add((<word>, <count>)) after picking the winning pair
#   so that we don't traverse each freq_table key to find in which word, the pair appear
words = list(freq_table.items())
index_pair_to_word_slots: defaultdict[tuple[bytes, ...], set[int]] = defaultdict(set[int])
```

```
         73817271 function calls (73782395 primitive calls) in 24.296 seconds

   Ordered by: internal time

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
        4   13.935    3.484   20.712    5.178 bpe_parallel.py:74(merge)
 27236456    3.081    0.000    3.081    0.000 {method 'add' of 'set' objects}
 27686674    2.329    0.000    2.329    0.000 {method 'append' of 'list' objects}
     6469    1.456    0.000    1.749    0.000 bpe_parallel.py:61(pretokenize)
8973/8972    0.640    0.000    0.897    0.000 {built-in method builtins.max}
9300067/9299149    0.484    0.000    0.484    0.000 {built-in method builtins.len}
        4    0.330    0.082    0.330    0.082 {built-in method _imp.create_dynamic}
  5341566    0.257    0.000    0.257    0.000 bpe_parallel.py:105(<lambda>)
     1185    0.214    0.000    0.214    0.000 {method 'read' of '_io.BufferedReader' objects}
  1318871    0.124    0.000    0.124    0.000 {method 'encode' of 'str' objects}
        5    0.122    0.024    0.122    0.024 {built-in method gc.collect}
...
```

## parallelize pretokenization

### gone wrong

parallelizing pretokenize on small examples is not beneficial (it will be with large corpus of data tho)

the pretokenize time is only ~2s across the total time spent in the `train_bpe` function

`merge` is the one to optimize in this case

![bpe-parallel-timeline](../bpe-parallel-timeline.png)

