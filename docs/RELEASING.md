# Releasing p5.book

For maintainers. See [Contributing](../CONTRIBUTING.md) for everyday changes.

The [release workflow](../.github/workflows/release.yml) runs on pushes to `main`, `v*` tags, and manual dispatch. It compares `package.json` with the published npm version and skips publishing when they match. A version change pushed to `main` can therefore publish a release.

1. Check the changes locally with `npm run build` and exercise the affected books in `npm test`.
2. Update the version in `package.json` and its lockfile together.
3. Review `npm pack --dry-run` to inspect the package contents.
4. Commit and push the reviewed release changes. Check the Release to npm workflow in GitHub Actions.
5. Tag the release with the matching `v` version if desired; the workflow skips a version already published.

Publishing uses npm trusted publishing with provenance. Configure npm to trust this repository and its release workflow before the first release; no `NPM_TOKEN` is required. If publishing fails, inspect the workflow logs and trusted-publisher configuration.
