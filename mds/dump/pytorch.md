# pytorch

## nn.Module

an `nn.Module` child class (e.g `Linear`) must always call the super constructor in the init, because internal state must be initialized (ordered dicts for *parameters*, *buffers*, *child modules* and such)

e.g. `W` in Linear (created via `nn.Parameter`), thanks to the super init, will be registered into `self.__parameters` ordered dict (and this dict will be used by pytorch internal mechanism such as `model.parameters()`, `.to()`, `.train()` and such)
