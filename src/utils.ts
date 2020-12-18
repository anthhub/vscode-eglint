export const debounce = (func: Function, time: number) => {
  let timer: NodeJS.Timeout | null
  return () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    timer = setTimeout(() => {
      func()
    }, time)
  }
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
