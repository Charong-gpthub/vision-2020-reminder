Option Explicit

Dim shell
Dim fso
Dim projectRoot
Dim shortcutName

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectRoot = "C:\Users\Administrator\Documents\trae_projects\vision-2020-reminder"
shortcutName = "20-20-20 Vision Reminder.lnk"

CreateShortcutIfFolderExists shell.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop"
CreateShortcutIfFolderExists shell.ExpandEnvironmentStrings("%OneDrive%") & "\Desktop"
CreateShortcutIfFolderExists "C:\Users\Public\Desktop"

Sub CreateShortcutIfFolderExists(folderPath)
  Dim shortcut

  If folderPath = "" Then
    Exit Sub
  End If

  If Not fso.FolderExists(folderPath) Then
    Exit Sub
  End If

  Set shortcut = shell.CreateShortcut(folderPath & "\" & shortcutName)
  shortcut.TargetPath = projectRoot & "\scripts\run-electron.cmd"
  shortcut.WorkingDirectory = projectRoot
  shortcut.Description = "One-click launch for 20-20-20 Vision Reminder"
  shortcut.IconLocation = "C:\Windows\System32\shell32.dll,220"
  shortcut.Save
  WScript.Echo folderPath & "\" & shortcutName
End Sub
