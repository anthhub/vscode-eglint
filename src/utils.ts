export const debounce = <T extends Function>(
  func: Function,
  time: number
): T => {
  let timer: NodeJS.Timeout | null

  const fn = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    timer = setTimeout(() => {
      func()
    }, time)
  }

  return (fn as unknown) as T
}

export const throttle = (func: Function, time: number) => {
  let timer: NodeJS.Timeout | null
  return () => {
    if (timer) {
      return
    }
    timer = setTimeout(() => {
      func()
      timer = null
    }, time)
  }
}
