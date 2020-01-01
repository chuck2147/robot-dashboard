import { h } from 'preact'
import { useRef, useEffect, useState } from 'preact/hooks'
import fieldImage from '../../2018Field.png'
import { css } from 'linaria'
import { lerp } from '../utils'
import { initUiCanvas } from './ui-canvas'
import { Path, DisplayMode } from '../types'
import { initPathCanvas } from './path-canvas'
import { computeTrajectory } from './compute-trajectory'
import { initAnimationCanvas } from './animation-canvas'

const fieldImageOriginalWidth = 1077
const fieldImageOriginalHeight = 1063

const canvasWidth = 2500
const canvasHeight =
  canvasWidth * (fieldImageOriginalHeight / fieldImageOriginalWidth)
export { canvasWidth }
export { canvasHeight }

// The numbers here are in terms of image pixels
// Then they get multiplied to be converted to canvas width
const fieldXMin = (87 / fieldImageOriginalWidth) * canvasWidth
const fieldXMax = (986 / fieldImageOriginalWidth) * canvasWidth
const fieldYMin = (0 / fieldImageOriginalWidth) * canvasWidth
const fieldYMax = (1001 / fieldImageOriginalWidth) * canvasWidth

const inches = 1
const feet = 12 * inches

const fieldWidth = 27 * feet
const fieldHeight =
  (fieldWidth * (fieldYMax - fieldYMin)) / (fieldXMax - fieldXMin)

/** Converts x coordinates from field unit system to canvas unit system */
export const convertX = (x: number) =>
  lerp(0, fieldWidth, fieldXMin, fieldXMax)(x)

/** Converts x coordinates from field unit system to canvas unit system */
export const convertY = (y: number) =>
  lerp(0, fieldHeight, fieldYMax, fieldYMin)(y)

export const inchesToPixels = (input: number) =>
  (input * (fieldXMax - fieldXMin)) / fieldWidth

export const mouseXToFieldX = (x: number) =>
  lerp(fieldXMin, fieldXMax, 0, fieldWidth)(x)
export const mouseYToFieldY = (y: number) =>
  lerp(fieldYMax, fieldYMin, 0, fieldHeight)(y)

const pathEditorStyle = css`
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: 100vh;
`

const rightPanelStyle = css`
  padding: 1rem;
  display: grid;
  grid-gap: 1rem;
  grid-auto-rows: max-content;
`

const fieldStyle = css`
  height: 100vh;
  width: ${100 * (fieldImageOriginalWidth / fieldImageOriginalHeight)}vh;
  position: relative;

  & * {
    /* Text selection was causing bugs with double clicking then dragging */
    user-select: none;
    display: block;
    height: 100%;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }
`

const imageStyle = css`
  pointer-events: none;
`

interface Layers {
  ui?: ReturnType<typeof initUiCanvas>
  path?: ReturnType<typeof initPathCanvas>
  animation?: ReturnType<typeof initAnimationCanvas>
}

export const PathEditor = () => {
  const pathCanvas = useRef<HTMLCanvasElement>()
  const uiCanvas = useRef<HTMLCanvasElement>()
  const animationCanvas = useRef<HTMLCanvasElement>()
  const layers = useRef<Layers>({})
  const isUpdateQueued = useRef(false)

  const path = useRef<Path>({
    waypoints: [
      {
        x: 269.9549546748031,
        y: 19.12985277134063,
        heading: 86.6196194041415,
        handleBeforeLength: 13.391515777953243,
        handleAfterLength: 82.86512469364033,
      },
      {
        x: 271.5836562606652,
        y: 215.51068074587704,
        heading: 133.4884972524448,
        handleBeforeLength: 47.092960427380426,
        handleAfterLength: 69.57745560136352,
      },
      {
        x: 71.90484183397699,
        y: 281.29662975227234,
        heading: 87.57999137158913,
        handleBeforeLength: 92.57369849550282,
        handleAfterLength: 18.81006583419939,
      },
    ],
    angles: [
      {
        afterWaypoint: 0,
        t: 0,
        angle: 1.5707963267948966,
      },
      {
        afterWaypoint: 1,
        t: 0.1580000000000001,
        angle: 1.3298706757934387,
      },
      {
        afterWaypoint: 1,
        t: 0.5260000000000004,
        angle: 1.595798887763642,
      },
      {
        afterWaypoint: 1,
        t: 0.8540000000000006,
        angle: 1.207290157450596,
      },
    ],
  })

  const [trajectory, setTrajectory] = useState(computeTrajectory(path.current))
  const [displayMode, setDisplayMode] = useState(DisplayMode.Waypoints)

  useEffect(() => {
    layers.current.path?.render(trajectory)
  }, [trajectory])

  useEffect(() => {
    stopAnimation()
  }, [trajectory])

  useEffect(() => {
    if (!uiCanvas.current) return
    const onPathChange = () => {
      if (isUpdateQueued.current) return
      isUpdateQueued.current = true
      requestIdleCallback(() => {
        isUpdateQueued.current = false
        setTrajectory(computeTrajectory(path.current))
      })
    }
    const uiLayer = initUiCanvas(uiCanvas.current, path, onPathChange)
    layers.current.ui = uiLayer
    return () => uiLayer?.destroy()
  }, [])

  useEffect(() => {
    if (!pathCanvas.current) return
    const pathLayer = initPathCanvas(pathCanvas.current)
    layers.current.path = pathLayer
    return () => pathLayer?.destroy()
  }, [])

  useEffect(() => {
    if (!animationCanvas.current) return
    const animationLayer = initAnimationCanvas(animationCanvas.current)
    layers.current.animation = animationLayer
    return () => animationLayer?.destroy()
  }, [])

  useEffect(() => {
    layers.current.ui?.setDisplayMode(displayMode)
  }, [displayMode])

  const pathLength = trajectory[trajectory.length - 1].time

  const [isPlaying, setIsPlaying] = useState(false)
  const playAnimation = () => {
    layers.current.animation?.play(trajectory)
    setIsPlaying(true)
  }
  const stopAnimation = () => {
    layers.current.animation?.stop()
    setIsPlaying(false)
  }

  return (
    <div class={pathEditorStyle}>
      <div class={fieldStyle}>
        <img src={fieldImage} alt="2018 field" class={imageStyle} />
        <canvas ref={pathCanvas} width={canvasWidth} height={canvasHeight} />
        <canvas
          ref={animationCanvas}
          width={canvasWidth}
          height={canvasHeight}
        />
        <canvas ref={uiCanvas} width={canvasWidth} height={canvasHeight} />
      </div>
      <div class={rightPanelStyle}>
        <h1>{`${pathLength.toPrecision(4)}s`}</h1>
        <button onClick={isPlaying ? stopAnimation : playAnimation}>
          {isPlaying ? 'Stop' : 'Animate'}
        </button>
        <button
          style={{
            background:
              displayMode === DisplayMode.AnglePoints ? 'blue' : 'red',
            border: 'none',
            color: 'white',
          }}
          onClick={() =>
            setDisplayMode(m =>
              m === DisplayMode.AnglePoints
                ? DisplayMode.Waypoints
                : DisplayMode.AnglePoints,
            )
          }
        >
          {displayMode === DisplayMode.AnglePoints
            ? 'Showing Angle Points'
            : 'Showing Waypoints'}
        </button>
      </div>
    </div>
  )
}
