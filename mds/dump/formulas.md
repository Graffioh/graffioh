# formulas cheatsheet

## Attention

$$
\text{Attention}(Q,K,V) = \text{attn\_score} \cdot V
$$

$$
\text{attn\_score} = \text{softmax}({\frac{QK^T}{\sqrt{d_{head}}}})
$$

- we need to apply a *causal mask* on attn_score (so during training, we avoid looking at future tokens and cheating)

## RoPE

$$
\langle R_m q, R_n k \rangle = q^T R_m^T R_n k = q^T R_{n-m}k
$$

- $q, k$ are single heads
- $R$ is the rotation matrix, used to rotate each $q/k$ pair by frequency $\theta_i = base^{\frac{-2i}{d_{\text{head}}}}$

## RMS Norm

