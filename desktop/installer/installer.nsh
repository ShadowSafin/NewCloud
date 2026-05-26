!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER
  Var DesktopShortcutControl
  Var StartMenuShortcutControl
  Var StartupControl
  Var LaunchControl
  Var DesktopShortcutValue
  Var StartMenuShortcutValue
  Var StartupValue
  Var LaunchValue
!endif

!macro customInit
  StrCpy $DesktopShortcutValue ${BST_CHECKED}
  StrCpy $StartMenuShortcutValue ${BST_CHECKED}
  StrCpy $StartupValue ${BST_UNCHECKED}
  StrCpy $LaunchValue ${BST_CHECKED}
!macroend

!macro customWelcomePage
  !insertmacro MUI_PAGE_WELCOME
  Page custom NexxCloudOptionsCreate NexxCloudOptionsLeave
!macroend

!ifndef BUILD_UNINSTALLER
  Function NexxCloudOptionsCreate
    !insertmacro MUI_HEADER_TEXT "Desktop Integration" "Choose how NexxCloud Desktop is installed."
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 2u 100% 22u "Select the shortcuts and startup behavior for this Windows account."
    Pop $0

    ${NSD_CreateCheckbox} 0 39u 100% 16u "Create Desktop Shortcut"
    Pop $DesktopShortcutControl
    ${NSD_Check} $DesktopShortcutControl

    ${NSD_CreateCheckbox} 0 63u 100% 16u "Create Start Menu Shortcut"
    Pop $StartMenuShortcutControl
    ${NSD_Check} $StartMenuShortcutControl

    ${NSD_CreateCheckbox} 0 87u 100% 16u "Launch at Startup"
    Pop $StartupControl

    ${NSD_CreateCheckbox} 0 111u 100% 16u "Launch NexxCloud after Install"
    Pop $LaunchControl
    ${NSD_Check} $LaunchControl

    nsDialogs::Show
  FunctionEnd

  Function NexxCloudOptionsLeave
    ${NSD_GetState} $DesktopShortcutControl $DesktopShortcutValue
    ${NSD_GetState} $StartMenuShortcutControl $StartMenuShortcutValue
    ${NSD_GetState} $StartupControl $StartupValue
    ${NSD_GetState} $LaunchControl $LaunchValue
  FunctionEnd
!endif

!macro customInstall
  ${If} $DesktopShortcutValue == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\NexxCloud Desktop.lnk" "$INSTDIR\NexxCloud Desktop.exe"
  ${EndIf}
  ${If} $StartMenuShortcutValue == ${BST_CHECKED}
    CreateDirectory "$SMPROGRAMS\NexxCloud Desktop"
    CreateShortCut "$SMPROGRAMS\NexxCloud Desktop\NexxCloud Desktop.lnk" "$INSTDIR\NexxCloud Desktop.exe"
  ${EndIf}
  ${If} $StartupValue == ${BST_CHECKED}
    ExecWait '"$INSTDIR\NexxCloud Desktop.exe" --set-autostart=enabled'
  ${Else}
    ExecWait '"$INSTDIR\NexxCloud Desktop.exe" --set-autostart=disabled'
  ${EndIf}
  ${If} $LaunchValue == ${BST_CHECKED}
    Exec '"$INSTDIR\NexxCloud Desktop.exe"'
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$DESKTOP\NexxCloud Desktop.lnk"
  Delete "$SMPROGRAMS\NexxCloud Desktop\NexxCloud Desktop.lnk"
  RMDir "$SMPROGRAMS\NexxCloud Desktop"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "NexxCloud Desktop"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "nexxcloud-desktop"
!macroend
