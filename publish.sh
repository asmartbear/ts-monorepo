#!/usr/bin/env bash
#
# Publishes every workspace package whose local version isn't on the npm
# registry yet, then creates the matching git tag for each one.
#
# Usage:
#   ./publish.sh              # publish for real
#   ./publish.sh --dry-run    # report what would be published, touch nothing
#
# WHY THIS EXISTS INSTEAD OF `changeset publish`
#
# Changesets implements its own OTP prompt (see the "Enter one-time password:"
# string in node_modules/@changesets/cli/dist/) which accepts only a typed TOTP
# code from an authenticator app. npm's own CLI handles 2FA in two ways
# (npm/lib/utils/auth.js): if the registry returns authUrl/doneUrl it opens a
# browser for a WebAuthn/passkey challenge, and only otherwise falls back to a
# typed code. Going through Changesets meant never reaching npm's passkey
# branch — an unanswerable prompt for an account whose only second factor is a
# passkey. Calling `npm publish` directly keeps us on npm's flow.
#
# Second reason: `changeset publish` exits 0 even when publishes fail, which
# once let a failed release push its version commit anyway. `npm publish`
# reports failure honestly and `set -e` propagates it.
#
# Changesets is still used for `changeset add` and `changeset version` — this
# replaces the publish step only.
#
# REQUIRES AN INTERACTIVE TERMINAL. npm only opens the browser-based passkey
# flow when stdin and stdout are both a TTY; otherwise it rethrows the 2FA
# error. Don't run this from a wrapper that redirects stdin.

set -euo pipefail

cd "$(dirname "$0")"
# shellcheck source=release-lib.sh
source ./release-lib.sh

dry_run=false
if [[ ${1:-} == "--dry-run" ]]; then
    dry_run=true
elif [[ -n ${1:-} ]]; then
    echo "publish.sh: unknown argument '$1' (expected --dry-run or nothing)" >&2
    exit 1
fi

# Collect the package list up front rather than streaming it into the loop.
# A `while read ... < <(...)` binds the loop body's stdin to the process
# substitution, which would make npm see a non-TTY stdin and silently skip the
# passkey flow. Reading into an array first leaves the real terminal on stdin.
packages=()
while IFS= read -r line; do
    packages+=("$line")
done < <(list_publishable_packages)

if ((${#packages[@]} == 0)); then
    echo "publish.sh: found no publishable packages under ${PACKAGES_DIR}/" >&2
    exit 1
fi

published=()
skipped=0

for line in "${packages[@]}"; do
    IFS=$'\t' read -r dir name version <<<"$line"
    spec="${name}@${version}"

    if is_published "$spec"; then
        skipped=$((skipped + 1))
        continue
    fi

    if $dry_run; then
        echo "  would publish  ${spec}"
        published+=("$spec")
        continue
    fi

    echo ""
    echo "==> Publishing ${spec}"
    # Order doesn't matter here: intra-repo dependencies are declared as "*",
    # so no package needs a sibling on the registry first.
    (cd "$dir" && npm publish)
    published+=("$spec")

    # Tag only after the publish succeeds, so a tag always means "this is live".
    if git rev-parse -q --verify "refs/tags/${spec}" >/dev/null; then
        echo "    tag ${spec} already exists — leaving it"
    else
        git tag "$spec"
        echo "    tagged ${spec}"
    fi
done

echo ""
if ((${#published[@]} == 0)); then
    echo "publish.sh: nothing to publish — all ${skipped} packages are already on the registry."
else
    if $dry_run; then
        echo "publish.sh: --dry-run — ${#published[@]} package(s) would publish, ${skipped} already current."
    else
        echo "publish.sh: published ${#published[@]} package(s), skipped ${skipped} already current:"
        for spec in "${published[@]}"; do
            echo "  ✓ ${spec}"
        done
    fi
fi
