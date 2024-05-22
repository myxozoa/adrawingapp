import { Slider } from "@/components/ui/slider"
import { SliderProps } from "@radix-ui/react-slider"

interface SettingSliderProps extends Omit<SliderProps, "value" | "onValueChange"> {
  name: string
  value: number
  onValueChange: (value: number) => void
  fractionDigits: number
}

export function SettingSlider({ name, value, onValueChange, fractionDigits, ...props }: SettingSliderProps) {
  const valueChange = (value: number[]) => onValueChange(value[0]) // Radix UI uses values in arrays to support multiple thumbs

  return (
    <div key={`${name}_setting`} className="flex w-fit flex-row items-center justify-center">
      <p className="pr-2 text-sm text-muted-foreground">{name}</p>
      <Slider className="mr-2 w-28" {...props} value={[value]} onValueChange={valueChange} />
      <p className="w-[3ch] text-sm text-muted-foreground">{value.toFixed(fractionDigits)}</p>
    </div>
  )
}
