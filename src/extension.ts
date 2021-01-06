import * as vscode from "vscode"
import LintProvider from "./LintProvider"

import { registerStatusBar } from "./statusBar"

export const contextRef: { current: undefined | vscode.ExtensionContext } = {
  current: undefined,
}

export function activate(context: vscode.ExtensionContext) {
  contextRef.current = context
  registerStatusBar(context)
  let linter = new LintProvider()
  linter.activate(context.subscriptions)
  vscode.languages.registerCodeActionsProvider("yaml", linter)
}

export function deactivate() {}
