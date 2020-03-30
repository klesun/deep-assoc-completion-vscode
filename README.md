# deep-assoc-completion for vscode

A yet to be implemented extension for vscode similar to it's [phpstorm counterpart](https://github.com/klesun/deep-assoc-completion)

An order we received on https://klesun-productions.com

Will most likely be based on [vscode-intelephense](https://github.com/bmewburn/vscode-intelephense) as either an additional module or a pull request.

Supposedly will achieve this: https://github.com/bmewburn/vscode-intelephense/issues/249

List of features: (yet to be updated)
- Specify associative array keys in phpdoc for completion and type inference. Either with [PSALM](https://github.com/vimeo/psalm/blob/master/docs/annotating_code/type_syntax/array_types.md#object-like-arrays) format or [deep-assoc](https://github.com/klesun/deep-assoc-completion/issues/63) format, or both.
- Infer array key types
- Provide completion and GoTo functionality for array keys
- Infer types of arguments inside anonymous functions like in `array_map()`
- Function usage based argument type inference
- ...
