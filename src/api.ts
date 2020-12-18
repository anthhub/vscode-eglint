import axios from "axios"

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

const TEXT_RESULT_POOL: { [key: string]: Array<IGrammarResult> } = {}

export async function getGingerCheck(text: string) {
  console.log("text",text)
  const one = TEXT_RESULT_POOL[text]
  // one 可能是空数组
  if (one && Array.isArray(one)) {
    return one
  }

  const base = `http://services.gingersoftware.com/Ginger/correct/json/GingerTheText`
  const query = `?apiKey=${API_KEY}&lang=US&clientVersion=2.0&text=${text
    .split(" ")
    .join("+")}&_=1608002645677`
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
          suggest: result["Suggestions"][0]["Text"],
        }
      }) || []

    console.log(rs)
    TEXT_RESULT_POOL[text] = rs
    return rs
  } catch (error) {
    console.error(error)
    return []
  }
}
