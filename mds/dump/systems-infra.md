# systems & infra

## GPU 

### Overall differences with CPU

- **CPU**: sequential/concurrent thread execution BUT really fast, "burst" efficient (how much accomplish in a short amount of time)
- **GPU**: slow on burst execution but a lot better on final throughput, parallel (how much accomplish at the end of execution)

### Memory hierarchy

from fastest/closest to slowest/farthest:

| level | where it lives | typical latency | capacity | relative access cost | notes |
| --- | --- | ---: | ---: | ---: | --- |
| registers | per thread, inside SM | ~1 cycle | KBs per SM | 1x | fastest storage; used for scalar temporaries and fragments |
| shared memory / L1 | per SM, on-chip SRAM | ~20-40 cycles | ~100-200 KB per SM | ~5-10x | explicitly managed cache/scratchpad; key for tiled matmuls |
| L2 cache | shared across SMs, on-chip SRAM | ~100-300 cycles | MBs | ~20-50x | catches cross-SM/global reuse |
| HBM / global memory | GPU package, off-chip DRAM | ~300-800 cycles | GBs | ~100-300x | high bandwidth, but expensive per access |
| CPU DRAM | host memory over PCIe/NVLink | ~microseconds | GBs/TBs | ~1k-10k+x | only tolerable for coarse transfers |
| SSD / disk | storage | ~10s-100s of microseconds | TBs | huge | checkpoint/data loading, never inner-loop compute |

> [!note]
> "cost" here means data-movement/access cost. The main rule is: reuse data as much as possible while it is still high in the hierarchy -> shared memory...l1/l2 cache cant be controlled.

#### SRAM vs DRAM

- **SRAM**: really fast, no charge leak so no refresh (6 transistors to store a single bit, no capacitors), expensive
- **DRAM**: slow, charge leak (1 transistor and 1 capacitor), cheap

### Optimization techniques

#### Control divergence

in threads all instructions needs to be executed, this will lead to idle time in branching, so avoid it possible:

<img src="/dump/img/control-divergence.png" alt="control-divergence" style="width:60%" />

#### Fused ops

<img src="/dump/img/fused-ops.png" alt="fused ops memory and compute diagram" style="width:60%" />

#### Low precision improves arithmetic intensity

*if you have fewer bits, you have fewer bits to move*: 

fp32 (4 bytes per op, read & write: 8 bytes intensity) -> fp16 (2 bytes, read & write: 4 bytes intensity), half the memory!

as explained in [[chip-design#Matmuls]], the standard is to use mixed precision to prevent rounding errors:

- mul & pointwise ops -> fp16
- sum, reduction ops & loss -> fp32

#### Memory coalescing

DRAM, is built in a way that whenever a value is requested, it actually delivers the value and some other contiguous values near it (*burst* reading)

so the aim is to have threads of a warp loading from the same burst section

<img src="/dump/img/coalesced-loads.png" alt="coalesced loads burst section diagram" style="width:60%" />

it's similar to cache locality, so row major matrices are not coalesced during a matmul because we are jumping between burst sections

#### Tiling (important)

smartly move memory usage from global memory to shared memory

with *matrix tiling* this is possible, by dividing up the matrices in smaller grids, so that they can fit in shared memory.

basically threads in a block cooperatively load a tile of the matrices from DRAM to shared memory and then perform operations in there, we do this for every tile

from $O(N^3)$ global memory access down to $O(\frac{N^3}{T})$ with $T$ tile size

> [!note]
> the size of the matrix is important for tiling, to avoid misalignment and extra unused tiles
>
> generally, the matrix should be: size powers of 2 and ideally divisible by 16/32 (so it can fit the burst section size for coalesced reads)

also the number of tiles must fit inside the GPU shared memory size otherwise there will be drops in performance (*wave quantization*)

## Techniques for distributed optimization (via parallelism)

LLM models are really big, loading them in their entirety inside the GPU is unfeasible (and slow).

So our great researchers found some ways to optimize this process:

### Data parallelism

(Divide inputs in batches, each batch goes into a different GPU, each GPU contains a copy of the Model)

<img src="/dump/img/data-parallelism.png" alt="data-parallelism" style="width:60%" />

<small>Reference: <a href="https://www.youtube.com/watch?v=4i76hmmnJEo">Simon Oz (YouTube)</a></small>

### Pipeline parallelism

<img src="/dump/img/pipeline-parallelism.png" alt="pipeline-parallelism" style="width:60%" />

<small>Reference: <a href="https://www.youtube.com/watch?v=4i76hmmnJEo">Simon Oz (YouTube)</a></small>

### Tensor parallelism

<img src="/dump/img/tensor-parallelism.png" alt="tensor-parallelism" style="width:60%" />

<small>Reference: <a href="https://www.youtube.com/watch?v=4i76hmmnJEo">Simon Oz (YouTube)</a></small>

### Expert parallelism (MoE)

[[theory.md#MoE (Mixture of Experts)]]

...

## GGUF

from the god [Georgi Gerganov](https://github.com/ggerganov)

it's a convenient file that act as a "container" for model weights and config. It contains data (weights actual values, quantized) and metadata (e.g. the model config: layers and such).

<img src="/dump/img/gguf-spec.png" alt="gguf-spec" style="width:60%" />

<small>Reference: <a href="https://huggingface.co/docs/hub/gguf">GGUF (Hugging Face)</a></small>
