#!/bin/bash
# Inspired by Svelte Kit

get_abs_filename() {
  # $1 : relative filename
  echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
}

DIR=$(get_abs_filename $(dirname "$0"))
TMP=$(get_abs_filename "$DIR/../node_modules/.tmp")

mkdir -p $TMP
cd $TMP

# Set git info
git config --global user.email "fuma-nama@noreply.com"
git config --global user.name "Fuma Nama"

# clone the template repo
rm -rf fumadocs-ui-template
git clone --depth 1 --single-branch --branch main https://github.com/fuma-nama/fumadocs-ui-template.git

# empty out the repo
cd fumadocs-ui-template
node $DIR/update-git-repo.js $TMP/fumadocs-ui-template

# commit the new files (if necessary)
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit or push."
else
  git add -A
  git commit -m "version $npm_package_version"
  git push https://github.com/fuma-nama/fumadocs-ui-template.git main -f
fi
