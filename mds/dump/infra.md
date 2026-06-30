# infra

## Techniques for optimization via parallelism

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



