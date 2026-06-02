# ai infra

## Techniques for optimization via parallelism

LLM models are really big, loading them in their entirety inside the GPU is unfeasible (and slow).

So our great researchers found some ways to optimize this process:

### Data parallelism

(Divide inputs in batches, each batch goes into a different GPU, each GPU contains a copy of the Model)

<img src="../../data-parallelism.png" alt="data-parallelism" style="width:100%" />

<small>Reference: <a href="https://www.youtube.com/watch?v=4i76hmmnJEo">Simon Oz (YouTube)</a></small>

### Pipeline parallelism

<img src="../../pipeline-parallelism.png" alt="pipeline-parallelism" style="width:100%" />

<small>Reference: <a href="https://www.youtube.com/watch?v=4i76hmmnJEo">Simon Oz (YouTube)</a></small>

### Tensor parallelism

<img src="../../tensor-parallelism.png" alt="tensor-parallelism" style="width:100%" />

<small>Reference: <a href="https://www.youtube.com/watch?v=4i76hmmnJEo">Simon Oz (YouTube)</a></small>

### Expert parallelism (MoE)
