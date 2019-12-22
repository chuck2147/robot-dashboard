import { Ref } from 'preact/hooks'
import {
  Path,
  InterpolatedPath,
  InterpolatedPoint,
  Vector2,
  Point,
  Trajectory,
  TrajectoryPoint,
} from '../types'
import {
  getBeforeHandle,
  getAfterHandle,
  cubicBezier,
  distanceBetween,
  cubicBezierAngle,
  lerpColor,
  drawCircle,
  lerp,
  clamp,
  cubicBezierCurvature,
  lerpPercent,
} from '../utils'
import {
  convertX,
  convertY,
  inchesToPixels,
  canvasWidth,
  canvasHeight,
} from '.'
import {
  bezierDivisions,
  maxVelocity as originalMaxVelocity,
  maxAccel as originalMaxAccel,
  maxDecel as originalMaxDecel,
  curvatureVelocity,
} from '../../config'

/** in/s */
const maxVelocity = originalMaxVelocity * 12
/** in/s */
const maxAccel = originalMaxAccel * 12
/** in/s */
const maxDecel = originalMaxDecel * 12

enum SmoothDirection {
  FORWARDS,
  REVERSE,
}

const smoothTrajectory = (
  trajectory: Trajectory,
  direction: SmoothDirection,
) => {
  let lastVelocity = 0
  let lastPoint: Point | null = null
  const orderedArray =
    direction === SmoothDirection.FORWARDS
      ? trajectory
      : trajectory.slice(0).reverse()

  const newTrajectory: Trajectory = orderedArray.map(point => {
    const dist = lastPoint ? distanceBetween(lastPoint, point) : 0
    const accel = direction === SmoothDirection.FORWARDS ? maxAccel : maxDecel
    // v'^2 = v0^2 + 2a(x-x0)
    const maxVelocity = lastPoint
      ? Math.sqrt(lastVelocity ** 2 + 2 * accel * dist)
      : 0
    const originalNetVelocity = Math.sqrt(
      point.velocity.x ** 2 + point.velocity.y ** 2,
    )
    const netVelocity = Math.min(originalNetVelocity, maxVelocity)
    lastVelocity = netVelocity
    lastPoint = point
    return {
      ...point,
      velocity: {
        x: netVelocity * Math.cos(point.heading),
        y: netVelocity * Math.sin(point.heading),
      },
    }
  })
  if (direction === SmoothDirection.REVERSE) newTrajectory.reverse()
  return newTrajectory
}

export const initPathCanvas = (
  canvas: HTMLCanvasElement,
  pathRef: Ref<Path>,
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const line = (point1: Point, point2: Point, color = 'blue', size = 0.3) => {
    ctx.strokeStyle = color
    ctx.lineWidth = inchesToPixels(size)
    ctx.beginPath()
    ctx.moveTo(convertX(point1.x), convertY(point1.y))
    ctx.lineTo(convertX(point2.x), convertY(point2.y))
    ctx.stroke()
  }
  const clear = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  const circle = ({ x, y }: Point, color = 'blue', size = 2) =>
    drawCircle(
      ctx,
      { x: convertX(x), y: convertY(y) },
      color,
      inchesToPixels(size),
    )

  const render = () => {
    clear()
    const path = pathRef.current
    const interpolatedPath: InterpolatedPath = []
    path.waypoints.forEach((start, i) => {
      const end = path.waypoints[i + 1]
      if (!end) return

      const cp1 = getAfterHandle(start)
      const cp2 = getBeforeHandle(end)

      for (let t = 0; t <= 1; t += 1 / bezierDivisions) {
        const intermediatePoint = cubicBezier(t, start, end, cp1, cp2)
        interpolatedPath.push({
          ...intermediatePoint,
          heading: cubicBezierAngle(t, start, end, cp1, cp2),
          curvature: cubicBezierCurvature(t, start, end, cp1, cp2),
        })
      }

      // ctx.beginPath()
      // ctx.moveTo(convertX(start.x), convertY(start.y))
      // ctx.bezierCurveTo(
      //   convertX(cp1.x),
      //   convertY(cp1.y),
      //   convertX(cp2.x),
      //   convertY(cp2.y),
      //   convertX(end.x),
      //   convertY(end.y),
      // )

      // ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      // ctx.lineWidth = inchesToPixels(1)
      // ctx.stroke()
    })

    const clampVelocity = clamp(-maxVelocity, maxVelocity)

    const trajectory: Trajectory = interpolatedPath.map(point => {
      const netVelocity = clampVelocity(curvatureVelocity / point.curvature)
      const velocity: Vector2 = {
        x: netVelocity * Math.cos(point.heading),
        y: netVelocity * Math.sin(point.heading),
      }
      return { ...point, velocity }
    })

    const smoothed = smoothTrajectory(
      smoothTrajectory(trajectory, SmoothDirection.FORWARDS),
      SmoothDirection.REVERSE,
    )

    let prevTime = 0
    let prevPoint: TrajectoryPoint | null = null

    const trajectoryWithTime = smoothed.map(point => {
      if (!prevPoint) {
        prevPoint = point
        return { ...point, time: 0 }
      }
      const distance = distanceBetween(point, prevPoint)
      const prevVelocity = Math.sqrt(
        prevPoint.velocity.x ** 2 + prevPoint.velocity.y ** 2,
      )
      const currVelocity = Math.sqrt(
        point.velocity.x ** 2 + point.velocity.y ** 2,
      )
      // Averaging the velocity of the previous and current path sections
      const velocity = (prevVelocity + currVelocity) / 2
      // d = vt
      const time = prevTime + distance / velocity
      prevPoint = point
      prevTime = time
      return { ...point, time }
    })

    console.log(trajectoryWithTime)

    const lastFoundIndex = 0
    const initialTime = new Date().getTime()
    const maxTime = trajectoryWithTime[trajectoryWithTime.length - 1].time
    const findIntermediatePoint = (time: number): TrajectoryPoint | null => {
      if (time > maxTime) return null
      let lastPoint = trajectoryWithTime[lastFoundIndex]
      for (let i = lastFoundIndex; i < trajectoryWithTime.length; i++) {
        const thisPoint = trajectoryWithTime[i]
        if (lastPoint.time < time && time <= thisPoint.time) {
          const t = (time - lastPoint.time) / (thisPoint.time - lastPoint.time)
          return {
            heading: lerpPercent(t, lastPoint.heading, thisPoint.heading),
            velocity: {
              x: lerpPercent(t, lastPoint.velocity.x, thisPoint.velocity.x),
              y: lerpPercent(t, lastPoint.velocity.y, thisPoint.velocity.y),
            },
            x: lerpPercent(t, lastPoint.x, thisPoint.x),
            y: lerpPercent(t, lastPoint.y, thisPoint.y),
            curvature: lerpPercent(t, lastPoint.curvature, thisPoint.curvature),
          }
        }
        lastPoint = thisPoint
      }
      return null
    }
    const intervalId = setInterval(() => {
      const time = (new Date().getTime() - initialTime) / 1000
      const point = findIntermediatePoint(time)
      // console.log(time, point)
      clear()
      if (!point) {
        clearInterval(intervalId)
        return
      }

      circle(point, 'red', inchesToPixels(8))
      const k = inchesToPixels(0.05)
      line(point, {
        x: point.x + k * point.velocity.x,
        y: point.y + k * point.velocity.y,
      })
    }, 2)
  }

  const destroy = () => {}
  render()

  return { destroy, render }
}
