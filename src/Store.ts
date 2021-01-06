import { IGrammarResult } from "./api"
import { contextRef } from "./extension"
import { debounce } from "./utils"

interface IPool<T> {
  [key: string]: T
}

export class Store<T> {
  constructor(private storageKey: string, private pool: IPool<T> = {}) {
    const obj: IPool<T> =
      contextRef.current?.globalState.get(this.storageKey) || {}
    this.pool = { ...obj, ...pool }
  }

  private updateStorage() {
    contextRef.current?.globalState.update(this.storageKey, this.pool)
  }

  private debouncedUpdateStorage() {
    debounce(this.updateStorage.bind(this), 500)()
  }

  get(key: string) {
    return this.pool[key]
  }

  set(key: string, result: T) {
    this.pool[key] = result
    this.debouncedUpdateStorage()
  }

  clear() {
    this.pool = {}
    this.updateStorage()
  }
}

let wordDictionary: Store<number>
export function getWordDictionary() {
  if (!wordDictionary) {
    wordDictionary = new Store("WORD_DICTIONARY")
  }
  return wordDictionary
}

let sentenceStorage: Store<Array<IGrammarResult>>
export function getSentenceStorage() {
  if (!sentenceStorage) {
    sentenceStorage = new Store("SENTENCE_STORAGE")
  }
  return sentenceStorage
}
