/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "limitlesstcg.s3.us-east-2.amazonaws.com" },
      { protocol: "https", hostname: "limitlesstcg.nyc3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "limitless3.nyc3.cdn.digitaloceanspaces.com" },
      { protocol: "https", hostname: "r2.limitlesstcg.net" },
      { protocol: "https", hostname: "play.limitlesstcg.com" },
    ],
  },
};

module.exports = nextConfig;
