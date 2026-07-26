#!/usr/bin/env bash
#
# Shared helpers for the release scripts. Source this from the repo root;
# it is not meant to be executed directly.
#
# Used by publish.sh (what needs publishing) and verify-published.sh (did it
# actually land). Both need the same two primitives, so they live here rather
# than being copy-pasted into each.

# npm's CDN can lag a moment behind a just-completed publish, so a single 404
# is not proof of absence. Retry before believing it.
readonly REGISTRY_MAX_ATTEMPTS=3
readonly REGISTRY_RETRY_DELAY_SECONDS=2

readonly PACKAGES_DIR="packages"

# Emits one "<directory>\t<name>\t<version>" line per publishable workspace
# package, skipping any marked "private" in its package.json.
list_publishable_packages() {
    node -e '
        const fs = require("fs");
        const path = require("path");
        const packagesDir = process.argv[1];
        for (const entry of fs.readdirSync(packagesDir).sort()) {
            const dir = path.join(packagesDir, entry);
            const manifest = path.join(dir, "package.json");
            if (!fs.existsSync(manifest)) continue;
            const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
            if (pkg.private) continue;
            process.stdout.write(`${dir}\t${pkg.name}\t${pkg.version}\n`);
        }
    ' "$PACKAGES_DIR"
}

# Returns 0 if the exact "<name>@<version>" spec already exists on the registry.
# `npm view` on an exact version prints it when present and fails otherwise;
# restricted packages resolve via the ambient auth that publishing requires anyway.
is_published() {
    local spec="$1"
    local attempt=1

    while true; do
        if npm view "$spec" version >/dev/null 2>&1; then
            return 0
        fi
        if ((attempt >= REGISTRY_MAX_ATTEMPTS)); then
            return 1
        fi
        sleep "$REGISTRY_RETRY_DELAY_SECONDS"
        ((attempt++))
    done
}
