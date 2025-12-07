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

# Publish to `npm`
npm run publish
```