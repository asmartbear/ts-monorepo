# Monorepo for common Typescript modules

See the packages directory.

## Setup

```bash
brew install jq
npm i
```

## Creating and releasing versions

```bash
# Add work
npx changeset add

# Release
npm run version
git add .
git commit -m "Version packages"
npm run publish]
```