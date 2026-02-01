#!/usr/bin/env bash
set -euo pipefail

# Problem summary:
# - Provider DNS servers return SERVFAIL for GitHub domains -> "Could not resolve host".
# - IPv6 connectivity is broken; TLS over IPv6 ends early -> "unexpected eof while reading".
# Fix:
# - Use public DNS resolvers + DNS-over-TLS (DoT) to bypass bad port-53 filtering.
# - Disable IPv6 to force stable IPv4 TLS until IPv6 routing is fixed.

iface="$(ip -4 route show default | awk 'NR==1{print $5}')"
iface="${iface:-eth0}"

mac="$(cat "/sys/class/net/${iface}/address")"
ipv4_cidr="$(ip -o -4 addr show dev "$iface" | awk 'NR==1{print $4}')"
ipv6_cidr="$(ip -o -6 addr show dev "$iface" scope global | awk 'NR==1{print $4}')"
gw4="$(ip -4 route show default dev "$iface" | awk 'NR==1{print $3}')"
gw6="$(ip -6 route show default dev "$iface" | awk 'NR==1{print $3}')"
search_domain="$(resolvectl domain "$iface" 2>/dev/null | awk '{for (i=2;i<=NF;i++) if ($i!="~.") {print $i; exit}}')"

if [[ -z "$ipv4_cidr" || -z "$gw4" ]]; then
  echo "Failed to detect IPv4 address or gateway on ${iface}."
  exit 1
fi

# Backup current netplan
netplan_file="/etc/netplan/50-cloud-init.yaml"
if [[ -f "$netplan_file" ]]; then
  cp "$netplan_file" "${netplan_file}.bak-$(date +%F-%H%M%S)"
fi

# Rebuild netplan from detected live config, but replace DNS servers.
# This keeps your actual IPs/GWs intact while fixing the resolver problem.
{
  echo "network:"
  echo "  version: 2"
  echo "  ethernets:"
  echo "    ${iface}:"
  echo "      match:"
  echo "        macaddress: \"${mac}\""
  echo "      addresses:"
  echo "      - \"${ipv4_cidr}\""
  if [[ -n "${ipv6_cidr}" ]]; then
    echo "      - \"${ipv6_cidr}\""
  fi
  echo "      nameservers:"
  echo "        addresses:"
  echo "        - 1.1.1.1"
  echo "        - 1.0.0.1"
  echo "        - 8.8.8.8"
  echo "        - 8.8.4.4"
  if [[ -n "${search_domain}" ]]; then
    echo "        search:"
    echo "        - ${search_domain}"
  fi
  echo "      set-name: \"${iface}\""
  echo "      routes:"
  echo "      - to: \"default\""
  echo "        via: \"${gw4}\""
  if [[ -n "${gw6}" ]]; then
    echo "      - to: \"default\""
    echo "        via: \"${gw6}\""
  fi
} > "$netplan_file"

netplan apply

# Enable DNS-over-TLS so queries aren't filtered/poisoned on port 53.
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/99-dot.conf << 'EOF'
[Resolve]
DNS=1.1.1.1#cloudflare-dns.com 1.0.0.1#cloudflare-dns.com 8.8.8.8#dns.google 8.8.4.4#dns.google
FallbackDNS=
DNSOverTLS=yes
Domains=~.
EOF
systemctl restart systemd-resolved

# Disable IPv6 because HTTPS/TLS is failing over IPv6 on this VPS.
# If you need IPv6, fix the provider routing instead and remove this file.
cat > /etc/sysctl.d/99-disable-ipv6.conf << 'EOF'
net.ipv6.conf.all.disable_ipv6=1
net.ipv6.conf.default.disable_ipv6=1
EOF
sysctl --system >/dev/null

echo "Done. Verify:"
echo "  resolvectl query github.com"
echo "  curl -I https://raw.githubusercontent.com"
echo "  curl -fsSL https://opencode.ai/install | bash"
