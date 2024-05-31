import dynamic from "next/dynamic"

const App = dynamic(() => import("@/App"), { ssr: true })

export function ClientOnly() {
  return <App />
}
