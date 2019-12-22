import { Ref } from 'preact/hooks'
import { Path, Point, TrajectoryPoint } from '../types'
import { lerpColor, drawCircle, lerpPercent } from '../utils'
import {
  convertX,
  convertY,
  inchesToPixels,
  canvasWidth,
  canvasHeight,
} from '.'
import { computeTrajectory } from './compute-trajectory'
import { maxVelocity as originalMaxVelocity } from '../../config'

const maxVelocity = originalMaxVelocity * 12

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

    const trajectory = computeTrajectory(path)

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
          }
        }
        lastPoint = thisPoint
      }
      return null
    }
    const drawColoredTrajectory = () => {
      trajectory.forEach((point, i) => {
        const prevPoint = trajectory[i - 1]
        if (!prevPoint) return
        const velocity = Math.sqrt(
          point.velocity.x ** 2 + point.velocity.y ** 2,
        )
        const color = lerpColor('#e53935', '#689f38', velocity / maxVelocity)
        line(prevPoint, point, color, 2)
      })
    }
    drawColoredTrajectory()
    const intervalId = setInterval(() => {
      const time = (new Date().getTime() - initialTime) / 1000
      const point = findIntermediatePoint(time)
      clear()
      drawColoredTrajectory()

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
