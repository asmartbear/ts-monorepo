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

# copy all the files except some
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.vscode' --exclude='.tsbuildinfo' \
    --exclude='dist' --exclude='.gitignore' --exclude='coverage' \
    "$SRC" packages/