# OpenAI provider UX beta evidence

This folder contains screenshots for the beta branch that combines the OpenAI-compatible image description provider, durable queued generation, provider settings UX, and live smoke-test workflow.

## Screenshots

- `desktop-local-models-tab.png` shows the local model selection tab.
- `desktop-openai-models-tab.png` shows the OpenAI-compatible provider tab before live testing.
- `openai-live-connection-passed.png` shows the OpenAI-compatible provider active with an environment key and a passed live connection test.
- `openai-generated-description-visible.png` shows a real OpenAI-generated description persisted on a meme detail page.

## Local testing

Set `OPENAI_API_KEY` in `.env`, then run:

```sh
cd meme_search/meme_search_app
RAILS_ENV=test mise exec -- bin/smoke_openai_description
```

The smoke test loads `.env`, switches the description provider to OpenAI-compatible mode for the run, calls the configured vision model, verifies a non-empty generated description, and rolls database changes back.
