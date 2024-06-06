import { SettingSlider } from "@/components/SettingSlider"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePreferenceStore } from "@/stores/PreferenceStore"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export const PreferenesDialog = () => {
  const setPrefs = usePreferenceStore.use.setPrefs()
  const prefs = usePreferenceStore.use.prefs()

  const coalescedEventsSupported = PointerEvent.prototype.getCoalescedEvents !== undefined

  return (
    <>
      <DialogHeader>
        <DialogTitle>Preferences</DialogTitle>
      </DialogHeader>

      <SettingSlider
        name={"Pressure Sensitivity"}
        value={prefs.pressureSensitivity}
        onValueChange={(pressureSensitivity) => setPrefs({ pressureSensitivity })}
        fractionDigits={2}
        min={0}
        max={1}
        step={0.01}
      />

      <SettingSlider
        name={"Pressure Smoothing"}
        value={((1 - prefs.pressureSmoothing) * 10) / 10}
        onValueChange={(pressureSmoothing) => setPrefs({ pressureSmoothing: 1 - pressureSmoothing })}
        fractionDigits={2}
        min={0}
        max={0.99}
        step={0.01}
      />

      <SettingSlider
        name={"Mouse Smoothing"}
        value={((1 - prefs.mouseSmoothing) * 10) / 10}
        onValueChange={(mouseSmoothing) => setPrefs({ mouseSmoothing: 1 - mouseSmoothing })}
        fractionDigits={2}
        min={0}
        max={0.99}
        step={0.01}
      />

      <div className="flex items-center space-x-2">
        <Switch
          id="pressure"
          onCheckedChange={() => setPrefs({ usePressure: !prefs.usePressure })}
          checked={prefs.usePressure}
        />
        <Label htmlFor="pressure">Use Pen Pressure</Label>
      </div>

      {!coalescedEventsSupported ? (
        <p className="text-sm text-destructive"> It seems your device does not support Coalesced Events</p>
      ) : null}
      <div className="flex items-center space-x-2">
        <Switch
          disabled={!coalescedEventsSupported}
          id="coalescedEvents"
          onCheckedChange={() => setPrefs({ useCoalescedEvents: !prefs.useCoalescedEvents })}
          checked={prefs.useCoalescedEvents}
        />
        <Label htmlFor="pressure">Use Coalesced Pointer Events</Label>
      </div>
    </>
  )
}
