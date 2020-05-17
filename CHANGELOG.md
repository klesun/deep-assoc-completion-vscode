
# Change Log

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
