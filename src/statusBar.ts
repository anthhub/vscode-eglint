import * as child_process from "child_process"
import {
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  ThemeColor,
  window,
} from "vscode"
import { EXT_NAME, SUCCESS, SPINNER, WARNING } from "./const"

let statusBar: StatusBarItem

export function registerStatusBar(context: ExtensionContext): void {
  if (statusBar) {
    return
  }

  statusBar = window.createStatusBarItem(StatusBarAlignment.Left, -1)
  statusBar.tooltip = `${EXT_NAME} English linter`
  setSuccessStatus()
  statusBar.show()

  context.subscriptions.push(statusBar)
}

export function setSuccessStatus(issue?: string | undefined | null): void {
  setStatusBar(SUCCESS, issue || `English linter`)
  statusBar.color = new ThemeColor("foreground")
}

export function setLoadingStatus(issue?: string | undefined | null): void {
  setStatusBar(SPINNER, issue || `English linting`)
  statusBar.color = new ThemeColor("foreground")
}

export function setErrorStatus(issue?: string | undefined | null): void {
  setStatusBar(WARNING, issue || `errors`)
  statusBar.color = new ThemeColor("errorForeground")
}

function setStatusBar(
  icon?: string | undefined | null,
  issue?: string | undefined | null
) {
  const iconText = icon ? ` ${icon}` : ""
  const issueText = issue ? `: ${issue}` : ""

  statusBar.text = `${iconText} ${EXT_NAME}${issueText}`
  statusBar.color = new ThemeColor("foreground")
}
