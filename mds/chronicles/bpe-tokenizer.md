# bpe tokenizer

```github
https://github.com/Graffioh/lmfromscratch/blob/main/assignment1-basics/cs336_basics/bpe_parallel.py
```

**test_train_bpe.py**

initial run without any optimization:

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
  1318871    0.130    0.000    0.130    0.000 {method 'encode' of 'str' objects}
  1318657    0.113    0.000    0.113    0.000 {method 'group' of '_regex.Match' objects}
      114    0.113    0.001    0.114    0.001 custom_ops.py:607(_register_to_dispatcher)
     1047    0.061    0.000    0.061    0.000 {built-in method marshal.loads}
...
```
