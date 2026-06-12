# ai coding

## Tensors & Strides

In cpp everything is in a plain row layout, and to index inside a multi-dimensional array (a tensor) you need to skip *strides* of dimensions.

A **stride** is the product of sizes of dimensions to reach our dst.

### Example

e.g. `(67, 420, 69)` tensor -> <span class="rgb">{[(...)(...)][...]}{...}</span> each type of parenthesis is a dimension, in this case '<span class="rgb">{</span>' is the first, '<span class="rgb">[</span>' is the second and '<span class="rgb">(</span>' is the third dimension.

let's take our dst (i, j, k): `(2, 44, 5)`, so we must go on the 2 <span class="rgb">{}</span>, 44 <span class="rgb">[]</span> and 5 <span class="rgb">()</span> and to do that, the stride that guides our indexing is `(28980, 69, 1)`. Crazy numbers right? but it makes sense because we'll use that to navigate through tensor dimensions: by multiplying each index with this stride, we'll exactly land at the right value we are searching for.

### Formula

the formula implicitly used in the example, consists of a *post-index calculation*:

```
offset(i, j, k, z) =
      i * size(dim_1 * dim_2 * dim_3)
    + j * size(dim_2 * dim_3)
    + k * size(dim_3)
    + z

from dim_0 to dim_3
```

## mmap

I remember reading this legendary mmap post for llama.cpp back then, and understanding less than a word: [post](https://justine.lol/mmap/)

now i'm happy that i got to understand the reason about this choice, why it became the standard and such :)

There are various reasons:

- model weights is static memory (won't change during inference): we used to load the whole model at startup but that's bad! what mmap give us, is the possibility to care about memory mapping at startup, and **defer** the actual weight loading whenever we need those specific weights, by page faulting on-demand, also called *lazy-loading*.
- double memory allocation: we avoid it (page cache + heap copy), as we read the values through the mapped pointer, so only page cache is needed.

*note:* static memory is not the only type of memory used ofc...there are other stuff that need heap allocation, the ones calculated at runtime such as activations, and for those, mmap is not useful.

### shared ptr

in my [toy inference engine](https://github.com/Graffioh/magi-engine), everything is a class (no special struct memory optim), and each tensor, to access weights, had to hold the mmap'd file pointer via a `shared_ptr` (through an additional RAII class).

this ptr construct bundled with the RAII class, will give the capability of de-allocation (`munmap` to delete mmap) only on last reference object destruction and not at each single object destruction.

## Unicode & UTF-8

A Unicode is a text encoding standard that maps characters to *integer code points*: `U+<hexadecimal_value>`

UTF-8 is a form of Unicode encoding, where multiple Unicode code points are converted in one byte (0-255).

with tokenizers, we use UTF-8 encoding, because first of all, using Unicode would mean a big vocab size (and it's not really an issue [[ai-theory#Tokenizer]]) composed of a big amount of rare characters (wasteful)

we don't use UTF-16, UTF-32 (other for general compatibility with web standards) because we would be using 16 and 32 bits per code point, that means adding a lot of noise for common "few words" strings to fit these bits space

### wrong UTF-8 decoding

```python-compile
def decode_utf8_bytes_to_str_wrong(str_bytes: bytes):
    return "".join([bytes([b]).decode("utf-8") for b in str_bytes])

print(decode_utf8_bytes_to_str_wrong("😂".encode("utf-8")))
```

this is wrong for multi-byte characters e.g. 😂, because their bytes are composed of: a *leading* byte and n-1 *continuations* bytes. Either we pick n leader bytes alone without continuations (or only continuations), the code will throw an exception!

the fix is:

```python-compile
def decode_utf8_bytes_to_str(str_bytes: bytes):
    return str_bytes.decode("utf-8")

print(decode_utf8_bytes_to_str("😂".encode("utf-8")))
```
## Python parallelization

`multiprocessing.Pool` and `ProcessPoolExecutor`

**Cost of process parallelization**:

- sharing memory across processes (serialize, copy, deserialize)
- fixed startup cost (on macOS, each worker spawn a fresh intepreter and re-imports the module)

### Why threads can't really parallelize work: Python GIL (Global Interpreter Lock)

This lock, forces python **threads** to only execute python code at once, even on multiple cores, this means that it can't do *split* work:
- it works good when work need to be suspended for a bit and other work can be done in the meanwhile (I/O bound)
- it's not good for heavy compute bound operations where parallelization helps (CPU bound, <u>processes must be spawned for this</u>)



