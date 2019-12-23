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

  const path = useRef<Path>({
    waypoints: [
      {
        x: 277.1212416525962,
        y: 20.43254483087323,
        heading: 97.72340230324656,
        handleBeforeLength: 13.391515777953243,
        handleAfterLength: 77.56244772947824,
      },
      {
        x: 270.9321756263204,
        y: 215.8363537607602,
        heading: 123.76399116296626,
        handleBeforeLength: 46.34123863688093,
        handleAfterLength: 75.60727431580094,
      },
      {
        x: 66.367256442046,
        y: 283.9020138713375,
        heading: 89.21231601882324,
        handleBeforeLength: 94.77980381865379,
        handleAfterLength: 18.81006583419939,
      },
    ],
    angles: [
      {
        afterWaypoint: 1,
        t: 0.45400000000000035,
        angle: Math.PI / 2,
      },
      {
        afterWaypoint: 1,
        t: 0.8700000000000007,
        angle: 0.2,
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
      setTrajectory(computeTrajectory(path.current))
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
