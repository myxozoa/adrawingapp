import { SettingSlider } from "@/components/SettingSlider"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePreferenceStore } from "@/stores/PreferenceStore"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useCallback } from "react"

export const PreferenesDialog = () => {
  const setPrefs = usePreferenceStore.use.setPrefs()
  const prefs = usePreferenceStore.use.prefs()

  const coalescedEventsSupported = PointerEvent.prototype.getCoalescedEvents !== undefined

  const handlePressureSensitivity = useCallback((pressureSensitivity: number) => setPrefs({ pressureSensitivity }), [])
  const handlePressureSmoothing = useCallback(
    (pressureSmoothing: number) => setPrefs({ pressureSmoothing: 1 - pressureSmoothing }),
    [],
  )
  const handleMouseSmoothing = useCallback(
    (mouseSmoothing: number) => setPrefs({ mouseSmoothing: 1 - mouseSmoothing }),
    [],
  )
  const handleUsePressure = useCallback(() => setPrefs({ usePressure: !prefs.usePressure }), [prefs.usePressure])
  const handleCoalescedEvents = useCallback(
    () => setPrefs({ useCoalescedEvents: !prefs.useCoalescedEvents }),
    [prefs.useCoalescedEvents],
  )
  const handleZoomCompensation = useCallback(
    () => setPrefs({ zoomCompensation: !prefs.zoomCompensation }),
    [prefs.zoomCompensation],
  )
  return (
    <>
      <DialogHeader>
        <DialogTitle>Preferences</DialogTitle>
      </DialogHeader>

      <SettingSlider
        name={"Pressure Sensitivity"}
        value={prefs.pressureSensitivity}
        onValueChange={handlePressureSensitivity}
        fractionDigits={2}
        min={0}
        max={1}
        step={0.01}
      />

      <SettingSlider
        name={"Pressure Smoothing"}
        value={((1 - prefs.pressureSmoothing) * 10) / 10}
        onValueChange={handlePressureSmoothing}
        fractionDigits={2}
        min={0}
        max={0.99}
        step={0.01}
      />

      <SettingSlider
        name={"Mouse Smoothing"}
        value={((1 - prefs.mouseSmoothing) * 10) / 10}
        onValueChange={handleMouseSmoothing}
        fractionDigits={2}
        min={0}
        max={0.99}
        step={0.01}
      />

      <div className="flex items-center space-x-2">
        <Switch id="pressure" onCheckedChange={handleUsePressure} checked={prefs.usePressure} />
        <Label htmlFor="pressure">Use Pen Pressure</Label>
      </div>

      {!coalescedEventsSupported ? (
        <p className="text-sm text-destructive"> It seems your device does not support Coalesced Events</p>
      ) : null}
      <div className="flex items-center space-x-2">
        <Switch
          disabled={!coalescedEventsSupported}
          id="coalescedEvents"
          onCheckedChange={handleCoalescedEvents}
          checked={prefs.useCoalescedEvents}
        />
        <Label htmlFor="coalescedEvents">Use Coalesced Pointer Events</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="zoomCompensation" onCheckedChange={handleZoomCompensation} checked={prefs.zoomCompensation} />
        <Label htmlFor="zoomCompensation">Use Zoom Smoothing Compensation</Label>
      </div>
    </>
  )
}
