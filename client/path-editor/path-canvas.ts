import { Point, Trajectory } from '../types'
import { lerpColor, rotatePoint, drawBumpers } from '../utils'
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
  bezierDivisions,
} from '../../config'
import { transparentize } from 'polished'

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

    const opacity = 0.992 - 6 / bezierDivisions
    const transparent = transparentize(opacity)

    trajectory.forEach((point, i) => {
      const prevPoint = trajectory[i - 1]
      if (!prevPoint) return
      const velocity = Math.sqrt(point.velocity.x ** 2 + point.velocity.y ** 2)
      const color = lerpColor('#e53935', '#689f38', velocity / maxVelocity)
      line(prevPoint, point, color, 1.2)
      drawBumpers(ctx, point, point.angle, transparent(color))
    })

    const drawWheelPath = (xOffset: number, yOffset: number) => {
      ctx.beginPath()
      let hasError = false
      trajectory.forEach((point, i) => {
        if (isNaN(point.angle)) hasError = true
        const angle = point.angle - Math.PI / 2
        const offsetPoint = rotatePoint(
          point,
          { x: xOffset, y: yOffset },
          angle,
        )
        if (i === 0)
          ctx.moveTo(convertX(offsetPoint.x), convertY(offsetPoint.y))
        else ctx.lineTo(convertX(offsetPoint.x), convertY(offsetPoint.y))
      })

      ctx.lineWidth = inchesToPixels(0.5)
      ctx.strokeStyle = hasError ? 'red' : 'rgba(0,0,0,0.2)'
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
