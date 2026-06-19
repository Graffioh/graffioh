# pytorch

## nn.Module

an `nn.Module` child class (e.g `Linear`) must always call the super constructor in the init, because internal state must be initialized (ordered dicts for *parameters*, *buffers*, *child modules* and such)

e.g. `W` in Linear (created via `nn.Parameter`), thanks to the super init, will be registered into `self.__parameters` ordered dict (and this dict will be used by pytorch internal mechanism such as `model.parameters()`, `.to()`, `.train()` and such)

## init parameters

- `torch.ones` for multiplicative gain/bias parameters, so we start with identity and then we slowly learn the best gain/bias
- `torch.zeros` for additive bias where the initial desired contribution is 0
- random distributions for weight matrices
