import {
  canvasWidth,
  canvasHeight,
  convertX,
  convertY,
  inchesToPixels,
} from '.'
import { Trajectory, TrajectoryPoint, Point } from '../types'
import { lerpPercent, drawCircle } from '../utils'

export const initAnimationCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
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

  const line = (point1: Point, point2: Point, color = 'blue', size = 0.3) => {
    ctx.strokeStyle = color
    ctx.lineWidth = inchesToPixels(size)
    ctx.beginPath()
    ctx.moveTo(convertX(point1.x), convertY(point1.y))
    ctx.lineTo(convertX(point2.x), convertY(point2.y))
    ctx.stroke()
  }

  let intervalId: ReturnType<typeof setInterval> | undefined
  const play = (trajectory: Trajectory) => {
    const lastFoundIndex = 0
    const initialTime = new Date().getTime()
    const maxTime = trajectory[trajectory.length - 1].time
    const findIntermediatePoint = (time: number): TrajectoryPoint | null => {
      if (time > maxTime) return null
      let lastPoint = trajectory[lastFoundIndex]
      for (let i = lastFoundIndex; i < trajectory.length; i++) {
        const thisPoint = trajectory[i]
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
            time,
            t: lerpPercent(t, lastPoint.t, thisPoint.t),
            afterWaypoint: thisPoint.afterWaypoint,
            angle: lerpPercent(t, lastPoint.angle, thisPoint.angle),
          }
        }
        lastPoint = thisPoint
      }
      return null
    }
    intervalId = setInterval(() => {
      const time = (new Date().getTime() - initialTime) / 1000
      const point = findIntermediatePoint(time)
      if (!point) {
        if (intervalId !== undefined) clearInterval(intervalId)
        intervalId = undefined
        return
      }
      clear()
      // circle(point, 'red', 34)
      // const width = 30
      // const height = 30

      // ctx.beginPath()

      // ctx.translate(
      //   convertX(point.x + width / 2),
      //   convertY(point.y + height / 2),
      // )
      // ctx.rotate(Math.PI / 2 - point.angle)
      // ctx.rect(
      //   0,
      //   0,
      //   // inchesToPixels(-width / 2),
      //   // inchesToPixels(-height / 2),
      //   inchesToPixels(width),
      //   inchesToPixels(height),
      // )
      // ctx.fillStyle = 'red'
      // ctx.fill()

      // ctx.setTransform(1, 0, 0, 1, 0, 0)

      const k = inchesToPixels(5)
      line(
        point,
        {
          x: point.x + k * Math.cos(point.angle),
          y: point.y + k * Math.sin(point.angle),
        },
        'red',
        3,
      )
    }, 5)
  }
  const stop = () => {
    if (intervalId !== undefined) clearInterval(intervalId)
    clear()
  }
  const destroy = () => {
    stop()
  }
  return { play, stop, destroy }
}
