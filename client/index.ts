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

const cubicBezierAxis = (
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
  x: cubicBezierAxis(t, start.x, end.x, control1.x, control2.x),
  y: cubicBezierAxis(t, start.y, end.y, control1.y, control2.y),
})

// https://en.wikipedia.org/wiki/File:B%C3%A9zier_2_big.gif
// https://math.stackexchange.com/a/478001
const cubicBezierAxisAngle = (
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
  const dY = cubicBezierAxisAngle(t, start.y, end.y, control1.y, control2.y)
  const dX = cubicBezierAxisAngle(t, start.x, end.x, control1.x, control2.x)
  return Math.atan2(dY, dX)
}

const cubicBezierLength = (
  start: Point,
  end: Point,
  control1: Point,
  control2: Point,
) => {
  let lastPoint = start
  let length = 0
  for (let t = 0; t <= 1; t += 1 / bezierDivisions) {
    const intermediatePoint = cubicBezier(t, start, end, control1, control2)
    length += distanceBetween(lastPoint, intermediatePoint)
    lastPoint = intermediatePoint
  }
  return length
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

interface AngleLocation {
  afterWaypoint: number
  bezierT: number
  angle: number
}

interface Path {
  waypoints: Waypoint[]
  angles: AngleLocation[]
}

const path: Path = {
  waypoints: [
    {
      x: 10,
      y: 10,
      heading: 60,
      handleBeforeLength: 5,
      handleAfterLength: 90,
    },
    {
      x: 150,
      y: 150,
      heading: 70,
      handleBeforeLength: 50,
      handleAfterLength: 30,
    },
    {
      x: 170,
      y: 190,
      heading: 70,
      handleBeforeLength: 15,
      handleAfterLength: 5,
    },
  ],
  angles: [
    {
      afterWaypoint: 0,
      bezierT: 0,
      angle: 90,
    },
    {
      afterWaypoint: 1,
      bezierT: 0.5,
      angle: 45,
    },
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

  const renderWheelPath = (xOffset: number, yOffset: number) => {
    ctx.beginPath()
    path.waypoints.forEach((startPoint, i) => {
      const endPoint = path.waypoints[i + 1]
      if (!endPoint) return
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
        const offsetPoint = {
          x: intermediatePoint.x + xOffset,
          y: intermediatePoint.y + yOffset,
        }
        ctx.lineTo(convertX(offsetPoint.x), convertY(offsetPoint.y))
      }
    })
    ctx.lineWidth = inches
    ctx.strokeStyle = 'orange'
    ctx.stroke()
  }

  const driveWidth = 20
  const driveLength = 30
  const renderWheelPaths = () => {
    renderWheelPath(driveWidth / 2, driveLength / 2)
    renderWheelPath(-driveWidth / 2, driveLength / 2)
    renderWheelPath(-driveWidth / 2, -driveLength / 2)
    renderWheelPath(driveWidth / 2, -driveLength / 2)
  }

  const clear = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  const render = () => {
    clear()
    renderWheelPaths()
    renderPath()
    renderWaypoints()
    renderHandles()
  }

  render()
}

main()

export {}
