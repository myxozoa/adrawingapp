import { Slider } from "@/components/ui/slider"

export function SettingSlider(
  name: string,
  value: number,
  _onValueChange: (value: number) => void,
  factionalDigits: number,
  props?: any,
) {
  const onValueChange = (value: number[]) => _onValueChange(value[0]) // Radix UI uses values in arrays to support multiple thumbs

  return (
    <div key={`${name}_setting`} className="flex w-fit flex-row items-center justify-center">
      {/* <div className="flex flex-row items-center justify-center"> */}
      <p className="pr-2 text-sm text-muted-foreground">{name}</p>
      <Slider className="mr-2 w-28" {...props} value={[value]} onValueChange={onValueChange} />
      <p className="w-[3ch] text-sm text-muted-foreground">{value.toFixed(factionalDigits)}</p>
      {/* </div> */}
    </div>
  )
}
