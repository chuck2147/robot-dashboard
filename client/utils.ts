import { Point, Waypoint } from './types'

export const distanceBetween = (
  { x: x1, y: y1 }: Point,
  { x: x2, y: y2 }: Point,
) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

export const getAfterHandle = (point: Waypoint): Point => ({
  x:
    point.handleAfterLength * Math.cos(point.heading * (Math.PI / 180)) +
    point.x,
  y:
    point.handleAfterLength * Math.sin(point.heading * (Math.PI / 180)) +
    point.y,
})

export const getBeforeHandle = (waypoint: Waypoint): Point => ({
  x:
    -waypoint.handleBeforeLength *
      Math.cos(waypoint.heading * (Math.PI / 180)) +
    waypoint.x,
  y:
    -waypoint.handleBeforeLength *
      Math.sin(waypoint.heading * (Math.PI / 180)) +
    waypoint.y,
})

export const lerp = (
  minIn: number,
  maxIn: number,
  minOut: number,
  maxOut: number,
) => {
  const inRange = maxIn - minIn
  const outRange = maxOut - minOut

  return (value: number) => {
    const percent = (value - minIn) / inRange
    return percent * outRange + minOut
  }
}

export const lerpPercent = (
  inputPercent: number,
  minOut: number,
  maxOut: number,
) => {
  const outRange = maxOut - minOut
  return inputPercent * outRange + minOut
}

const cubicBezierComponent = (
  t: number,
  start: number,
  end: number,
  control1: number,
  control2: number,
) =>
  (1 - t) ** 3 * start +
  3 * (1 - t) ** 2 * t * control1 +
  3 * (1 - t) * t ** 2 * control2 +
  t ** 3 * end

export const cubicBezier = (
  t: number,
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
): Point => ({
  x: cubicBezierComponent(t, start.x, end.x, control1.x, control2.x),
  y: cubicBezierComponent(t, start.y, end.y, control1.y, control2.y),
})

// https://en.wikipedia.org/wiki/File:B%C3%A9zier_2_big.gif
// https://math.stackexchange.com/a/478001
const cubicBezierPrimeComponent = (
  t: number,
  start: number,
  end: number,
  control1: number,
  control2: number,
): number =>
  (1 - t) ** 2 * (control1 - start) +
  2 * t * (1 - t) * (control2 - control1) +
  t ** 2 * (end - control2)

export const cubicBezierAngle = (
  t: number,
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
): number => {
  const dY = cubicBezierPrimeComponent(
    t,
    start.y,
    end.y,
    control1.y,
    control2.y,
  )
  const dX = cubicBezierPrimeComponent(
    t,
    start.x,
    end.x,
    control1.x,
    control2.x,
  )
  return Math.atan2(dY, dX)
}

const cubicBezierPrimePrimeComponent = (
  t: number,
  start: number,
  end: number,
  control1: number,
  control2: number,
): number =>
  (1 - t) * (control2 - 2 * control1 + start) +
  t * (end - 2 * control2 + control1)

export const cubicBezierCurvature = (
  t: number,
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
): number => {
  const dY = cubicBezierPrimeComponent(
    t,
    start.y,
    end.y,
    control1.y,
    control2.y,
  )
  const dX = cubicBezierPrimeComponent(
    t,
    start.x,
    end.x,
    control1.x,
    control2.x,
  )
  const ddY = cubicBezierPrimePrimeComponent(
    t,
    start.y,
    end.y,
    control1.y,
    control2.y,
  )
  const ddX = cubicBezierPrimePrimeComponent(
    t,
    start.x,
    end.x,
    control1.x,
    control2.x,
  )
  return Math.abs(dX * ddY - dY * ddX) / (dX ** 2 + dY ** 2) ** (3 / 2)
}

export const drawCircle = (
  ctx: CanvasRenderingContext2D,
  { x, y }: Point,
  color: string,
  diameter: number,
) => {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, diameter / 2, 0, 2 * Math.PI)
  ctx.fill()
}

export const lerpColor = (a: string, b: string, amount: number) => {
  if (amount > 1) amount = 1
  if (amount < 0) amount = 0
  const ah = parseInt(a.replace(/#/g, ''), 16)
  const ar = ah >> 16
  const ag = (ah >> 8) & 0xff
  const ab = ah & 0xff
  const bh = parseInt(b.replace(/#/g, ''), 16)
  const br = bh >> 16
  const bg = (bh >> 8) & 0xff
  const bb = bh & 0xff
  const rr = ar + amount * (br - ar)
  const rg = ag + amount * (bg - ag)
  const rb = ab + amount * (bb - ab)

  return (
    '#' + (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1)
  )
}

export const clamp = (min: number, max: number) => (value: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}
