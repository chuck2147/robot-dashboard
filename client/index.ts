const distanceBetween = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

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

interface Path {
  waypoints: Waypoint[]
}

const path: Path = {
  waypoints: [
    {
      x: 10,
      y: 10,
      heading: 60,
      handleBeforeLength: 3,
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
      handleAfterLength: 1,
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
  const degrees = Math.PI / 180
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
      const dist = distanceBetween(clickX, clickY, p.x, p.y)
      return dist < 5
    })
    focusedWaypoint = waypoint || null
    renderWaypoints()
  })
  canvas.addEventListener('mouseup', () => {
    isMouseDown = false
  })

  canvas.addEventListener('mousemove', e => {
    if (!isMouseDown || !focusedWaypoint) return
    const rect = canvas.getBoundingClientRect()
    focusedWaypoint.x = mouseXToFieldX(e.clientX - rect.left)
    focusedWaypoint.y = mouseYToFieldY(e.clientY - rect.top)
    render()
  })

  /** Converts x coordinates from field unit system to canvas unit system */
  const convertX = (xVal: number) => xVal * inches

  /** Converts x coordinates from field unit system to canvas unit system */
  const convertY = (yVal: number) => fieldHeight - yVal * inches

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  let focusedWaypoint: Waypoint | null = null

  const renderPath = () => {
    ctx.beginPath()
    path.waypoints.forEach((startPoint, i) => {
      const endPoint = path.waypoints[i + 1]
      if (!endPoint) return
      const control1 = {
        x:
          startPoint.handleAfterLength *
            Math.cos(startPoint.heading * degrees) +
          startPoint.x,
        y:
          startPoint.handleAfterLength *
            Math.sin(startPoint.heading * degrees) +
          startPoint.y,
      }
      const control2 = {
        x:
          -endPoint.handleBeforeLength * Math.cos(endPoint.heading * degrees) +
          endPoint.x,
        y:
          -endPoint.handleBeforeLength * Math.sin(endPoint.heading * degrees) +
          endPoint.y,
      }
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
    ctx.stroke()
  }

  const renderWaypoints = () => {
    path.waypoints.forEach(point => {
      ctx.fillStyle = point === focusedWaypoint ? 'green' : 'red'

      ctx.beginPath()
      ctx.arc(convertX(point.x), convertY(point.y), 4 * inches, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  const clear = () => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  }

  const render = () => {
    clear()
    renderPath()
    renderWaypoints()
  }

  render()
}

main()

export {}
