import { Point, Trajectory } from '../types'
import { lerpColor } from '../utils'
import {
  convertX,
  convertY,
  inchesToPixels,
  canvasWidth,
  canvasHeight,
} from '.'
import {
  maxVelocity as originalMaxVelocity,
  driveWidth,
  driveLength,
} from '../../config'

const maxVelocity = originalMaxVelocity * 12

export const initPathCanvas = (canvas: HTMLCanvasElement) => {
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

  const render = (trajectory: Trajectory) => {
    clear()

    trajectory.forEach((point, i) => {
      const prevPoint = trajectory[i - 1]
      if (!prevPoint) return
      const velocity = Math.sqrt(point.velocity.x ** 2 + point.velocity.y ** 2)
      const color = lerpColor('#e53935', '#689f38', velocity / maxVelocity)
      line(prevPoint, point, color, 1.2)
    })

    const drawWheelPath = (xOffset: number, yOffset: number) => {
      ctx.beginPath()
      trajectory.forEach((point, i) => {
        const angle = point.angle - Math.PI / 2
        const offsetPoint = {
          x: point.x + xOffset * Math.cos(angle) - yOffset * Math.sin(angle),
          y: point.y + yOffset * Math.cos(angle) + xOffset * Math.sin(angle),
        }
        if (i === 0)
          ctx.moveTo(convertX(offsetPoint.x), convertY(offsetPoint.y))
        else ctx.lineTo(convertX(offsetPoint.x), convertY(offsetPoint.y))
      })

      ctx.lineWidth = inchesToPixels(0.5)
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'
      ctx.stroke()
    }

    drawWheelPath(driveWidth / 2, driveLength / 2)
    drawWheelPath(-driveWidth / 2, driveLength / 2)
    drawWheelPath(-driveWidth / 2, -driveLength / 2)
    drawWheelPath(driveWidth / 2, -driveLength / 2)
  }

  const destroy = () => {
    clear()
  }

  return { destroy, render }
}
