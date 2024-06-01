import { Slider } from "@/components/ui/slider"
import { compareProps } from "@/utils/utils"
import { SliderProps } from "@radix-ui/react-slider"

import { Label } from "@/components/ui/label"

import { useCallback } from "react"

import { memo } from "react"

interface SettingSliderProps extends Omit<SliderProps, "value" | "onValueChange"> {
  name: string
  id?: string
  value: number
  hideText?: boolean
  onValueChange: (value: number) => void
  fractionDigits: number
}

function _SettingSlider({ name, value, hideText, onValueChange, id, fractionDigits, ...props }: SettingSliderProps) {
  const valueChange = useCallback((value: number[]) => onValueChange(value[0]), [id]) // Radix UI uses values in arrays to support multiple thumbs

  return (
    <div key={`${name}_setting`} className="flex w-fit flex-row items-center justify-center">
      {!hideText ? <p className="pr-2 text-sm font-normal leading-none text-muted-foreground ">{name}l</p> : null}
      <Slider
        id={`setting_slider_${name}`}
        className="mr-2 w-28"
        {...props}
        value={[value]}
        onValueChange={valueChange}
      />
      {!hideText ? (
        <p className="w-[3ch] text-sm font-normal leading-none text-muted-foreground">
          {value.toFixed(fractionDigits)}
        </p>
      ) : null}
    </div>
  )
}

export const SettingSlider = memo(_SettingSlider, compareProps(["value", "id"]))
