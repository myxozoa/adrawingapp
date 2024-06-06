import { memo, useCallback, useState } from "react"
import { useRouter } from "next/navigation"

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
  MenubarSeparator,
} from "@/components/ui/menubar"

import { PreferenesDialog } from "@/components/PreferencesDialog"

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

import { usePreferenceStore } from "@/stores/PreferenceStore"
import { DrawingManager } from "@/managers/DrawingManager"
import { ExportDialog } from "@/components/ExportDialog"
import { Camera } from "@/objects/Camera"
import { Application } from "@/managers/ApplicationManager"

enum Dialogs {
  export = 0,
  preferences,
}

function _TopMenu() {
  const router = useRouter()
  const [currentDialog, setCurrentDialog] = useState(Dialogs.export)

  const newProject = useCallback(() => {
    Application.destroy()
    router.push("/")
  }, [])

  const openExport = useCallback(() => {
    setCurrentDialog(Dialogs.export)
  }, [])

  const openPreferences = useCallback(() => {
    setCurrentDialog(Dialogs.preferences)
  }, [])

  const resetPreferences = useCallback(() => {
    localStorage.clear()
    usePreferenceStore.getState().resetToDefault()
  }, [])

  const resetCamera = useCallback(() => {
    Camera.reset()
    DrawingManager.beginDraw()
    DrawingManager.pauseDrawNextFrame()
  }, [])

  return (
    <>
      <Dialog>
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={newProject}>New</MenubarItem>
              <DialogTrigger asChild onClick={openExport}>
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
              <MenubarItem onSelect={DrawingManager.clearAll}>Clear All</MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled>Project Name</MenubarItem>
              <DialogTrigger asChild onClick={openPreferences}>
                <MenubarItem>Preferences</MenubarItem>
              </DialogTrigger>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Help</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={resetPreferences}>Reset Preferences</MenubarItem>
              <MenubarItem onSelect={resetCamera}>Reset Camera</MenubarItem>
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

export const TopMenu = memo(_TopMenu)
