import * as vscode from "vscode"
import { CodeAction, CodeActionKind, Diagnostic } from "vscode"
import { getGingerCheck } from "./api"
import { EXT_NAME } from "./const"
import { setErrorStatus, setLoadingStatus, setSuccessStatus } from "./statusBar"
import { getWordDictionary } from "./Store"
import { debounce } from "./utils"

enum CodeActionType {
  REPLACE,
  ADD_TO_DICTIONARY,
}

interface CodeActionTypeExtra {
  message: string
  origin: string
  target?: string
  action: CodeActionType
}

function setStatusBar(diagnosticsNum: number) {
  if (diagnosticsNum > 0) {
    setErrorStatus(diagnosticsNum + " warnings")
  } else {
    setSuccessStatus()
  }
}

export default class LintProvider implements vscode.CodeActionProvider {
  private command?: vscode.Disposable
  public static commandId: string = `${EXT_NAME}.runCodeAction`
  private diagnosticCollection?: vscode.DiagnosticCollection
  private static diagnosticCode: string = `${EXT_NAME}.lint`
  private diagnosticsNum = 0

  public activate(subscriptions: vscode.Disposable[]) {
    this.command = vscode.commands.registerCommand(
      LintProvider.commandId,
      this.runCodeAction,
      this
    )
    subscriptions.push(this.command)
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection()
    subscriptions.push(this.diagnosticCollection)

    vscode.workspace.onDidOpenTextDocument(
      this.debouncedLint,
      this,
      subscriptions
    )

    vscode.workspace.onDidCloseTextDocument(
      (textDocument) => {
        const diags = this.diagnosticCollection?.get(textDocument.uri) || []
        this.diagnosticsNum = this.diagnosticsNum - diags.length
        setStatusBar(this.diagnosticsNum)
        this.diagnosticCollection?.set(textDocument.uri, [])
      },
      this,
      subscriptions
    )

    vscode.workspace.onDidSaveTextDocument(this.debouncedLint, this)
    vscode.workspace.textDocuments.forEach(this.debouncedLint, this)
  }

  public dispose(): void {
    this.diagnosticCollection?.clear()
    this.diagnosticCollection?.dispose()
    this.command?.dispose()
  }

  private debouncedLint(...args: any[]) {
    debounce(this.doLint.bind(this), 500)(...args)
  }

  private async doLint(textDocument: vscode.TextDocument) {
    const text = textDocument.getText()
    if (!text) {
      return
    }

    const diags = this.diagnosticCollection?.get(textDocument.uri) || []
    this.diagnosticsNum = this.diagnosticsNum - diags.length
    setStatusBar(this.diagnosticsNum)
    this.diagnosticCollection?.set(textDocument.uri, [])

    const matches = [
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

    if (!matches?.length) {
      return
    }

    setLoadingStatus()

    const diagnostics: vscode.Diagnostic[] = []
    await Promise.allSettled(
      matches.map(async (match) => {
        const results = await getGingerCheck(match.sentence || "")
        const diags: vscode.Diagnostic[] =
          results?.map(({ to, from, suggests, message: message1 }) => {
            const [start, end] = [match.index + from, match.index + to]

            const range = new vscode.Range(
              textDocument.positionAt(start),
              textDocument.positionAt(end)
            )

            const message = suggests?.length ? message1 : ""

            const diagnostic = new Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Warning
            )
            diagnostic.code = LintProvider.diagnosticCode
            diagnostic.source = EXT_NAME
            return diagnostic
          }) || []

        if (diags.length > 0) {
          diagnostics.push(...diags)
          this.diagnosticCollection?.set(textDocument.uri, diagnostics)
        }
        this.diagnosticsNum = this.diagnosticsNum + diags.length
        setStatusBar(this.diagnosticsNum)
      })
    )
  }

  public async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<CodeAction[]> {
    const codeActions: CodeAction[] = []
    const diagnostics = context.diagnostics.filter(
      (d) => d.code === LintProvider.diagnosticCode
    )
    if (!diagnostics?.length) {
      return []
    }

    diagnostics.forEach((diagnostic) => {
      const message = diagnostic.message
      const match = message.replace(/\"/g, "").match(/suggests\:(.*)==>(.*)/)
      const origin = match?.[1]?.trim() || ""
      const targets = match?.[2]?.trim() || ""
      const targetArr = targets.split("/")

      targetArr.forEach((target) => {
        const extra: CodeActionTypeExtra = {
          message,
          target,
          origin,
          action: CodeActionType.REPLACE,
        }
        const title = `${EXT_NAME}: replace "${origin}" to "${target}"`
        let codeAction = new CodeAction(title, CodeActionKind.QuickFix)
        codeAction.command = {
          title,
          command: LintProvider.commandId,
          arguments: [document, diagnostic.range, extra],
        }
        codeAction.diagnostics = [diagnostic]
        codeActions.push(codeAction)
      })

      const extra: CodeActionTypeExtra = {
        message,
        origin,
        action: CodeActionType.ADD_TO_DICTIONARY,
      }
      const title = `${EXT_NAME}: add "${origin}" to dictionary`
      let codeAction = new CodeAction(title, CodeActionKind.QuickFix)
      codeAction.command = {
        title,
        command: LintProvider.commandId,
        arguments: [document, diagnostic.range, extra],
      }
      codeAction.diagnostics = [diagnostic]
      codeActions.push(codeAction)
    })

    return codeActions
  }

  private runCodeAction(
    document: vscode.TextDocument,
    range: vscode.Range,
    extra: CodeActionTypeExtra
  ) {
    if (extra.action === CodeActionType.REPLACE) {
      let edit = new vscode.WorkspaceEdit()
      edit.replace(document.uri, range, extra.target || "")
      return vscode.workspace.applyEdit(edit)
    } else if (extra.action === CodeActionType.ADD_TO_DICTIONARY) {
      getWordDictionary().set(extra.message, 1)
      this.debouncedLint(document)
    }
  }
}
