import type { Metadata } from "next"

import { Arimo } from "next/font/google"

// If loading a variable font, you don't need to specify the font weight
const arimo = Arimo({ subsets: ["latin"], variable: "--font-Arimo", display: "swap" })

export const metadata: Metadata = {
  title: "A Drawing App",
  description: "Digital Painting Application",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={arimo.className}>
      <body>
        <div id="root">{children}</div>
        <a id="local_filesaver" target="_blank" rel="noopener" className="hidden"></a>
      </body>
    </html>
  )
}
