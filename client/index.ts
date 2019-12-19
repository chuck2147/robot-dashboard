const distanceBetween = ({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point) =>
  Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

const degrees = Math.PI / 180
const bezierDivisions = 200

const getAfterHandle = (point: Waypoint): Point => ({
  x: point.handleAfterLength * Math.cos(point.heading * degrees) + point.x,
  y: point.handleAfterLength * Math.sin(point.heading * degrees) + point.y,
})

const getBeforeHandle = (point: Waypoint): Point => ({
  x: -point.handleBeforeLength * Math.cos(point.heading * degrees) + point.x,
  y: -point.handleBeforeLength * Math.sin(point.heading * degrees) + point.y,
})

export const lerp = (
  minIn: number,
  maxIn: number,
  minOut: number,
  maxOut: number,
) => {
  const inRange = maxIn - minIn
  const outRange = maxOut - minOut

  return (value: number) => {
    const percent = (value - minIn) / inRange
    return percent * outRange + minOut
  }
}

const cubicBezierComponent = (
  t: number,
  start: number,
  end: number,
  control1: number,
  control2: number,
) =>
  (1 - t) ** 3 * start +
  3 * (1 - t) ** 2 * t * control1 +
  3 * (1 - t) * t ** 2 * control2 +
  t ** 3 * end

const cubicBezier = (
  t: number,
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
): Point => ({
  x: cubicBezierComponent(t, start.x, end.x, control1.x, control2.x),
  y: cubicBezierComponent(t, start.y, end.y, control1.y, control2.y),
})

// https://en.wikipedia.org/wiki/File:B%C3%A9zier_2_big.gif
// https://math.stackexchange.com/a/478001
const cubicBezierPrimeComponent = (
  t: number,
  start: number,
  end: number,
  control1: number,
  control2: number,
): number =>
  (1 - t) ** 2 * (control1 - start) +
  2 * t * (1 - t) * (control2 - control1) +
  t ** 2 * (end - control2)

const cubicBezierAngle = (
  t: number,
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
): number => {
  const dY = cubicBezierPrimeComponent(
    t,
    start.y,
    end.y,
    control1.y,
    control2.y,
  )
  const dX = cubicBezierPrimeComponent(
    t,
    start.x,
    end.x,
    control1.x,
    control2.x,
  )
  return Math.atan2(dY, dX)
}

const cubicBezierPrimePrimeComponent = (
  t: number,
  start: number,
  end: number,
  control1: number,
  control2: number,
): number =>
  (1 - t) * (control2 - 2 * control1 + start) +
  t * (end - 2 * control2 + control1)

const cubicBezierCurvature = (
  t: number,
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
): number => {
  const dY = cubicBezierPrimeComponent(
    t,
    start.y,
    end.y,
    control1.y,
    control2.y,
  )
  const dX = cubicBezierPrimeComponent(
    t,
    start.x,
    end.x,
    control1.x,
    control2.x,
  )
  const ddY = cubicBezierPrimePrimeComponent(
    t,
    start.y,
    end.y,
    control1.y,
    control2.y,
  )
  const ddX = cubicBezierPrimePrimeComponent(
    t,
    start.x,
    end.x,
    control1.x,
    control2.x,
  )
  return Math.abs(dX * ddY - dY * ddX) / (dX ** 2 + dY ** 2) ** (3 / 2)
}

interface Point {
  /** x position in inches. 0 is the bottom left of the field */
  x: number
  /** y position in inches. 0 is the bottom right of the field */
  y: number
}

interface Waypoint extends Point {
  /**
   * The direction the robot is moving, in degrees, with 0 being right.
   * This is *not* the way the robot is facing,
   * because the robot's movement is separate from the robot's angle
   */
  heading: number
  /** Length in inches of the handle for the part of the path that goes to the previous waypoint */
  handleBeforeLength: number
  /** Length in inches of the handle for the part of the path that goes to the next waypoint */
  handleAfterLength: number
}

interface SegmentPoint extends Point {
  /** Total distance along path segment up to point */
  distance: number
  /**
   * The direction the robot is moving, in degrees, with 0 being right.
   * This is *not* the way the robot is facing,
   * because the robot's movement is separate from the robot's angle
   */
  heading: number
}

interface PathPoint extends Point {
  // curvature: number
  angle: number
  /**
   * The direction the robot is moving, in degrees, with 0 being right.
   * This is *not* the way the robot is facing,
   * because the robot's movement is separate from the robot's angle
   */
  heading: number
}

interface PathSegment {
  start: Point
  end: Point
  points: SegmentPoint[]
  length: number
}

type InterpolatedPath = PathSegment[]

interface AngleLocation {
  afterWaypoint: number
  segmentLengthPercent: number
  angle: number
}

interface Path {
  waypoints: Waypoint[]
  angles: AngleLocation[]
}

const path: Path = {
  waypoints: [
    {
      x: 90,
      y: 40,
      heading: 90,
      handleBeforeLength: 20,
      handleAfterLength: 20,
    },
    {
      x: 90,
      y: 240,
      heading: 90,
      handleBeforeLength: 20,
      handleAfterLength: 20,
    },
    {
      x: 90,
      y: 440,
      heading: 90,
      handleBeforeLength: 20,
      handleAfterLength: 20,
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
