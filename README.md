# Monorepo for common Typescript modules

See the packages directory.

## Setup

```bash
brew install jq
npm i
```

## Creating and releasing versions

```bash
# Indicate which modules are updated, as you work
npx changeset add

# Release - builds and tests everything, tagging with new version only if it works
npm run version

# Commit with one last look
git add .
git commit -m "Version packages"

# Publish to `npm` - run this in a real terminal, expect a browser passkey prompt
npm run publish
```

### Publishing notes

`npm run publish` runs `publish.sh` → `verify-published.sh` → `git push --follow-tags`.
It publishes any package whose local version isn't on the registry yet, tags each
success, confirms everything landed, and only then pushes. It's safe to re-run:
already-published packages are skipped, so if a release dies halfway, just run it
again.

To see what a release *would* do without publishing anything:

```bash
./publish.sh --dry-run
```

Two things to know:

- **Run it from a real terminal.** npm only opens the browser passkey prompt when
  stdin/stdout are a TTY. Piping the output somewhere, or running it from a script
  or tool that redirects stdin, makes the 2FA step fail.
- **The publish step deliberately doesn't use `changeset publish`.** Changesets has
  its own one-time-password prompt that only accepts authenticator codes, so it
  can't do passkeys — and it exits 0 even when a publish fails. Changesets is still
  used for `changeset add` / `changeset version`. See CLAUDE.md for the details.

If a publish fails partway, `verify-published.sh` blocks the push and lists exactly
which packages are missing, so `main` never advertises a version npm doesn't have.