/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['nftstorage.link', 'gateway.pinata.cloud', 'ipfs.io'],
  },
}

module.exports = nextConfig
