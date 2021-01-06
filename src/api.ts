import axios from "axios"
import { getSuggestMessage } from "./LintProvider"
import { getSentenceStorage, getWordDictionary } from "./Store"

export interface IGrammarResult {
  sentence: string
  origin: string
  range: number[]
  from: number
  to: number
  suggests: string[]
}

const API_KEY = "6ae0c3a0-afdc-4532-a810-82ded0054236"
const options = {
  timeout: 5000 * 10,
}

export async function getGingerCheck(text: string) {
  const rs = await fetchGinger(text)
  const wordDictionary = getWordDictionary()
  return rs.filter(
    (item) => !wordDictionary.get(getSuggestMessage(item.origin, item.suggests))
  )
}

async function fetchGinger(text: string): Promise<IGrammarResult[]> {
  if (text === "") {
    return []
  }

  const sentenceStorage = getSentenceStorage()
  const one = sentenceStorage.get(text.trim())

  if (Array.isArray(one)) {
    console.log("hit storage", text, one)
    // return one
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
        const origin = text.slice(from, to).trim()
        return {
          sentence: text,
          origin,
          range,
          from,
          to,
          suggests:
            result?.Suggestions?.map((item: { Text: string }) => item.Text) ||
            [],
        }
      }) || []

    sentenceStorage.set(text.trim(), rs)
    return rs
  } catch (error) {
    console.error(error)
    return []
  }
}
