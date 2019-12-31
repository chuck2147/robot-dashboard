import { Point, Waypoint, Path, DisplayMode, AnglePoint } from '../types'
import {
  mouseXToFieldX,
  mouseYToFieldY,
  convertY,
  convertX,
  canvasWidth,
  canvasHeight,
  inchesToPixels,
} from '.'
import { darken, transparentize } from 'polished'
import { Ref } from 'preact/hooks'
import {
  drawCircle,
  distanceBetween,
  getBeforeHandle,
  getAfterHandle,
  locateAnglePoint,
  findNearestPointOnPath,
  cubicBezierAngle,
  drawBumpers,
} from '../utils'
import { bezierDivisions } from '../../config'

const anglePointRadius = 15

const isWaypoint = (
  focusedElement: null | Waypoint | AnglePoint,
): focusedElement is Waypoint =>
  focusedElement !== null && 'heading' in focusedElement

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

  let focusedElement: null | Waypoint | AnglePoint = null
  let activeElement:
    | null
    | 'waypoint'
    | 'beforehandle'
    | 'afterhandle'
    | 'anglepoint'
    | 'anglehandle' = null

  let displayMode = DisplayMode.Waypoints

  const clickThreshold = 5

  const mouseDownListener = (e: MouseEvent) => {
    const clickLocation = getPointFromEvent(e)
    if (displayMode === DisplayMode.Waypoints) {
      const matchingWaypoint = pathRef.current.waypoints.find(
        p => distanceBetween(p, clickLocation) < clickThreshold,
      )
      if (matchingWaypoint) {
        focusedElement = matchingWaypoint
        activeElement = 'waypoint'
        render()
        return
      }

      if (focusedElement && isWaypoint(focusedElement)) {
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
    } else {
      const matchingAnglePoint = pathRef.current.angles.find(anglePoint => {
        const point = locateAnglePoint(anglePoint, pathRef.current)
        const dist = distanceBetween(point, clickLocation)
        if (dist < clickThreshold) activeElement = 'anglepoint'
        else activeElement = 'anglehandle'
        return dist < anglePointRadius
      })
      if (matchingAnglePoint) {
        focusedElement = matchingAnglePoint
        const anglePoint = locateAnglePoint(matchingAnglePoint, pathRef.current)
        if (activeElement === 'anglehandle') {
          const deltaY = clickLocation.y - anglePoint.y
          const deltaX = clickLocation.x - anglePoint.x
          focusedElement.angle = Math.atan2(deltaY, deltaX)
        }
        render()
        return
      }
    }

    focusedElement = null
    activeElement = null
    render()
  }
  const mouseUpListener = () => {
    activeElement = null
  }
  const mouseMoveListener = (e: MouseEvent) => {
    if (!focusedElement || !activeElement) return
    const mouseLocation = getPointFromEvent(e)
    if (activeElement === 'waypoint') {
      Object.assign(focusedElement, mouseLocation)
    } else if (activeElement === 'anglepoint') {
      if (isWaypoint(focusedElement)) return
      Object.assign(
        focusedElement,
        findNearestPointOnPath(mouseLocation, pathRef.current),
      )
    } else if (activeElement === 'anglehandle') {
      if (isWaypoint(focusedElement)) return
      const anglePoint = locateAnglePoint(focusedElement, pathRef.current)
      const deltaY = mouseLocation.y - anglePoint.y
      const deltaX = mouseLocation.x - anglePoint.x
      focusedElement.angle = Math.atan2(deltaY, deltaX)
    } else {
      if (!isWaypoint(focusedElement)) return
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

  const doubleClickListener = (e: MouseEvent) => {
    const clickLocation = getPointFromEvent(e)

    if (displayMode === DisplayMode.AnglePoints) {
      pathRef.current.angles.push({
        ...findNearestPointOnPath(clickLocation, pathRef.current),
        angle: Math.PI / 2,
      })
    } else {
      const { afterWaypoint, t } = findNearestPointOnPath(
        clickLocation,
        pathRef.current,
      )
      const bezierStart = pathRef.current.waypoints[afterWaypoint]
      const bezierEnd = pathRef.current.waypoints[afterWaypoint + 1]
      const cp1 = getAfterHandle(bezierStart)
      const cp2 = getBeforeHandle(bezierEnd)
      const heading =
        cubicBezierAngle(t, bezierStart, bezierEnd, cp1, cp2) * (180 / Math.PI)
      // Each anglepoint gets assigned a new location based on the nearest point on the new path
      const anglePointLocations = pathRef.current.angles.map(anglePoint => ({
        angle: anglePoint.angle,
        ...locateAnglePoint(anglePoint, pathRef.current),
      }))
      // Add waypoint
      pathRef.current.waypoints.splice(afterWaypoint + 1, 0, {
        handleAfterLength: 10,
        handleBeforeLength: 10,
        heading,
        ...clickLocation,
      })
      pathRef.current.angles = anglePointLocations.map(({ angle, x, y }) => ({
        ...findNearestPointOnPath({ x, y }, pathRef.current),
        angle,
      }))
    }
    render()
  }

  const keyListener = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && focusedElement) {
      if (isWaypoint(focusedElement)) {
        // Delete focused waypoint
        // Each anglepoint gets assigned a new location based on the nearest point on the new path
        const anglePointLocations = pathRef.current.angles.map(anglePoint => ({
          angle: anglePoint.angle,
          ...locateAnglePoint(anglePoint, pathRef.current),
        }))
        pathRef.current.waypoints = pathRef.current.waypoints.filter(
          p => p !== focusedElement,
        )
        pathRef.current.angles = anglePointLocations.map(({ angle, x, y }) => ({
          ...findNearestPointOnPath({ x, y }, pathRef.current),
          angle,
        }))
        render()
      } else {
        // Delete focused anglepoint
        pathRef.current.angles = pathRef.current.angles.filter(
          anglePoint => anglePoint !== focusedElement,
        )
        render()
      }
    }
  }

  canvas.addEventListener('mousemove', mouseMoveListener)
  canvas.addEventListener('mousedown', mouseDownListener)
  canvas.addEventListener('mouseup', mouseUpListener)
  canvas.addEventListener('dblclick', doubleClickListener)
  window.addEventListener('keypress', keyListener)

  const destroy = () => {
    canvas.removeEventListener('mousemove', mouseMoveListener)
    canvas.removeEventListener('mousedown', mouseDownListener)
    canvas.removeEventListener('mouseup', mouseUpListener)
    canvas.removeEventListener('dblclick', doubleClickListener)
    window.removeEventListener('keypress', keyListener)
    clear()
  }

  const render = () => {
    onChange()
    clear()
    const path = pathRef.current

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

      const waypointColor = 'red'
      const color = isFocused ? darken(0.1, waypointColor) : waypointColor
      // Main dot
      circle(
        waypoint,
        displayMode === DisplayMode.Waypoints
          ? color
          : transparentize(0.7, color),
        3,
      )
    })

    path.angles.forEach(anglePoint => {
      const point = locateAnglePoint(anglePoint, path)
      const anglePointColor = 'blue'
      const isFocused = anglePoint === focusedElement
      const color = isFocused ? darken(0.3, anglePointColor) : 'blue'

      const lineLength =
        displayMode === DisplayMode.AnglePoints ? anglePointRadius : 10

      const colorWithOpacity =
        displayMode === DisplayMode.AnglePoints
          ? color
          : transparentize(0.7, color)

      line(
        point,
        {
          x: point.x + lineLength * Math.cos(anglePoint.angle),
          y: point.y + lineLength * Math.sin(anglePoint.angle),
        },
        colorWithOpacity,
      )
      if (displayMode === DisplayMode.AnglePoints) {
        circle(point, transparentize(0.9, color), anglePointRadius * 2)
      }

      circle(point, colorWithOpacity, 3)
    })
  }

  const setDisplayMode = (newDisplayMode: DisplayMode) => {
    displayMode = newDisplayMode
    focusedElement = null
    activeElement = null

    render()
  }

  render()

  return { destroy, render, setDisplayMode }
}
