import type { Metadata } from "next"

import { Inter } from "next/font/google"

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })

export const metadata: Metadata = {
  title: "A Drawing App",
  description: "Digital Painting Application",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <div id="root">{children}</div>
        <a id="local_filesaver" target="_blank" rel="noopener" className="hidden"></a>
      </body>
    </html>
  )
}
