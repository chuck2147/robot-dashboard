import { Point, Waypoint } from './types';

export const distanceBetween = ({
  x: x1,
  y: y1
}: Point, {
  x: x2,
  y: y2
}: Point) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  
export const getAfterHandle = (point: Waypoint): Point => ({
  x: point.handleAfterLength * Math.cos(point.heading * (Math.PI / 180)) + point.x,
  y: point.handleAfterLength * Math.sin(point.heading * (Math.PI / 180)) + point.y,
})

export const getBeforeHandle = (point: Waypoint): Point => ({
  x: -point.handleBeforeLength * Math.cos(point.heading * (Math.PI / 180)) + point.x,
  y: -point.handleBeforeLength * Math.sin(point.heading * (Math.PI / 180)) + point.y,
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