# Development notes

For setup and pull requests, see [Contributing](../CONTRIBUTING.md).

## Build commands

- `npm run dev` starts the development server without opening a browser.
- `npm run lib:build` rebuilds `p5.book.js` from `src-lib/`.
- `npm run lib:watch` watches just the library source.
- `npm run build` builds the library and documentation site.

The dev server rebuilds the library when `src-lib/` changes. Example books load that local bundle alongside the dependencies in `test/lib/`.

## Example previews

The gallery reuses the site's `Worksheet` layout and the workshop's shared
`ProjectCard` component. It discovers every `test/<folder>/` containing
`index.html` and `sketch.js`. Set the title and description using the same comment
convention as the documentation examples:

```js
// title: My first remix
// description: An alphabet book with pink pages and smaller letters.
```

Dev startup and `npm run build` run each changed sketch in headless Chromium,
wait for its completed book, and capture the actual rendered cover. Previews are
cached in `test-previews/` and committed to the repository. The cache uses hashes of the sketch folder, shared fonts,
libraries, and renderer. Saving a sketch regenerates its preview in the background;
unchanged examples reuse their images. Removing a folder removes its preview.
Build output includes the generated images in `dist/test/previews/`.

`npm run test:previews` forces a refresh. No browser is launched when all previews
are cached. A broken sketch fails the production build with its folder name; dev
reports the error in the terminal and retries on the next save. A preview is the
cover, so edits to interior pages will show in the book but may not change its image.

Builds can reuse up-to-date previews without a browser. If any previews need
regenerating, the build environment needs Chromium. On Linux CI, install it and
its OS dependencies with `npx playwright install --with-deps chromium`;
installing npm packages alone does not install Chromium.

For publishing, see [Releasing](RELEASING.md).
