# Learnings

## 2026-02-21 Task 1

- Single-player map selection is bound to `config.weather` in `Controller.startGame` and uses `Math.floor(Math.random() * weatherConfig.length)` as the random index source.
- A safe deterministic debug override can stay fully pre-check based: parse env once, validate integer/range, then only replace the chosen index value.
- Playwright QA can validate runtime config behavior by importing browser modules in `page.evaluate` and calling `controller.startGame(true)` directly.
