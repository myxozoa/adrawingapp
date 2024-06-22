function _Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`m-0.5 flex flex-col items-center rounded-md ${className}`}>{children}</div>
}

export const Container = _Container
