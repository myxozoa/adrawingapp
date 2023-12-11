function Container({ children, className }: { children: React.ReactNode, className: string }) {
  return (
    <div className={`flex flex-col items-center m-1 ${className}`}>
      {children}
    </div>
  )
}

export default Container
