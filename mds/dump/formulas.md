# formulas cheatsheet

## Cross-entropy loss

$$
\ell(\theta; \mathcal{D})
=
\frac{1}{|\mathcal{D}|\,m}
\sum_{x\in\mathcal{D}}
\sum_{i=1}^{m}
-\log p_{\theta}\!\left(x_{i+1}\mid x_{1:i}\right)
$$

> [!note]
> $\frac{1}{|D|} \sum_{x \in D}$ -> how much the model predict wrong based on the dataset size 
>
> thanks to the *empirical average*, for the *law of large numbers*, with a big enough dataset, we can approximate the true distribution

$$
p(x_{i+1}\mid x_{1:i})
=
\operatorname{softmax}(o_i)[x_{i+1}]
=
\frac{\exp\!\left(o_i[x_{i+1}]\right)}
{\sum_{a=1}^{\mathrm{vocab\_size}}
\exp\!\left(o_i[a]\right)}.
$$

with $o_i[k]$ indexing into logits and taking k logit

### Entropy

$$
H(P) = \log_2(\frac{1}{p}) = log_{\frac{1}{2}}(p_i) = -\log_2(p_i)
$$

$$
H(P,Q) = \sum p_i (-\log_2(q_i))
$$

### KL Divergence

$$
D_{KL}(P,Q) = H(P, Q) - H(P)
$$

## Perplexity

$$
\text{perplexity} = \exp(\frac{1}{m}\sum_{i=1}^m \ell_i)
$$

easy way to interpret cross entropy: $1$ perfect, $\leq 1$ good, $\gt 1$ not good

## AdamW

$$
\begin{array}{rll}
1 & \operatorname{init}(\theta) & \triangleright\ \text{Initialize learnable parameters} \\[0.35em]
2 & m \gets 0 & \triangleright\ \text{Initial value of the first moment vector; same shape as } \theta \\[0.35em]
3 & v \gets 0 & \triangleright\ \text{Initial value of the second moment vector; same shape as } \theta \\[0.35em]
4 & \mathbf{for}\ t = 1, \ldots, T\ \mathbf{do} & \\[0.35em]
5 & \quad \text{Sample batch of data } B_t & \\[0.35em]
6 & \quad g \gets \nabla_{\theta}\ell(\theta; B_t) & \triangleright\ \text{Compute the gradient of the loss} \\[0.35em]
7 & \quad \alpha_t \gets \alpha \frac{\sqrt{1-\beta_2^t}}{1-\beta_1^t} & \triangleright\ \text{Compute adjusted } \alpha \text{ for iteration } t \\[0.35em]
8 & \quad \theta \gets \theta - \alpha\lambda\theta & \triangleright\ \text{Apply weight decay} \\[0.35em]
9 & \quad m \gets \beta_1 m + (1-\beta_1)g & \triangleright\ \text{Update the first moment estimate} \\[0.35em]
10 & \quad v \gets \beta_2 v + (1-\beta_2)g^2 & \triangleright\ \text{Update the second moment estimate} \\[0.35em]
11 & \quad \theta \gets \theta - \alpha_t \frac{m}{\sqrt{v}+\epsilon} & \triangleright\ \text{Apply moment-adjusted weight updates} \\[0.35em]
12 & \mathbf{end\ for} &
\end{array}
$$

<small>Reference videos by yacine: 
<a href="https://www.youtube.com/watch?v=M4HQHmBrAmI">Adam</a>
and
<a href="https://www.youtube.com/watch?v=PTRk4vNcM-g">AdamW</a>
</small>

## Self-Attention

$$
\text{Attention}(Q,K,V) = \text{attn\_score} \cdot V
$$

$$
\text{attn\_score} = \text{softmax}({\frac{QK^T}{\sqrt{d_{head}}}})
$$

### Multi-Head Self-Attention

$$
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)
$$

$$
\text{MultiHeadSelfAttention}(x) = W_O \text{MultiHead}(W_Q x, W_K x, W_v x)
$$

## RMS Norm

$$
\text{RMSNorm}(x_i) = \frac{x_i}{RMS(x)} \cdot \gamma_i
$$

$$
RMS(x) = \sqrt{\frac{1}{D} \sum_{j=1}^D x_j^2 + \epsilon}
$$

## SwiGLU

$$
\text{SiLU}(x) = x \cdot \sigma (x) = \frac{x}{1 + \exp{-x}}
$$

$$
\text{GLU}(x, W_1, W_2) = \sigma(W_1 x) \odot W_2 x
$$

$$
\text{FFN}(x) = \text{SwiGLU}(x, W_\text{up}, W_\text{down}, W_\text{gate}) = W_\text{down}(\text{SiLU}(W_\text{up} x) \odot W_\text{gate} x)
$$


## RoPE

$$
\langle R_m q, R_n k \rangle = q^T R_m^T R_n k = q^T R_{n-m}k
$$

- $q, k$ are single heads
- $R$ is the rotation matrix, used to rotate each $q/k$ pair by frequency $\theta_i = base^{\frac{-2i}{d_{\text{head}}}}$
