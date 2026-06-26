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

- $\frac{1}{|D|} \sum_{x \in D}$ is a way to get an approximation of probability distribution from the dataset
- $\frac{1}{m} \sum_{i=1}^{m}$ is to gather the per-token probability of the whole sequence

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


