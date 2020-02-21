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
    current?: LiveTrajectoryPoint | null,
    target?: LiveTrajectoryPoint | null,
  ) => {
    clear()
    if (target) drawBumpers(ctx, target, target.angle, 'green')
    if (current) drawBumpers(ctx, current, current.angle, 'red')
  }

  const destroy = () => {
    clear()
  }

  return { clear, render, destroy }
}
