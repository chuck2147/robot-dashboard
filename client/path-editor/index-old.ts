import {
  distanceBetween,
  getBeforeHandle,
  getAfterHandle,
  cubicBezier,
  cubicBezierAngle,
  lerp,
} from '../utils'
import {
  Path,
  AngleLocation,
  Waypoint,
  PathPoint,
  InterpolatedPath,
  SegmentPoint,
} from '../types'

const bezierDivisions = 200

const path: Path = {
  waypoints: [
    {
      x: 90,
      y: 40,
      heading: 90,
      handleBeforeLength: 80,
      handleAfterLength: 80,
    },
    {
      x: 90,
      y: 240,
      heading: 90,
      handleBeforeLength: 80,
      handleAfterLength: 80,
    },
    {
      x: 90,
      y: 440,
      heading: 90,
      handleBeforeLength: 80,
      handleAfterLength: 80,
    },
  ],
  angles: [
    { afterWaypoint: 0, segmentLengthPercent: 0.25, angle: 90 },
    { afterWaypoint: 1, segmentLengthPercent: 0.75, angle: 60 },
  ],
}

const main = () => {
  /** Canvas width in pixels */
  const canvasWidth = 1000
  const fieldWidth = canvasWidth
  const canvasScale = 2
  /** Unit converter */
  const feet = fieldWidth / 27
  const inches = feet / 12
  const fieldHeight = 54 * feet
  const canvasHeight = fieldHeight
  const canvas = document.querySelector<HTMLCanvasElement>('.path-canvas')
  if (!canvas) return
  canvas.setAttribute('width', String(canvasWidth))
  canvas.setAttribute('height', String(canvasHeight))
  canvas.style.border = '1px solid green'
  canvas.style.width = `${canvasWidth / canvasScale}px`

  const mouseXToFieldX = (x: number) => (x / inches) * canvasScale
  const mouseYToFieldY = (y: number) => (fieldHeight - y * canvasScale) / inches

  let isMouseDown = false

  canvas.addEventListener('mousedown', e => {
    isMouseDown = true
    const rect = canvas.getBoundingClientRect()
    e.preventDefault()
    const clickX = mouseXToFieldX(e.clientX - rect.left)
    const clickY = mouseYToFieldY(e.clientY - rect.top)
    const waypoint = path.waypoints.find(p => {
      const dist = distanceBetween({ x: clickX, y: clickY }, p)
      return dist < 5
    })

    // They clicked a waypoint, so "focus" that one and render
    if (waypoint) {
      focusedWaypoint = waypoint
      focusedControlPoint = null
      render()
      return
    }
    // They didn't click on a point, but check if they clicked on a handle for the focused point
    if (focusedWaypoint) {
      const beforeControl = getBeforeHandle(focusedWaypoint)
      const afterControl = getAfterHandle(focusedWaypoint)
      const distToBefore = distanceBetween(
        { x: clickX, y: clickY },
        beforeControl,
      )
      const distToAfter = distanceBetween(
        { x: clickX, y: clickY },
        afterControl,
      )

      focusedControlPoint =
        distToBefore < 5 ? 'before' : distToAfter < 5 ? 'after' : null
      if (focusedControlPoint) return
    }
    focusedWaypoint = null
    render()
  })
  canvas.addEventListener('mouseup', () => {
    isMouseDown = false
    focusedControlPoint = null
  })

  canvas.addEventListener('mousemove', e => {
    if (!isMouseDown || !focusedWaypoint) return
    const rect = canvas.getBoundingClientRect()
    const x = mouseXToFieldX(e.clientX - rect.left)
    const y = mouseYToFieldY(e.clientY - rect.top)

    if (focusedControlPoint) {
      focusedWaypoint.heading =
        Math.atan2(y - focusedWaypoint.y, x - focusedWaypoint.x) *
          (180 / Math.PI) +
        (focusedControlPoint === 'before' ? 180 : 0)

      const dist = distanceBetween({ x, y }, focusedWaypoint)

      if (focusedControlPoint === 'before')
        focusedWaypoint.handleBeforeLength = dist
      else focusedWaypoint.handleAfterLength = dist
    } else {
      focusedWaypoint.x = x
      focusedWaypoint.y = y
    }
    render()
  })

  // eslint-disable-next-line caleb/shopify/prefer-early-return
  window.addEventListener('keypress', e => {
    // TODO: lerp previous percent from segment getting deleted up to whole range
    if (e.key === 'Delete' && focusedWaypoint) {
      const deletedWaypointIndex = path.waypoints.indexOf(focusedWaypoint)
      // Can't delete if there would be less than 2 left
      if (path.waypoints.length - 1 < 2) return
      // Remove deleted waypoint from waypoints list
      path.waypoints = path.waypoints.filter(p => p !== focusedWaypoint)
      path.angles = path.angles
        .map(angle => {
          if (angle.afterWaypoint === deletedWaypointIndex) {
            return null
          }
          if (angle.afterWaypoint >= deletedWaypointIndex)
            return { ...angle, afterWaypoint: angle.afterWaypoint }
          return angle
        })
        .filter((angle): angle is AngleLocation => angle !== null)
      focusedWaypoint = null
      focusedControlPoint = null
      render()
    }
  })

  /** Converts x coordinates from field unit system to canvas unit system */
  const convertX = (xVal: number) => xVal * inches

  /** Converts x coordinates from field unit system to canvas unit system */
  const convertY = (yVal: number) => fieldHeight - yVal * inches

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let focusedWaypoint: Waypoint | null = null
  let focusedControlPoint: 'before' | 'after' | null = null

  const renderPath = () => {
    ctx.beginPath()
    path.waypoints.forEach((startPoint, i) => {
      const endPoint = path.waypoints[i + 1]
      if (!endPoint) return
      const control1 = getAfterHandle(startPoint)
      const control2 = getBeforeHandle(endPoint)
      ctx.moveTo(convertX(startPoint.x), convertY(startPoint.y))
      ctx.bezierCurveTo(
        convertX(control1.x),
        convertY(control1.y),
        convertX(control2.x),
        convertY(control2.y),
        convertX(endPoint.x),
        convertY(endPoint.y),
      )
    })
    ctx.lineWidth = 2 * inches
    ctx.strokeStyle = 'black'
    ctx.stroke()
  }

  const drawCircle = (
    color: string,
    x: number,
    y: number,
    size = 4 * inches,
  ) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, size, 0, 2 * Math.PI)
    ctx.fill()
  }

  const renderWaypoints = () => {
    path.waypoints.forEach(point => {
      drawCircle(
        point === focusedWaypoint ? 'green' : 'red',
        convertX(point.x),
        convertY(point.y),
      )
    })
  }

  const renderHandles = () => {
    if (!focusedWaypoint) return
    const beforeControl = getBeforeHandle(focusedWaypoint)
    const afterControl = getAfterHandle(focusedWaypoint)

    drawCircle(
      'blue',
      convertX(beforeControl.x),
      convertY(beforeControl.y),
      3 * inches,
    )
    drawCircle(
      'blue',
      convertX(afterControl.x),
      convertY(afterControl.y),
      3 * inches,
    )
  }

  const renderWheelPath = (
    xOffset: number,
    yOffset: number,
    pathPoints: PathPoint[],
  ) => {
    ctx.beginPath()
    pathPoints.forEach(point => {
      const angle = (point.angle - 90) * (Math.PI / 180)
      const offsetPoint = {
        x: point.x + xOffset * Math.cos(angle) - yOffset * Math.sin(angle),
        y: point.y + yOffset * Math.cos(angle) + xOffset * Math.sin(angle),
      }
      ctx.lineTo(convertX(offsetPoint.x), convertY(offsetPoint.y))
    })
    ctx.lineWidth = 0.5 * inches
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.stroke()
  }

  const interpolatePath = (inputPath: Path): InterpolatedPath => {
    const interpolatedPath: InterpolatedPath = []
    inputPath.waypoints.forEach((startPoint, waypointIndex) => {
      const endPoint = inputPath.waypoints[waypointIndex + 1]
      if (!endPoint) return
      let segmentLength = 0
      const interpolatedPoints: SegmentPoint[] = []
      const control1 = getAfterHandle(startPoint)
      const control2 = getBeforeHandle(endPoint)
      for (let t = 0; t <= 1; t += 1 / bezierDivisions) {
        const intermediatePoint = cubicBezier(
          t,
          startPoint,
          endPoint,
          control1,
          control2,
        )
        segmentLength += distanceBetween(
          interpolatedPoints[interpolatedPoints.length - 1] || startPoint,
          intermediatePoint,
        )
        interpolatedPoints.push({
          ...intermediatePoint,
          distance: segmentLength,
          heading:
            cubicBezierAngle(t, startPoint, endPoint, control1, control2) *
            (180 / Math.PI),
          // curvature: cubicBezierCurvature(
          //   t,
          //   startPoint,
          //   endPoint,
          //   control1,
          //   control2,
          // ),
        })
      }
      interpolatedPath.push({
        start: startPoint,
        end: endPoint,
        length: segmentLength,
        points: interpolatedPoints,
      })
    })
    return interpolatedPath
  }

  const driveWidth = 25
  const driveLength = 30

  const clear = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  const render = () => {
    clear()
    const interpolatedPath = interpolatePath(path)
    const mappedAngles = path.angles.map(
      ({ angle, afterWaypoint, segmentLengthPercent }) => {
        const segment = interpolatedPath[afterWaypoint]
        if (!segment) throw new Error('no segment for angle')
        const lengthOnSegment = segment.length * segmentLengthPercent
        const pathLengthBefore =
          interpolatedPath.reduce(
            (prevLength, segment, i) =>
              prevLength + (i < afterWaypoint ? segment.length : 0),
            0,
          ) + lengthOnSegment
        return {
          angle,
          pathLengthBefore,
        }
      },
    )
    const getAngle = (pathDistance: number): number => {
      if (mappedAngles.length === 0) return 90
      const startAngle = mappedAngles[0]
      if (mappedAngles.length === 1) return startAngle.angle
      if (pathDistance <= startAngle.pathLengthBefore)
        return mappedAngles[0].angle
      const endAngle = mappedAngles[mappedAngles.length - 1]
      if (pathDistance >= endAngle.pathLengthBefore) return endAngle.angle
      const upperBoundAngle = mappedAngles.find(
        ({ pathLengthBefore }) => pathDistance <= pathLengthBefore,
      )
      const lowerBoundAngle = mappedAngles
        .slice(0, -1)
        .reverse()
        .find(({ pathLengthBefore }) => pathDistance >= pathLengthBefore)
      if (!lowerBoundAngle || !upperBoundAngle)
        throw new Error('unable to find lower or upper bound')
      return lerp(
        lowerBoundAngle.pathLengthBefore,
        upperBoundAngle.pathLengthBefore,
        lowerBoundAngle.angle,
        upperBoundAngle.angle,
      )(pathDistance)
    }
    const pathPoints: PathPoint[] = []
    let previousSegmentsLength = 0
    interpolatedPath.forEach(segment => {
      segment.points.forEach(({ x, y, heading, distance }) => {
        const angle = getAngle(distance + previousSegmentsLength)
        ctx.beginPath()
        pathPoints.push({
          x,
          y,
          heading,
          angle,
        })
      })
      previousSegmentsLength += segment.length
    })
    renderWheelPath(driveWidth / 2, driveLength / 2, pathPoints)
    renderWheelPath(-driveWidth / 2, driveLength / 2, pathPoints)
    renderWheelPath(-driveWidth / 2, -driveLength / 2, pathPoints)
    renderWheelPath(driveWidth / 2, -driveLength / 2, pathPoints)

    renderPath()
    renderWaypoints()
    renderHandles()
  }

  render()
}

main()

export {}
