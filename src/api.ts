import axios from "axios"
import { contextRef } from "./extension"

interface IGrammarResult {
  range: number[]
  from: number
  to: number
  suggest: string
}

const API_KEY = "6ae0c3a0-afdc-4532-a810-82ded0054236"
const options = {
  timeout: 5000,
}

interface IPool {
  [key: string]: Array<IGrammarResult>
}

class TextResultPool {
  private _pool: IPool = {}

  private static _instance: TextResultPool

  static getInstance(): TextResultPool {
    const obj: IPool =
      contextRef.current?.globalState.get("TEXT_RESULT_POOL") || {}
    console.log("getInstance", obj)

    if (!TextResultPool._instance) {
      TextResultPool._instance = new TextResultPool(obj)
    }

    return TextResultPool._instance
  }

  constructor(object: IPool) {
    this._pool = object
  }

  get(key: string) {
    return this._pool[key]
  }
  set(key: string, result: Array<IGrammarResult>) {
    this._pool[key] = result
    contextRef.current?.globalState.update("TEXT_RESULT_POOL", this._pool)
    const obj: IPool =
      contextRef.current?.globalState.get("TEXT_RESULT_POOL") || {}
    console.log("set", obj)
  }
}

export async function getGingerCheck(text: string) {
  const textResultPool = TextResultPool.getInstance()

  const one = textResultPool.get(text)
  // one 可能是空数组
  if (one && Array.isArray(one)) {
    console.log("hit storage", one)
    return one
  }

  const base = `http://services.gingersoftware.com/Ginger/correct/json/GingerTheText`
  const query = `?apiKey=${API_KEY}&lang=US&clientVersion=2.0&text=${text
    .split(" ")
    .join("+")}&_=${Date.now()}`
  const url = base + query
  try {
    const { data } = await axios.get(url, options)
    const rs: IGrammarResult[] =
      data?.LightGingerTheTextResult?.map((result: any) => {
        const from = result.From
        const to = result.To + 1
        const range = [from, to]
        return {
          range,
          from,
          to,
          suggest: result?.Suggestions?.[0]?.Text || "",
        }
      }) || []

    textResultPool.set(text, rs)
    return rs
  } catch (error) {
    console.error(error)
    return []
  }
}
