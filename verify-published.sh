#!/usr/bin/env bash
#
# Release guard: verifies that every workspace package's local version is
# actually live on the npm registry. Runs between publish.sh and `git push` so
# a failed publish can never push the version commit.
#
# publish.sh already fails loudly on a bad publish, so this is a backstop
# rather than the primary check — it catches the case where a publish reports
# success but nothing reached the registry. That is not hypothetical: the old
# `changeset publish` exited 0 having published nothing, and the `&&` in the
# release script happily pushed the version commit after it, leaving main
# advertising a version npm had never received.
#
# Idempotent — safe to re-run after fixing whatever broke the publish.

set -euo pipefail

cd "$(dirname "$0")"
# shellcheck source=release-lib.sh
source ./release-lib.sh

missing=()
checked=0

while IFS=$'\t' read -r _dir name version; do
    checked=$((checked + 1))
    if ! is_published "${name}@${version}"; then
        missing+=("${name}@${version}")
    fi
done < <(list_publishable_packages)

if ((checked == 0)); then
    echo "verify-published: found no publishable packages under ${PACKAGES_DIR}/ — refusing to push." >&2
    exit 1
fi

if ((${#missing[@]} > 0)); then
    echo "" >&2
    echo "verify-published: publish did NOT complete. Missing from the registry:" >&2
    for spec in "${missing[@]}"; do
        echo "  ✗ ${spec}" >&2
    done
    echo "" >&2
    echo "Refusing to push — main would advertise versions npm never received." >&2
    echo "Fix the publish (see the output above), then re-run 'npm run publish'." >&2
    exit 1
fi

echo "verify-published: all ${checked} packages confirmed on the registry."
