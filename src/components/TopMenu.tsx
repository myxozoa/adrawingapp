import { memo, useState } from "react"

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
              <MenubarItem
                onSelect={() => {
                  Camera.reset()
                  DrawingManager.beginDraw()
                  DrawingManager.pauseDrawNextFrame()
                }}
              >
                Reset Camera
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

export const TopMenu = memo(_TopMenu)
