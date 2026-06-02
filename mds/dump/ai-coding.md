# ai coding

## Tensors & Strides

In cpp everything is in a plain row layout, and to index inside a multi-dimensional array (a tensor) you need to skip *strides* of dimensions.

A **stride** is the product of sizes of dimensions to reach our dst:

e.g. `(67, 420, 69)` tensor -> <span class="rgb">{[(...)(...)][...]}{...}</span> each type of parenthesis is a dimension, in this case '<span class="rgb">{</span>' is the first, '<span class="rgb">[</span>' is the second and '<span class="rgb">(</span>' is the third dimension.

our dst is `(2, 44, 5)`, so we must go over 

the formula consists of a *post-index calculation*:

```
offset(i, j, k, z) =
      i * size(dim_1 * dim_2 * dim_3)
    + j * size(dim_2 * dim_3)
    + k * size(dim_3)
    + z

from dim_0 to dim_3
```

