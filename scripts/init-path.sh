#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${HOME}/.local/bin"

mkdir -p "${BIN_DIR}"

create_wrapper() {
  local name="$1"
  local target="$2"
  local wrapper_path="${BIN_DIR}/${name}"

  cat > "${wrapper_path}" <<EOF
#!/usr/bin/env bash
set -euo pipefail
exec ${target} "\$@"
EOF
  chmod +x "${wrapper_path}"
}

# Wrapper commands
create_wrapper "xser12-bot" "node \"${PROJECT_DIR}/dist/index.js\""
create_wrapper "xser12-control-contract" "node \"${PROJECT_DIR}/dist/tools/control_plane_contract.js\""
create_wrapper "xser12-gateway-smoke" "node \"${PROJECT_DIR}/dist/tools/php_gateway_smoke.js\""
create_wrapper "xser12-webhook-test" "bash \"${PROJECT_DIR}/webhook_test.sh\""

PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'
for profile in "${HOME}/.bashrc" "${HOME}/.profile" "${HOME}/.zshrc"; do
  if [[ ! -f "${profile}" ]]; then
    touch "${profile}"
  fi
  if ! grep -Fq "${PATH_LINE}" "${profile}"; then
    printf '\n%s\n' "${PATH_LINE}" >> "${profile}"
  fi
done

echo "Installed wrappers to: ${BIN_DIR}"
echo "Commands:"
echo "  xser12-bot"
echo "  xser12-control-contract"
echo "  xser12-gateway-smoke"
echo "  xser12-webhook-test"
echo
echo "Run this once in current shell:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
