# transformer

## resource accounting

### GPT2-XL

> **hyperparameters**: `vocab_size = 50257` · `context_length = 1024` · `num_layers = 48` · `d_model = 1600` · `num_heads = 25` · `d_ff = 4288` · `d_k = d_v = 1600/25 = 64`

Trainable parameters (weights) calculation

| component                                    | final shape               | params |
| -------------------------------------------- | ------------------------- | -----: |
| embedding                                    | `(vocab_size, d_model)`    | 80.4M  |
| RMSNorm × 2                                  | `(d_model,)`              | 1.6K   |
| attention (excluding QK^T and V)             | `4 × (d_model, d_model)`  | 10.24M |
| SwiGLU                                       | `3 × (d_ff, d_model)`     | 20.58M |
| **transformer block** (norm + attn + SwiGLU) |                           | 30.7M  |
| **transformer blocks × `num_layers`**        |                           | 1.47B  |
| output `Linear`                              | `(d_model, vocab_size)`   | 80.4M  |

**total** = `1.47B + 2 × 80.4M` **1.63B params**

### memory required to load

assuming single-precision floating point (f32), so 4 bytes for each parameter

having 1.63B trainable parameters (weights), we'll need `1,64B * 4 bytes = 6,56GB` memory

eventually, if calculating for training, we should also take in count the backward pass as well (so optimizer state and gradients)

### how many matmuls and how many FLOPs?

now we need to care about:
- number of matmuls
- cost of each matmul based on operators shape dimensions

for matmuls:
>48 * (4+2 attention + 3 SwiGLU) + 1 linear = 433 matmuls in a forward pass

to calculate FLOPs, we should understand the matmul FLOPs for each piece in the transformer, based on shape dimensions, with $2mnp$:

- mha attention: $2*1600*1600*1024=5.24B$ for each projection, so $2.1B*4=21B$ (to produce QKV and Out) + $(2*1024*64*1024)*2*25=6.7B$ (QK^T and V) = $27.7B$
- SwiGLU: $2*(3*4288*1600*1024)=42.15B$
- transformers blocks: $48*(27.7B+42.15B) = 3.35T$ 
- linear: $2*1024*1600*50257=164.7B$

> so $FLOPs = 3.35e12 + 164.7e9 = 3.52e12$

to check if these computations are fine we should check $\text{total\_params}\cdot 2N$ so it should be $2 \cdot 1.63e9 \cdot 1024 = ~3.34T$ (a discrepancy of about 5% is reasonable, since e.g. it ignores QK^T and V)

we can see that the biggest contributors are $\text{ffn} = 42.2B$ and $\text{attn}=27.7B$ but as context length grows, $\text{ffn\_grow} = O(N)$ and $\text{attn\_grow} = O(N^2)$!!!

## AdamW peak memory

- **parameters (weights)**: 
    + token_emb = (vocab_size, d_model)
    + t_blocks = num_layers * 4 * (d_model, d_model) + num_layers * 3 * (d_model, 8/3*d_model)
    + linear = (d_model, vocab_size)
    + rms_norm = ((2 * num_layers) + 1) * (d_model)
- **activations**:
    
    all of these are multiplied by num_layers, considering d_k = d_v = d_model / num_heads:
    + Q, K, V = 2*(batch_size, num_heads, ctx_len, d_k) + (batch_size, num_heads, ctx_len, d_v)
    + (QK^T)V = (..., num_heads, seq_len, seq_len) + (..., num_heads, seq_len, d_v)
    + t_softmax = (..., seq_len, seq_len)
    + t_out = (..., d_model)
    + swiglu up = (..., d_ff)
    + swiglu silu = (..., d_ff)
    + swiglu gate = (..., d_ff)
    + swiglu down = (..., d_model)
    
    then for the rest:
    + rmsnorm = (2 * num_layers + 1) * (batch_size, ctx_len, d_model) 
    + out_emb = (..., vocab_size)
    + cross entropy = (..., vocab_size)
- **gradients**:
    + same as parameters count
- **optimizer state**:
    + 2 * parameters count (m + v momentum tensor statistics)

and for total memory:

`total bytes = 4 * (parameter_elements + activation_elements + gradient_elements + optimizer_state_elements)`

### FLOPs for one AdamW step

```
m = beta1*m + (1-beta1)*grad       ~ 3 FLOPs
v = beta2*v + (1-beta2)*grad^2     ~ 4 FLOPs
weight decay                       ~ 1-2 FLOPs
sqrt(v) + eps                      ~ 2 ops plus sqrt
update ratio / step                ~ 2 FLOPs
parameter subtraction              ~ 1 FLOP

so for total -> FLOPs = (c * parameters count) where c is roughly (3+4+2+2+2+1)
```

### training time

assuming single h100, 50% MFU, 400k steps, 1024 batch size

**how much it would take?**

- total_training_FLOPs = 6 * parameters count * tokens
- tokens = batch_size * ctx_len * steps
- MFU = total_training_FLOP/s / h100_promised_FLOP/s
- training_time_seconds = total_training_FLOP/s * (MFU / 2)

-> `training_time_hours = training_time_seconds / (60 * 60)`

*i won't calculate everything again to just plug-in values and get a final number...i'm a bit lazy...*

## training

...
