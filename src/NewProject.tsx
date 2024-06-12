"use client"

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
      message: `Width must be at least ${min}.`,
    })
    .max(max, { message: `Width must be less than ${max}.` }),
  height: z
    .number()
    .positive()
    .min(min, {
      message: `Height must be at least ${min}}.`,
    })
    .max(max, { message: `Height must be less than ${max}.` }),
})

import { useState, useCallback } from "react"

function NewProject() {
  const router = useRouter()
  const prefs = usePreferenceStore.use.prefs()

  const [link, setLink] = useState(false)
  const [colorDepth, setColorDepth] = useState<8 | 16>(8)
  const setPrefs = usePreferenceStore.use.setPrefs()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      width: prefs.canvasWidth,
      height: prefs.canvasHeight,
    },
    reValidateMode: "onBlur",
  })

  const handleWidth = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      form.clearErrors()
      const value = Number(event.target.value)

      form.setValue("width", value)

      if (link) form.setValue("height", value)
    },
    [link],
  )

  const handleHeight = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      form.clearErrors()

      const value = Number(event.target.value)

      form.setValue("height", value)

      if (link) form.setValue("width", value)
    },
    [link],
  )

  const handleLink = useCallback(() => setLink(!link), [link])

  const handleColorDepth = useCallback(() => setColorDepth(colorDepth === 8 ? 16 : 8), [colorDepth])

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    setPrefs({
      canvasWidth: values.width,
      canvasHeight: values.height,
      colorDepth,
    })
    document.cookie = "allow-edit=true;SameSite=Strict"
    router.push("/canvas")
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
                      <Input
                        {...field}
                        inputMode="numeric"
                        className="w-[6ch] p-0 text-center"
                        onChange={handleWidth}
                      />
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
                        <Input
                          {...field}
                          inputMode="numeric"
                          className="w-[6ch] p-0 text-center"
                          onChange={handleHeight}
                        />
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
