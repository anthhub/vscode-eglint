import * as vscode from "vscode"
import { grammarCheckerInit } from "./grammar"
import { registerStatusBar } from "./statusBar"

export const contextRef: { current: undefined | vscode.ExtensionContext } = {
  current: undefined,
}

export function activate(context: vscode.ExtensionContext) {
  contextRef.current = context

  registerStatusBar(context)
  grammarCheckerInit(context)

  let disposable = vscode.commands.registerCommand("eglint.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from eglint!")
  })

  context.subscriptions.push(disposable)
}

export function deactivate() {}
