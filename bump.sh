set -e && cd `pwd`

yarn publish . --non-interactive --tag latest 
git tag $npm_package_version
git push origin --tags 

yarn version --patch
readonly VERSION=$(< package.json grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[:space:]')
git commit --amend -m "^ pkg bump ($VERSION) [skip-ci]" 
git push origin

echo \"Successfully released version $npm_package_version!\"