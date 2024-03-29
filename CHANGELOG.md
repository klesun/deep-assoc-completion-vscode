
# Change Log

## [v0.9.0 - 2022-03-20]

- Fix, argument array keys completion did not work for methods
- Worked only for functions

## [v0.8.1 - 2022-03-20]

- Fix, plugin failed to activate starting from vdcode v1.53 due to .js defaulting to es6 imports by default in newer versions of node

## [v0.8.1 - 2022-03-20]

- Fix, plugin failed to activate starting from vdcode v1.53 due to .js defaulting to es6 imports by default in newer versions of node

## [v0.8.1 - 2022-03-20]

- Fix, plugin failed to activate starting from vdcode v1.53 due to .js defaulting to es6 imports by default in newer versions of node

## [v0.8.0 - 2020-06-04]

- Support key assignment to a var

## [v0.7.0 - 2020-06-04]

- Support vars assigned in if-else branches and loops

## [v0.7.0 - 2020-06-02]

- Override `php.suggest.basic` IDE config to disable irrelevant global completions in php files

## [v0.6.0 - 2020-05-30]

- Support aliases in imported types

## [v0.5.0 - 2020-05-25]

- Add support for @psalm-import-type
- Add support for @psalm-type
- Parse traditional Type[] phpdoc annotation as well
- Handle first method doc comment being outside of the ClassMemberDeclarationList parent

## [v0.4.0 - 2020-05-24]

- Support psalm @return type
- Support psalm param type for methods as well, not just script functions

## [0.3.0 - 2020-05-18]

- Add string value === completion

## [0.2.5 - 2020-05-18]

- Exclude typescript lib files not required by ts-node from extension package

## [0.2.4 - 2020-05-18]

- Oh, damn, you need to run `npm update` when your dependency points to master

## [0.2.3 - 2020-05-18]

- Forgot to `npm i` the fix

## [0.2.2 - 2020-05-18]

- Fix, do not flood CPU with errors of logs directory being missing

## [0.2.1 - 2020-05-18]

- Fix, completion from other files did not work unless you opened them
- Support tuple arrays and track associative array value types

## [0.2.0 - 2020-05-06]

- Support foreach

## [0.1.10 - 2020-05-03]

- Show auto-popup when typing func arg keys
- Add AST ceche debounce, so that there was no more issue of PSI being out of sync with actual text

## [0.1.9 - 2020-05-03]

- Support $arr["someKey"] when resolving types

## [0.1.8 - 2020-05-03]

- Provide basic completion of function argument array keys

## [0.1.7 - 2020-05-03]

- Update extension page meta data

## [0.1.6 - 2020-05-03]

- Open completion popup automatically when you type [ or ' (without the need to press _ctrl + space_)

## [0.1.5 - 2020-04-27]

- Provide completion of associative array keys when acceesed on a variable
- Support typing from PSALM `@param` phpdoc
