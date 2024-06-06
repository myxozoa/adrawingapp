import "@/index.css"

import dynamic from "next/dynamic"

const NewProject = dynamic(() => import("@/NewProject"), { ssr: true })

export default function Page() {
  return <NewProject />
}
