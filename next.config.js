import withBundleAnalyzer from "@next/bundle-analyzer"

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/canvas",
        missing: [
          {
            type: "cookie",
            key: "allow-edit",
            value: "true",
          },
        ],
        permanent: false,
        destination: "/",
      },
    ]
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(vert|frag)$/,
      use: ["raw-loader"],
    })

    return config
  },
  experimental: {
    optimizePackageImports: ["@fluentui/react-icons", "@radix-ui/react-icons"],
  },
}

export default bundleAnalyzer(nextConfig)
