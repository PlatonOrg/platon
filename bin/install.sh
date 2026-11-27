#!/usr/bin/env bash
# Authorize the execution of this script from anywhere
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR/.."


function print_status() {
  local status="$1"
  local message="$2"
  local color="$3"

  echo -e "${color}${status}: ${message}${Color_Off}"
}

function command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# COLORS
# Reset
Color_Off=$'\e[0m' # Text Reset

# Regular Colors
Red=$'\e[0;31m'    # Red
Green=$'\e[0;32m'  # Green
Yellow=$'\e[0;33m' # Yellow
Purple=$'\e[0;35m' # Purple
Cyan=$'\e[0;36m'   # Cyan

OS=$(uname -s)

echo -e "${Purple}\nChecking dependencies...\n${Color_Off}"

# Checking if Docker is installed
if ! command_exists docker; then
  print_status "docker" "ERROR - Docker must be installed (see: https://docs.docker.com/engine/installation/linux/docker-ce/debian/)." "$Red"
  exit 1
fi
print_status "docker" "OK !" "$Green"



# Install yarn if not installed
if ! command_exists yarn; then
  npm install -g yarn
fi
print_status "yarn" "OK !" "$Green"


if [ "$OS" = "Darwin" ]; then # Mac OS
  if ! hash brew; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  fi
  print_status "brew" "OK !" "$Green"

  if ! command_exists openssl; then
    brew install openssl
  fi
  print_status "openssl" "OK !" "$Green"
else # Linux
  if ! command_exists openssl; then
    print_status "ERROR" "openssl should be installed. visit https://cloudwafer.com/blog/installing-openssl-on-ubuntu-16-04-18-04/" "$Red"
    exit 1
  fi
  print_status "openssl" "OK !" "$Green"
  if ! command_exists update-ca-certificates; then
    sudo apt-get install ca-certificates
  fi
  print_status "update-ca-certificates" "OK !" "$Green"
fi


echo -e "${Purple}\nGenerating files...\n${Color_Off}"

if [[ ! -f .env ]]; then
  cp ./templates/.env.example .env
fi
echo -e ".env:$Green OK !$Color_Off"

if [[ ! -f ./tools/database/init.json ]]; then
  cp ./templates/init.example.json ./tools/database/init.json
fi
echo -e "./tools/database/init.json:$Green OK !$Color_Off"


CERTS_DIR=.docker/nginx/ssl/certs
ROOT_CA_NAME="PLaTon-Local-Root-CA"
LINUX_ROOT_CA_PATH=/usr/local/share/ca-certificates/platon-local-root-ca.crt

mkdir -p "$CERTS_DIR"
mkdir -p .docker/nginx/ssl/dhparam

# Local root CA: it is the only certificate added to the system trust store, it signs the server certificates below.
function generate_root_ca() {
  openssl req -x509 -new -nodes -newkey rsa:4096 -sha256 -days 3650 \
    -subj "/CN=$ROOT_CA_NAME" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" \
    -keyout "$CERTS_DIR/rootCA.key" \
    -out "$CERTS_DIR/rootCA.crt"
}

# generate_server_cert <name> <subjectAltName>: server certificate signed by the local root CA.
# 825 days is the maximum validity accepted by macOS for a server certificate.
function generate_server_cert() {
  local name="$1"
  local san="$2"
  local ext="$CERTS_DIR/$name.ext"

  cat >"$ext" <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=$san
EOF

  openssl req -new -nodes -newkey rsa:2048 -subj "/CN=localhost" \
    -keyout "$CERTS_DIR/$name.key" \
    -out "$CERTS_DIR/$name.csr"
  openssl x509 -req -sha256 -days 825 \
    -in "$CERTS_DIR/$name.csr" \
    -CA "$CERTS_DIR/rootCA.crt" -CAkey "$CERTS_DIR/rootCA.key" -CAcreateserial \
    -extfile "$ext" \
    -out "$CERTS_DIR/$name.crt"

  rm -f "$ext" "$CERTS_DIR/$name.csr"
}

# Missing, expired or not signed by the current root CA (e.g. the former self-signed localhost certificate)
function server_cert_is_valid() {
  local name="$1"
  [[ -f "$CERTS_DIR/$name.crt" && -f "$CERTS_DIR/$name.key" ]] &&
    openssl verify -CAfile "$CERTS_DIR/rootCA.crt" "$CERTS_DIR/$name.crt" >/dev/null 2>&1 &&
    openssl x509 -checkend 0 -noout -in "$CERTS_DIR/$name.crt" >/dev/null 2>&1
}

# Former installs trusted a self-signed localhost certificate directly: remove it from the trust store.
function untrust_legacy_cert() {
  local cert="$CERTS_DIR/localhost.crt"
  if [[ ! -f "$cert" ]] || [[ "$(openssl x509 -noout -subject -in "$cert")" != "$(openssl x509 -noout -issuer -in "$cert" | sed 's/^issuer/subject/')" ]]; then
    return
  fi

  if [ "$OS" = "Darwin" ]; then
    local sha1
    sha1=$(openssl x509 -noout -fingerprint -sha1 -in "$cert" | cut -d= -f2 | tr -d :)
    sudo security delete-certificate -Z "$sha1" /Library/Keychains/System.keychain >/dev/null 2>&1 || true
  else
    sudo rm -f /usr/local/share/ca-certificates/localhost.crt
    sudo update-ca-certificates --fresh >/dev/null
  fi
}

function trust_root_ca() {
  if [ "$OS" = "Darwin" ]; then
    if ! security verify-cert -c "$CERTS_DIR/rootCA.crt" >/dev/null 2>&1; then
      sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERTS_DIR/rootCA.crt"
    fi
  else
    if ! cmp -s "$CERTS_DIR/rootCA.crt" "$LINUX_ROOT_CA_PATH"; then
      sudo cp "$CERTS_DIR/rootCA.crt" "$LINUX_ROOT_CA_PATH"
      sudo update-ca-certificates
    fi
  fi
}

if [[ ! -f "$CERTS_DIR/rootCA.crt" || ! -f "$CERTS_DIR/rootCA.key" ]]; then
  echo ""
  generate_root_ca
fi
trust_root_ca
echo -e "$CERTS_DIR/rootCA.crt:$Green OK !$Color_Off"

# nginx (https://localhost), also reached from containers (Moodle) through host.docker.internal or platon_nginx
if ! server_cert_is_valid localhost; then
  echo ""
  untrust_legacy_cert
  generate_server_cert localhost "DNS:localhost,DNS:host.docker.internal,DNS:platon_nginx,IP:127.0.0.1"
fi
echo -e "$CERTS_DIR/localhost.crt:$Green OK !$Color_Off"

# Local Moodle used to test LTI (docker-compose.moodle.yml, https://localhost:8443)
if ! server_cert_is_valid moodle; then
  echo ""
  generate_server_cert moodle "DNS:localhost,IP:127.0.0.1"
fi
echo -e "$CERTS_DIR/moodle.crt:$Green OK !$Color_Off"

if [[ ! -f .docker/nginx/ssl/dhparam/dhparam.pem ]]; then
  openssl dhparam -out .docker/nginx/ssl/dhparam/dhparam.pem 2048
fi
echo -e ".docker/nginx/ssl/dhparam/dhparam.pem:$Green OK !\n$Color_Off"
