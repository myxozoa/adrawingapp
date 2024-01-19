function Container({ children, className }: { children: React.ReactNode; className: string }) {
  return <div className={`m-0.5 flex flex-col items-center rounded-sm ${className}`}>{children}</div>
}

export default Container
