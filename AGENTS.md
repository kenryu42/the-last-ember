# Pre-release compatibility policy

The Last Ember has not been released. Breaking changes are acceptable.

- Do not add migrations, legacy-schema readers, compatibility shims, or fallback
  behavior solely to preserve old saves, settings, APIs, or experimental formats.
- Update code, schemas, callers, tests, and current documentation together. Old
  development data may become invalid; do not silently upgrade it.
- Add migration or backward-compatibility support only when the user explicitly
  requests it. Do not introduce save-preservation confirmation steps as a substitute.
- Keep validation of current data and handling of malformed input or unavailable
  storage. These are correctness requirements, not migration support.
- Explicit CLI experiment/control variants are not migrations. Keep them only
  for active comparisons, with explicit configuration rather than inferred legacy
  defaults. Archived experiment results need not load in current tools.
