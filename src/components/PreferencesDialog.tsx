import { SettingSlider } from "@/components/SettingSlider"
import { DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { usePreferenceStore } from "@/stores/PreferenceStore"

export const PreferenesDialog = () => {
  const setPrefs = usePreferenceStore.use.setPrefs()
  const prefs = usePreferenceStore.use.prefs()

  return (
    <DialogHeader>
      <DialogTitle>Preferences</DialogTitle>
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
        name={"Pressure Filtering"}
        value={((1 - prefs.pressureFiltering) * 10) / 10}
        onValueChange={(pressureFiltering) => setPrefs({ pressureFiltering: 1 - pressureFiltering })}
        fractionDigits={2}
        min={0}
        max={0.99}
        step={0.01}
      />

      <SettingSlider
        name={"Mouse Filtering"}
        value={((1 - prefs.mouseFiltering) * 10) / 10}
        onValueChange={(mouseFiltering) => setPrefs({ mouseFiltering: 1 - mouseFiltering })}
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
    </DialogHeader>
  )
}
