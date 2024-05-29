import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "A Drawing App",
  description: "Digital Painting Application",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
        <a id="local_filesaver" target="_blank" rel="noopener" className="hidden"></a>
      </body>
    </html>
  )
}
