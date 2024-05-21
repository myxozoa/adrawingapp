/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // Outputs a Single-Page Application (SPA).
  distDir: "./dist", // Changes the build output directory to `./dist/`.
  reactStrictMode: true,
  webpack: (config, options) => {
    config.module.rules.push({
      test: /\.(vert|frag)$/,
      use: ["raw-loader"],
    })

    return config
  },
}

export default nextConfig
