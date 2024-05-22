import { useState } from "react"

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
  MenubarSeparator,
} from "@/components/ui/menubar"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { SettingSlider } from "@/components/SettingSlider"
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { DrawingManager } from "@/managers/DrawingManager"
import { ExportDialog } from "@/components/ExportDialog"

const PreferenesDialog = () => {
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

enum Dialogs {
  export = 0,
  preferences,
}

function _TopMenu() {
  const [currentDialog, setCurrentDialog] = useState(Dialogs.export)

  return (
    <>
      <Dialog>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled>New</MenubarItem>
              <DialogTrigger asChild onClick={() => setCurrentDialog(Dialogs.export)}>
                <MenubarItem>Save Image</MenubarItem>
              </DialogTrigger>

              <MenubarItem disabled>Exit</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled>Undo</MenubarItem>
              <MenubarItem disabled>Redo</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => DrawingManager.clearAll()}>Clear All</MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled>Project Name</MenubarItem>
              <DialogTrigger asChild onClick={() => setCurrentDialog(Dialogs.preferences)}>
                <MenubarItem>Preferences</MenubarItem>
              </DialogTrigger>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Help</MenubarTrigger>
            <MenubarContent>
              <MenubarItem
                onSelect={() => {
                  localStorage.clear()
                  usePreferenceStore.getState().resetToDefault()
                }}
              >
                Reset Preferences
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <DialogContent>
          {currentDialog === Dialogs.preferences ? <PreferenesDialog /> : null}
          {currentDialog === Dialogs.export ? <ExportDialog /> : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export const TopMenu = _TopMenu
