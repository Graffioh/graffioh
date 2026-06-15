# bpe tokenizer

```github
https://github.com/Graffioh/lmfromscratch/blob/main/assignment1-basics/cs336_basics/bpe_tokenizer/bpe_parallel.py
```

starting with `test_train_bpe.py` and then later on *TinyStories* training

## Time performance

### initial run without any optimization:

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

### using a reverse index to prune the search space:

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

### parallelize pretokenization

### gone wrong

parallelizing pretokenize on small examples is not beneficial (it will be with large corpus of data tho)

the pretokenize time is only ~2s across the total time spent in the `train_bpe` function

`merge` is the one to optimize in this case

![bpe-parallel-timeline](../bpe-parallel-timeline.png)

then i tried running TinyStories train set and it was taking too much:

![bpe-train-terminal](../bpe-train-terminal.png)

7~ it/s

time to optimize more or fix the existing one(?)

#### better optimization on pretokenize

profiling current pretokenize on 465MB of data:

![bpe-profile-cprofile](../bpe-profile-cprofile.png)

unique pretokens in chunk are *34878* but i'm calling `.encode("utf-8")` *107322122 times*, and this can be optimized by keeping everything as a string until we actually need bytes (since encoding a string, will lead to split bytes anyway!)

just with this we go from 134s to 81s (34% reduction!)

![bpe-profile-cprofile-81s](../bpe-profile-cprofile-81s.png)

above, we can see that there are some methods called that are not really to split text (regex/main.py compile, setlocale, isinstance and such) because of `txt_split = regex.finditer(gpt_regex_pattern, text)`: i'm calling the function via the module instead of doing that directly on the regex pattern object...such a waste...

thanks to this we are down to 76s...but there is still something off...

the other culript is: pretokenize is iterating through all the words in the training corpus, and what i was doing to these words was converting them into bytes! this conversion was being done a lot lot of times, and that slowed down everything. The fix is to actually convert to bytes only when needed, since strings are easily converted without losing any ordering and such (string is just an 'encoding' of n-bytes)

the conversion is now done here, when frequency table chunk is aggregated from the parallel processing:

```python
 with Pool(
     num_processes,
 ) as pool:
     pretoken_freq_table_from_parallel = list(
         tqdm(
             # results arrive as each chunk completes, with yield, so we can use tqdm
             pool.imap_unordered(pretokenize_worker_star, pretokenize_args),
             total=len(pretokenize_args),
             desc="pretokenize chunks",
         )
     )

 for pretoken_freq_table_chunk in pretoken_freq_table_from_parallel:
     freq_table_chunk: Counter[tuple[bytes, ...]] = Counter()
     for pretoken, count in pretoken_freq_table_chunk.items():
         bytes_from_pretoken = pretoken.encode("utf-8")
         bytes_split: list[bytes] = []
         for b in bytes_from_pretoken:
             bytes_split.append(bytes([b]))

         freq_table_chunk[tuple(bytes_split)] = count
     freq_table.update(freq_table_chunk)
```
after these optimizations, `merge` when training on Tinystories went from 7 it/s to 10 it/s

the last optimization to go through, is the *in-place editing of the pair indexes* (both word slot and count)...here i'll update and sync them in place while merging:

```python
 for slot in index_pair_to_word_slots[max_pair]:
     cur_word, cur_count = words[slot]

     # decrement the count since we're gonna merge bytes
     for cur_w_pos in range(len(cur_word) - 1):
         byte_pair = (cur_word[cur_w_pos], cur_word[cur_w_pos + 1])
         index_pair_to_count[byte_pair] -= 1

     new_word: list[bytes] = []
     i = 0
     while i < len(cur_word):
         if i + 1 < len(cur_word) and cur_word[i] == max_pair[0] and cur_word[i + 1] == max_pair[1]:
             new_word.append(cur_word[i] + cur_word[i + 1])
             i += 2
         else:
             new_word.append(cur_word[i])
             i += 1

     # restore the decremented count on the bytes not merged, and add new one on the bytes merged
     for new_w_pos in range(len(new_word) - 1):
         byte_pair = (cur_word[new_w_pos], cur_word[new_w_pos + 1])
         index_pair_to_count[byte_pair] += 1
         index_pair_to_word_slots[byte_pair].add(slot)

     words[slot] = (tuple(new_word), cur_count)
```

now we train on the whole TinyStories dataset in 1:50 min :)

![bpe-train-terminal-253its](../bpe-train-terminal-253its.png)

## Memory optimization

well...i got OOM during *OpenWebText* training

<img src="../openwebtext-oom.png" alt="OpenWebText training OOM" width="320" />

some quick wins were on pretokenize parallelization side, where i was managing/holding too much memory for each worker:
- i was storing all the freq table chunks that i got from parallel workers and then only after aggregating into the general freq table -> so i moved to a streaming approach
- i was holding all the text chunks in the worker because of wrong regex pattern (`.split`) instead of traversing one by one (`.finditer`)

even after this the memory still grows a lot...i'll check later...
