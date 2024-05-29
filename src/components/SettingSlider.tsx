import { Slider } from "@/components/ui/slider"
import { compareProps } from "@/utils/utils"
import { SliderProps } from "@radix-ui/react-slider"

import { Label } from "@/components/ui/label"

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
      <Label className="pr-2" htmlFor={`setting_slider_${name}`}>
        {name}
      </Label>
      <Slider
        id={`setting_slider_${name}`}
        className="mr-2 w-28"
        {...props}
        value={[value]}
        onValueChange={valueChange}
      />
      <Label className="w-[3ch]" htmlFor={`setting_slider_${name}`}>
        {value.toFixed(fractionDigits)}
      </Label>
    </div>
  )
}

export const SettingSlider = memo(_SettingSlider, compareProps(["value"]))
