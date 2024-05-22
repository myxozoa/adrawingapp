/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(vert|frag)$/,
      use: ["raw-loader"],
    })

    return config
  },
  compiler: {
    removeConsole: {
      exclude: ["error"],
    },
  },
}

export default nextConfig
