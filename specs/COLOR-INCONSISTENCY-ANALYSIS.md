# Color Parsing & String Handling — Resolution Report

Last updated: 2026-03-18

## Status

All previously identified color parsing and color-string handling inconsistencies have been resolved in the current codebase.

## Current Behavior (Source of Truth)

### Supported input formats in `Color.parse`

- Named colors (case-insensitive), e.g. `Red`, `AliceBlue`, `Transparent`
- Named color with prefixed opacity, e.g. `0.5;Red`
- Hex shorthand: `#rgb`, `#rgba`
- Hex full: `#rrggbb`, `#rrggbbaa`
- CSS functions: `rgb(r,g,b)`, `rgba(r,g,b,a)`

### 8-digit hex ordering

8-digit hex is standardized on web/CSS order:

- `#rrggbbaa`

### Error handling

`Color.parse` throws `ErrorMessages.InvalidColorString` for invalid or unrecognized color strings.

### Output functions

- `toHexString()` => `#rrggbb` or `#rrggbbaa`
- `toStyleString()` => `rgb(r,g,b)` or `rgba(r,g,b,a)`
- `toString()` => `Transparent`, named color, `alpha;NamedColor`, or hex

### Transparency object safety

`Color.parse('Transparent')` returns a new `Color` instance (not a shared mutable singleton).

### Alpha handling consistency

- `FillInfo` and `StrokeInfo` preserve parsed color alpha via hex output and do not mutate parsed color instances.
- Rendering paths consistently use `Color` conversion methods rather than ad hoc hardcoded `rgba(...)` literals.

## Notes on `equalsHue`

`equalsHue` intentionally compares only RGB components and ignores alpha. `isNamedColor` relies on that behavior.

## Verification

Changes were validated with the test suite:

- 16 test suites passed
- 189 tests passed

## Historical Context

This file previously contained a pre-fix inconsistency analysis. It has been replaced with this post-fix resolution report to keep the specification set aligned with current implementation.
