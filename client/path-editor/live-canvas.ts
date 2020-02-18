import { canvasWidth, canvasHeight } from '.'
import { LiveTrajectoryPoint } from '../types'
import { drawBumpers } from '../utils'

export const initLiveCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const clear = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  const render = (
    target: LiveTrajectoryPoint,
    current: LiveTrajectoryPoint,
  ) => {
    clear()
    drawBumpers(ctx, target, target.angle, 'green')
    drawBumpers(ctx, current, current.angle, 'red')
  }

  const destroy = () => {
    clear()
  }

  return { clear, render, destroy }
}
