export function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -right-32 -top-40 h-[440px] w-[560px] rounded-full bg-modality/8 blur-[120px] animate-aurora" />
      <div className="absolute -bottom-48 left-1/4 h-[360px] w-[460px] rounded-full bg-modality-2/6 blur-[120px] animate-float" />
      <div className="dot-grid absolute inset-0 opacity-20" />
      <div className="absolute inset-0 bg-linear-to-b from-background/5 via-transparent to-background/45" />
    </div>
  )
}
