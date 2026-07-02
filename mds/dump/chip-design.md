# Chip design

## Basics

### Matmuls

$A \in \mathbb{R}^{M \times K}, \space B \in \mathbb{R}^{K \times N}$

$C = AB \in \mathbb{R}^{M \times N}$

$K$ is the *reduction/aggregation* dimension, that we sum over it

$$
C[m, n] = \sum_{j=0}^{K-1} A[m, k] B[k, n]
$$

they are also called GEMMs, to make them look cool (⌐■_■)

written in naive code:

```python
for m:
    for k:
        for n:
            C[m, n] = A[m, k] * B[k, n]
```

in binary form:

<img src="/dump/img/mixed-precision-matmul.png" alt="mixed precision matmul binary accumulation" style="width:700px; max-width:100%;" />

to compute this example, in hardware, with 8 bits in sum and 8 bits in mul, 16 Full adders will be used

> [!note]
> a full adder, is called also **3->2 compressor**, because it takes 3 bits as in and produce 2 as out

there is a nice algebraic primitive calculation to understand how many circuits we need: $p \cdot q$ bits 

- sum: $4*4 \space \text{bits} = 16$ -> 16 AND
- sum and mul: $\text{sum}+8 \space \text{bits} = 24$ -> a full adder produce 2 bits output for every 3 bits -> $24-8 = 16$ Full adders

mat mul with full adders is called a: *Dadda multiplier*
