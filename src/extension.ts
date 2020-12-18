import * as vscode from "vscode"
import { grammarCheckerInit } from "./grammar"

export function activate(context: vscode.ExtensionContext) {
  grammarCheckerInit(context)

  let disposable = vscode.commands.registerCommand("eglint.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from eglint!")
  })

  context.subscriptions.push(disposable)
}

export function deactivate() {}
