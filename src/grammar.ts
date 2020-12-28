import * as vscode from "vscode"
import { debounce } from "./utils"
import { getGingerCheck } from "./api"
import { setErrorStatus, setLoadingStatus, setSuccessStatus } from "./statusBar"

// An English grammar Linter.
const collection = vscode.languages.createDiagnosticCollection("eglint")

export function grammarCheckerInit(context: vscode.ExtensionContext) {
  let activeEditor = vscode.window.activeTextEditor

  const triggerUpdateDecorations = debounce(updateDecorations, 500)

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
  resetResult(activeEditor)

  // 裁剪句子
  const matchs = [
    ...text.matchAll(
      /(?<=\W)\b[A-Z](\b[ ]|[a-z]+)\b([a-z]|[A-Z]|\d|\,|\'|\"|\;|\-|\(|\)|\:|\s)*?\b(\.|\?|\!|[ ]{2}|\n{2}|$)(?=\W)/g
    ),
  ]
    ?.filter((match) => !!match?.[0])
    .map((match) => ({
      sentence: match[0] || "",
      index: match.index || 0,
      length: match[0].length || 0,
      range: [match.index || 0, match[0].length || 0],
    }))

  console.log("matchs", matchs)

  if (!matchs?.length) {
    return
  }

  const diagnostics: vscode.Diagnostic[] = []

  setLoadingStatus()

  await Promise.allSettled(
    matchs.map(async (match) => {
      const results = await getGingerCheck(match.sentence || "")
      const diags: vscode.Diagnostic[] =
        results?.map(({ to, from, suggests }) => {
          console.log("suggests", suggests)

          const startPos = activeEditor.document.positionAt(match.index + from)
          const endPos = activeEditor.document.positionAt(match.index + to)
          return {
            message: suggests?.length
              ? "suggests: " + suggests.join(" / ")
              : "",
            range: new vscode.Range(startPos, endPos),
            severity: vscode.DiagnosticSeverity.Error,
            source: "eglint",
          }
        }) || []

      diagnostics.push(...diags)
      if (diags.length > 0) {
        collection.set(activeEditor.document.uri, diagnostics)
      }
      if (diagnostics.length > 0) {
        setErrorStatus(diagnostics.length + " errors")
      } else {
        setSuccessStatus()
      }
    })
  )
}

function resetResult(activeEditor: vscode.TextEditor) {
  collection.set(activeEditor.document.uri, [])
  setSuccessStatus()
}
