# ai theory

## RoPE

Attention is *permutation invariant* (e.g. position 1 and position 69 are "the same"), that means the position of the token is not taken in count by attention mechanism.

The original Transformer paper used to sum a *positional encoding* embedding to the word embedding, mixing semantic with positional informations (bad).

Some strategies to encode positional informations directly into the attention mechanism have been tried, but the best one is *RoPE (Rotational Positional Embeddings)*.

### wtf?

I think this is actually the most used word after glancing at RoPE.

[[formulas#RoPE]]

> The $q, k$ heads, individually, get paired up two by two ($\frac{d_{\text{head}}}{2}$) and each pair is rotated by *frequency*: $\theta_i = base^{\frac{-2i}{d_{\text{head}}}}$ via the rotation matrix $R$

- It's a dot product because we don't want to mix stuffs (with a sum), but instead measure how well a tuple of tokens "align" (thanks to the angle)
- Applied to $Q,K$ because they are responsible for information routing, and we want to act on routing not on information meaning
- Even though each have an *absolute* position (let's say $m$ and $n$), thanks to being *orthogonal*, we can just look for the *relative* position $(n - m)$. 
- It's important to differentiate between $q/k$ pairs and *token pairs*. $q/k$ pairs are pair of dimensions in the same token.
- We work on pairs interleaved: $(q_i, q_{i+1})$ or other convention: $(q_i, q_{i+\frac{d}{2}})$ (same with $k$), so we can actually rotate the vector (otherwise we would be unable to do so on a 1D vector)
- The frequency varies based on the token's pair positions: taken $t_m$ and $t_n$ with positions $m,n$, then each $q/k$ pair shift $\Delta \cdot \theta_i$, where $\Delta$ is the deciding factor for the phase (how much each pair has rotated): <- *need to revise/explore this a bit more, but for now g2g*
    - $\Delta$ high (far-apart tokens): the fast pairs have wrapped, so the \textbf{slow} pairs carry the clean positional signal.
    - $\Delta$ low (nearby tokens): the fast pairs give a large, sharp phase difference, cleanly differentiating neighbors (slow pairs barely move).

