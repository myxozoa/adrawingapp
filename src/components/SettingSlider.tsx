import { Slider } from "@/components/ui/slider"
import { compareProps } from "@/utils/utils"
import { SliderProps } from "@radix-ui/react-slider"

import { useCallback } from "react"

import { memo } from "react"

interface SettingSliderProps extends Omit<SliderProps, "value" | "onValueChange"> {
  name: string
  value: number
  onValueChange: (value: number) => void
  fractionDigits: number
}

function _SettingSlider({ name, value, onValueChange, fractionDigits, ...props }: SettingSliderProps) {
  const valueChange = useCallback((value: number[]) => onValueChange(value[0]), []) // Radix UI uses values in arrays to support multiple thumbs

  return (
    <div key={`${name}_setting`} className="flex w-fit flex-row items-center justify-center">
      <p className="pr-2 text-sm text-muted-foreground">{name}</p>
      <Slider className="mr-2 w-28" {...props} value={[value]} onValueChange={valueChange} />
      <p className="w-[3ch] text-sm text-muted-foreground">{value.toFixed(fractionDigits)}</p>
    </div>
  )
}

export const SettingSlider = memo(_SettingSlider, compareProps(["value"]))
