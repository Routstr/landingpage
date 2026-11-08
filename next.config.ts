import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Next/Turbopack walks up, finds the
  // stray /home/user/package-lock.json and infers /home/user as the workspace
  // root — then it tries to index/watch the whole home dir (~3.8M files).
  turbopack: {
    root: __dirname,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "unavatar.io",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "image.nostr.build",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "blossom.primal.net",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
