# Y3 MCQ Review

A focused, repository-backed multiple-choice revision tool built with GPT Sites.

The published app supports:

- Study mode with immediate weighted feedback and explanations
- Exam mode with question selection, shuffling, optional timing, and deferred results
- Single-choice, multiple-choice, and true/false questions
- Markdown, LaTeX, code blocks, and repository-hosted question images
- Browser-local progress, wrong-answer review, bookmarks, and session recovery
- AI-readable WebMCP tools for listing the library, starting sessions, and clearing confirmed local progress

The initial release intentionally contains no course content. Question sets are maintained by AI coding agents as versioned JSON and image files in this repository. See [AGENTS.md](./AGENTS.md) for the authoring contract.

## Development

```bash
npm install
npm run dev
```

Before publishing:

```bash
npm run validate:content
npm test
npm run lint
npm run build
```

Question content is public because this repository and the deployed site are public. Study progress never leaves the visitor's browser.
