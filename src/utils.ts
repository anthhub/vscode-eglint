export const debounce = <T extends (...args: T[]) => any>(
  func: Function,
  time: number
) => {
  let timer: NodeJS.Timeout | null
  const fn = (...args: T[]) => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    timer = setTimeout(() => {
      func(...args)
    }, time)
  }

  return fn
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
