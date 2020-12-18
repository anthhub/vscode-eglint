import * as vscode from "vscode"
import { debounce } from "./utils"
import { getGingerCheck } from "./api"

// A English grammar Linter.
const collection = vscode.languages.createDiagnosticCollection("eglint")

export function grammarCheckerInit(context: vscode.ExtensionContext) {
  let activeEditor = vscode.window.activeTextEditor

  const triggerUpdateDecorations = debounce(updateDecorations, 1000)

  if (activeEditor) {
    triggerUpdateDecorations()
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor
      if (editor) {
        triggerUpdateDecorations()
      }
    },
    null,
    context.subscriptions
  )

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations()
      }
    },
    null,
    context.subscriptions
  )
}

async function updateDecorations() {
  const activeEditor = vscode.window.activeTextEditor
  const text = activeEditor?.document.getText()

  if (!activeEditor || !text) {
    return
  }

  // 裁剪句子
  const matchs = [...text.matchAll(/[A-Z].*?(\.|\?|\!)/g)]?.map((match) => ({
    sentence: match[0] || "",
    index: match.index || 0,
    length: match[0].length || 0,
    range: [match.index || 0, match[0].length || 0],
  }))

  if (!matchs?.length) {
    return
  }

  const diagnostics: vscode.Diagnostic[] = []

  await Promise.all(
    matchs.map(async (match) => {
      const results = await getGingerCheck(match.sentence || "")
      const diags: vscode.Diagnostic[] =
        results?.map(({ to, from, suggest }) => {
          const startPos = activeEditor.document.positionAt(match.index + from)
          const endPos = activeEditor.document.positionAt(match.index + to)
          return {
            message: "suggest: " + suggest,
            range: new vscode.Range(startPos, endPos),
            severity: vscode.DiagnosticSeverity.Error,
            source: "eglint",
          }
        }) || []

      diagnostics.push(...diags)
    })
  )

  collection.set(activeEditor.document.uri, diagnostics)
}
