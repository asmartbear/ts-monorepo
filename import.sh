#!/bin/bash

SRC="$1"
if test ! -d "$SRC"; then
    echo "Argument must be a directory with a .git repository and package.json"
    exit 1
fi
if test ! -d "$SRC/.git"; then
    echo "Argument must be a directory with a .git repository and package.json"
    exit 1
fi
if test ! -f "$SRC/package.json"; then
    echo "Argument must be a directory with a .git repository and package.json"
    exit 1
fi

NAME=`basename $SRC`
echo $NAME

DST="packages/$NAME/"
PACKAGE_JSON="${DST}package.json"
TSCONFIG_JSON="${DST}tsconfig.json"

# copy all the files except some
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.vscode' --exclude='.tsbuildinfo' \
    --exclude='dist' --exclude='.gitignore' --exclude='coverage' --exclude="package-lock.json" \
    "$SRC/" "$DST"

# update package.json
sed -i '' -e 's/git@github.com:asmartbear\/.*\.git/git@github.com:asmartbear\/ts-monorepo.git/' "$PACKAGE_JSON"
sed -i '' -e 's/github\.com\/asmartbear\/.*\/issues/github.com\/asmartbear\/ts-monorepo\/issues/' "$PACKAGE_JSON"

# remove scripts we don't like
jq 'del(.scripts.release, .scripts.postpublish, .scripts.prepare, .scripts.postbuild, .scripts.minify, .scripts.lint, .scripts."postcoverage")' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

# remove dependencies we don't want
jq 'del(.devDependencies."standard-version", .devDependencies."open-cli", .devDependencies."uglify-js", .devDependencies."tslint")' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

# set dev dependencies we do want
jq '.devDependencies."@types/jest" = "^30.0.0" | .devDependencies."@types/mocha" = "^10.0.10" | .devDependencies."@types/node" = "^24.10.1" | .devDependencies."jest" = "^30.2.0" | .devDependencies."rimraf" = "^6.1.2" | .devDependencies."ts-jest" = "^29.4.5" | .devDependencies."ts-loader" = "^9.5.4" | .devDependencies."typescript" = "^5.9.3"' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

# set output files and types
jq '.main = "dist/index.js" | .types = "dist/index.d.ts"' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

# set clean script to include everything
jq '.scripts.clean = "rimraf dist *.tsbuildinfo coverage"' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

# updates @asmartbear package dependencies to be monorepo
jq '(.dependencies // {} | with_entries(if .key | startswith("@asmartbear/") then .value = "*" else . end)) as $deps |
    (.devDependencies // {} | with_entries(if .key | startswith("@asmartbear/") then .value = "*" else . end)) as $devDeps |
    .dependencies = $deps | .devDependencies = $devDeps' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

# update JEST configuration for composite typescript
jq '.jest.transform["^.+\\.tsx?$"] = ["ts-jest", {"tsconfig": {"composite": false}}] | .jest.moduleNameMapper = {"^@asmartbear/(.*)$": "<rootDir>/../$1/src"}' "$PACKAGE_JSON" > tmp.json && mv tmp.json "$PACKAGE_JSON"

# update tsconfig.json for composites and to put the dist files in a sensible spot
jq '.compilerOptions.composite = true | .compilerOptions.rootDir = "./src"' "$TSCONFIG_JSON" > tmp.json && mv tmp.json "$TSCONFIG_JSON"

# install and update packages
(
    npm install --workspace="packages/$NAME" &&
    npm run build --workspace="packages/$NAME" &&
    npm run test --workspace="packages/$NAME"
)