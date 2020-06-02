# deep-assoc-completion for vscode

A work-in-progress extension for vscode similar to it's [phpstorm counterpart](https://plugins.jetbrains.com/plugin/9927-deep-assoc-completion)

If you are getting irrelevant global keywords in key completion, you most likely want to untick the _PHP > Suggest: Basic_ in vscode Preferences

![](https://user-images.githubusercontent.com/5202330/80292312-84a06080-875e-11ea-8585-d6005cb9beda.png)

![image](https://user-images.githubusercontent.com/5202330/80915892-c97b5700-8d5d-11ea-894b-e7d549a7a3d7.png)

Place caret between quotes when typing the associative array key and hit _Ctrl+Space_ to get completions

Supposedly will achieve this: https://github.com/bmewburn/vscode-intelephense/issues/249

Uses [vscode-intelephense](https://github.com/bmewburn/vscode-intelephense) for php syntax tree traversal.

List of features implemented so far: (yet to be updated)
- Specify associative array keys in phpdoc for completion and type inference with [PSALM](https://github.com/vimeo/psalm/blob/master/docs/annotating_code/type_syntax/array_types.md#object-like-arrays) format.
- Infer array key types
- Infer function call result types
- ...

vscode repo page: https://marketplace.visualstudio.com/items?itemName=klesun.deep-assoc-completion-vscode

# Steps to run

- `git clone` [this project](https://github.com/klesun/deep-assoc-completion-vscode)
- run `npm ci` (if you forget to do that you'll get `The terminal process terminated with exit code: 1` error)
- open this project root in vscode
- hit F5 to run sandbox instance of vscode with this extension plugged in


# Misc

Smoke Tests repository: https://github.com/klesun-misc/deep-assoc-lsp-tests

______________________________________________

This extension is an order we received on https://klesun-productions.com

Thanks to Louis and Mike for being homies
