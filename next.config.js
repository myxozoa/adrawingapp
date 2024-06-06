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
}

export default nextConfig
