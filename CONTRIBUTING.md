# Contributing to p5.book

You can help by reporting a problem, improving an explanation, sharing a book or workshop activity, or changing the code.

[Open an issue](https://github.com/munusshih/p5.book/issues/new/choose) and pick the form that fits. For questions, use a blank issue. If someone has already reported the same problem, add a comment there. For a larger code change, start an issue to discuss it first; small fixes can go straight to a pull request.

## Working on the code

New to GitHub? The [illustrated walkthrough](https://p5-book.vercel.app/test/) covers setup, making your first edit, and opening a pull request.

If you already use Git, fork and clone the repository, create a branch, then run:

```sh
npm install
npm run previews:setup
npm test
```

`npm test` opens the book gallery for manual testing. Keep it running while you edit; saving a file reloads the preview.

| What you’re editing | Folder |
| --- | --- |
| Library and book viewer | `src-lib/` |
| Documentation and workshops | `src/pages/` |
| Documentation sketches | `src/examples/` |
| Example books | `test/` |
| Website components and styles | `src/components/` and `src/styles/` |

Edit the library in `src-lib/`; `p5.book.js` is generated. More on builds and preview caching in [Development notes](docs/DEVELOPMENT.md).

## Sending a pull request

Describe what changed and how you checked it. For code or site changes, run `npm run build` and try the affected page or book. If you changed book output, check the exported PDF too. For text edits, check links and instructions.

Draft PRs are fine if you’d like help. If a check didn’t work, include the error. Follow-up edits go on the same branch.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md).
