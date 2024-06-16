"use client"

import { useState, useCallback, useEffect } from "react"
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

import { Link1Icon, LinkNone1Icon } from "@radix-ui/react-icons"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

let maxTextureSize = 1000
if (typeof document !== "undefined") {
  let gl = document.createElement("canvas").getContext("webgl") as WebGL2RenderingContext
  maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
  // @ts-expect-error This is set on purpose
  gl = undefined
}

const min = 20
const max = maxTextureSize

const formSchema = z.object({
  width: z
    .number()
    .positive()
    .min(min, {
      message: `Width must be at least ${min}px.`,
    })
    .max(max, { message: `Width must be less than ${max}px.` }),
  height: z
    .number()
    .positive()
    .min(min, {
      message: `Height must be at least ${min}px.`,
    })
    .max(max, { message: `Height must be less than ${max}px.` }),
  ppi: z
    .number()
    .positive()
    .min(1, { message: "PPI should probably be much higher." })
    .max(2400, { message: "Unlikely to work with a PPI that high" }),
})

const units = ["cm", "in", "px"] as const

function NewProject() {
  const router = useRouter()
  const prefs = usePreferenceStore.use.prefs()

  const [link, setLink] = useState(false)
  const [colorDepth, setColorDepth] = useState<8 | 16>(8)
  const [unit, setUnit] = useState<(typeof units)[number]>("px")
  const setPrefs = usePreferenceStore.use.setPrefs()

  useEffect(() => {
    router.prefetch("/canvas")
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      width: prefs.canvasWidth,
      height: prefs.canvasHeight,
      ppi: prefs.canvasPPI,
    },
    reValidateMode: "onBlur",
  })

  const toPixels = (unit: (typeof units)[number], value: number) => {
    const ppi = form.getValues("ppi")

    if (unit === "cm") return value * (ppi / 2.54)
    if (unit === "in") return value * ppi
    if (unit === "px") return Math.round(value)

    throw new Error(`Invalid unit`)
  }

  const toUnit = (unit: (typeof units)[number], value: number) => {
    const ppi = form.getValues("ppi")

    if (unit === "cm") return (value / ppi) * 2.54
    if (unit === "in") return value / ppi
    if (unit === "px") return Math.round(value)

    throw new Error("Invalid unit")
  }

  const handleWidth = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      form.clearErrors()
      const value = Number(event.target.value)

      form.setValue("width", value, { shouldValidate: false, shouldDirty: true, shouldTouch: true })

      if (link) form.setValue("height", value, { shouldValidate: false, shouldDirty: true, shouldTouch: true })
    },
    [link],
  )

  const handleHeight = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      form.clearErrors()

      const value = Number(event.target.value)

      form.setValue("height", value, { shouldValidate: false, shouldDirty: true, shouldTouch: true })

      if (link) form.setValue("width", value, { shouldValidate: false, shouldDirty: true, shouldTouch: true })
    },
    [link],
  )

  const handlePPI = (event: React.ChangeEvent<HTMLInputElement>) => {
    form.clearErrors()

    const value = Number(event.target.value)

    form.setValue("ppi", value, { shouldValidate: false, shouldDirty: true, shouldTouch: true })
    form.clearErrors()
  }

  const handleLink = useCallback(() => setLink(!link), [link])

  const handleColorDepth = useCallback(() => setColorDepth(colorDepth === 8 ? 16 : 8), [colorDepth])

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    setPrefs({
      canvasWidth: toPixels(unit, values.width),
      canvasHeight: toPixels(unit, values.height),
      canvasPPI: values.ppi,
      colorDepth,
    })
    document.cookie = "allow-edit=true;SameSite=Strict"
    router.push("/canvas")
  }

  const handleUnitChange = (value: (typeof units)[number]) => {
    // 1 inch = 2.54 centimeter
    const previousUnit = unit
    const newUnit = value

    setUnit(newUnit)

    {
      const previousPixels = toPixels(previousUnit, form.getValues("width"))
      const newUnitValue = toUnit(newUnit, previousPixels)

      form.setValue("width", newUnitValue, { shouldValidate: false, shouldDirty: true, shouldTouch: true })
    }

    {
      const previousPixels = toPixels(previousUnit, form.getValues("height"))
      const newUnitValue = toUnit(newUnit, previousPixels)

      form.setValue("height", newUnitValue, { shouldValidate: false, shouldDirty: true, shouldTouch: true })
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden">
      <Form {...form}>
        {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
        <form onSubmit={form.handleSubmit(handleSubmit)} className="rounded-sm border p-10">
          <div className="flex w-full items-center">
            <div className="pr-5">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem className="flex items-center pb-2">
                    <FormLabel className="pr-12">Width:</FormLabel>
                    <FormControl>
                      <>
                        <Input
                          {...field}
                          inputMode="numeric"
                          className="w-[6ch] p-0 text-center"
                          onChange={handleWidth}
                        />
                        <Select value={unit} onValueChange={handleUnitChange}>
                          <SelectTrigger className="rounded-l-none pl-4">
                            <SelectValue placeholder="Format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {units.map((unit: string, index: number) => (
                                <SelectItem key={`exportFormat${index}`} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <div className="flex flex-row items-center pb-2">
                      <FormLabel className="pr-11">Height:</FormLabel>
                      <FormControl>
                        <>
                          <Input
                            {...field}
                            inputMode="numeric"
                            className="w-[6ch] p-0 text-center"
                            onChange={handleHeight}
                          />
                          <Select value={unit} onValueChange={handleUnitChange}>
                            <SelectTrigger className="rounded-l-none pl-4">
                              <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {units.map((unit: string, index: number) => (
                                  <SelectItem key={`exportFormat${index}`} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </>
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Toggle variant={"outline"} className="h-8 w-8 p-0" onClick={handleLink}>
                {link ? <Link1Icon className="h-4 w-4" /> : <LinkNone1Icon className="h-4 w-4" />}
              </Toggle>
            </div>
          </div>
          <div className="flex w-full items-center pb-2">
            <FormField
              control={form.control}
              name="ppi"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex flex-row items-center pb-2">
                    <FormLabel className="pr-16">PPI:</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="numeric" className="w-[6ch] p-0 text-center" onChange={handlePPI} />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex w-full items-center pb-2">
            <p className="cursor-default pr-2.5 text-sm font-normal leading-none text-muted-foreground">
              Color Depth:{" "}
            </p>
            <Select defaultValue={colorDepth.toString()} onValueChange={handleColorDepth}>
              <SelectTrigger className="pl-4">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={"8"}>8bit</SelectItem>
                  <SelectItem value={"16"}>16bit</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button variant={"outline"} type="submit">
            New Project
          </Button>

          {Object.entries(form.formState.errors).map((error) => {
            return <FormMessage key={error[0]}>{error[1].message}</FormMessage>
          })}
        </form>
      </Form>
    </div>
  )
}

export default NewProject
