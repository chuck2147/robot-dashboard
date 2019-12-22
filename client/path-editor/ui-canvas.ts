import { Point, Waypoint, Path } from '../types'
import {
  mouseXToFieldX,
  mouseYToFieldY,
  convertY,
  convertX,
  canvasWidth,
  canvasHeight,
  inchesToPixels,
} from '.'
import { Ref } from 'preact/hooks'
import {
  drawCircle,
  distanceBetween,
  getBeforeHandle,
  getAfterHandle,
} from '../utils'

export const initUiCanvas = (
  canvas: HTMLCanvasElement,
  pathRef: Ref<Path>,
  onChange: () => void,
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

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

  const clear = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  const getPointFromEvent = (e: MouseEvent): Point => {
    const rect = canvas.getBoundingClientRect()
    const originalX = ((e.clientX - rect.left) * canvas.width) / rect.width
    const originalY = ((e.clientY - rect.top) * canvas.height) / rect.height
    return { x: mouseXToFieldX(originalX), y: mouseYToFieldY(originalY) }
  }

  let focusedElement: null | Waypoint = null
  let activeElement:
    | null
    | 'waypoint'
    | 'beforehandle'
    | 'afterhandle'
    | 'anglepoint' = null

  const clickThreshold = 5

  const mouseDownListener = (e: MouseEvent) => {
    const clickLocation = getPointFromEvent(e)
    const matchingWaypoint = pathRef.current.waypoints.find(
      p => distanceBetween(p, clickLocation) < clickThreshold,
    )
    if (matchingWaypoint) {
      focusedElement = matchingWaypoint
      activeElement = 'waypoint'
      render()
      return
    }

    if (focusedElement) {
      const beforeHandle = getBeforeHandle(focusedElement)
      const afterHandle = getAfterHandle(focusedElement)

      if (distanceBetween(beforeHandle, clickLocation) < clickThreshold) {
        activeElement = 'beforehandle'
        render()
        return
      }
      if (distanceBetween(afterHandle, clickLocation) < clickThreshold) {
        activeElement = 'afterhandle'
        render()
        return
      }
    }

    focusedElement = null
    activeElement = null
    render()
  }
  const mouseUpListener = (e: MouseEvent) => {
    activeElement = null
    onChange()
  }
  const mouseMoveListener = (e: MouseEvent) => {
    if (!focusedElement || !activeElement) return
    const mouseLocation = getPointFromEvent(e)
    if (activeElement === 'waypoint') {
      Object.assign(focusedElement, mouseLocation)
    } else if (activeElement === 'anglepoint') {
      // asdf
    } else {
      focusedElement.heading =
        Math.atan2(
          mouseLocation.y - focusedElement.y,
          mouseLocation.x - focusedElement.x,
        ) *
          (180 / Math.PI) +
        (activeElement === 'beforehandle' ? 180 : 0)

      const dist = distanceBetween(mouseLocation, focusedElement)

      if (activeElement === 'beforehandle')
        focusedElement.handleBeforeLength = dist
      else focusedElement.handleAfterLength = dist
    }
    render()
  }

  canvas.addEventListener('mousemove', mouseMoveListener)
  canvas.addEventListener('mousedown', mouseDownListener)
  canvas.addEventListener('mouseup', mouseUpListener)

  const destroy = () => {
    canvas.removeEventListener('mousemove', mouseMoveListener)
    canvas.removeEventListener('mousedown', mouseDownListener)
    canvas.removeEventListener('mouseup', mouseUpListener)
  }

  const render = () => {
    clear()
    const path = pathRef.current

    path.waypoints.forEach((start, i) => {
      const end = path.waypoints[i + 1]
      if (!end) return

      const cp1 = getAfterHandle(start)
      const cp2 = getBeforeHandle(end)

      ctx.beginPath()
      ctx.moveTo(convertX(start.x), convertY(start.y))
      ctx.bezierCurveTo(
        convertX(cp1.x),
        convertY(cp1.y),
        convertX(cp2.x),
        convertY(cp2.y),
        convertX(end.x),
        convertY(end.y),
      )

      ctx.strokeStyle = 'black'
      ctx.lineWidth = inchesToPixels(1)
      ctx.stroke()
    })

    path.waypoints.forEach(waypoint => {
      const isFocused = waypoint === focusedElement

      if (isFocused) {
        const beforeHandle = getBeforeHandle(waypoint)
        const afterHandle = getAfterHandle(waypoint)

        line(beforeHandle, afterHandle, 'rgba(0,0,0,0.3)')

        // Handle dots
        circle(beforeHandle, 'green', 2)
        circle(afterHandle, 'green', 2)
      }

      // Main dot
      circle(waypoint, isFocused ? 'blue' : 'red', 3)
    })
  }

  render()

  return { destroy, render }
}
