import "@/index.css"

import dynamic from "next/dynamic"

const App = dynamic(() => import("@/App"), { ssr: true })

export default function Page() {
  return <App />
}
