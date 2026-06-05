# ai coding

## Tensors & Strides

In cpp everything is in a plain row layout, and to index inside a multi-dimensional array (a tensor) you need to skip *strides* of dimensions.

A **stride** is the product of sizes of dimensions to reach our dst:

### Example

e.g. `(67, 420, 69)` tensor -> <span class="rgb">{[(...)(...)][...]}{...}</span> each type of parenthesis is a dimension, in this case '<span class="rgb">{</span>' is the first, '<span class="rgb">[</span>' is the second and '<span class="rgb">(</span>' is the third dimension.

let's take our dst (i, j, k): `(2, 44, 5)`, so we must go on the 2 <span class="rgb">{}</span>, 44 <span class="rgb">[]</span> and 5 <span class="rgb">()</span> and to do that, the stride that guides our indexing is `(28980, 69, 1)`. Crazy numbers right? but it makes sense because we'll use that to navigate through are tensor dimensions: by multiplying each index with this stride, we'll exactly land at the right value we are searching for.

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

