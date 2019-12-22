import { h, Fragment } from 'preact'
import { useRef, useEffect, useState } from 'preact/hooks'
import fieldImage from '../../2018Field.png'
import { css } from 'linaria'
import { lerp, round2 } from '../utils'
import { initUiCanvas } from './ui-canvas'
import { Path } from '../types'
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

const fieldStyle = css`
  height: 90vh;
  width: ${90 * (fieldImageOriginalWidth / fieldImageOriginalHeight)}vh;
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
        x: 256.74389964845193,
        y: 15.114965169020229,
        heading: 90,
        handleBeforeLength: 13.391515777953243,
        handleAfterLength: 80,
      },
      {
        x: 284.6127474544519,
        y: 189.20467028241262,
        heading: 97.50735137355946,
        handleBeforeLength: 80,
        handleAfterLength: 94.18603025802724,
      },
      {
        x: 68.53869368585487,
        y: 283.6691464458126,
        heading: 74.23073389922608,
        handleBeforeLength: 113.20228198079899,
        handleAfterLength: 18.81006583419939,
      },
    ],
    angles: [
      {
        afterWaypoint: 0,
        segmentLengthPercent: 0.25,
        angle: 90,
      },
      {
        afterWaypoint: 1,
        segmentLengthPercent: 0.75,
        angle: 60,
      },
    ],
  })

  const [trajectory, setTrajectory] = useState(computeTrajectory(path.current))

  useEffect(() => {
    layers.current.path?.render(trajectory)
  }, [trajectory])

  useEffect(() => {
    layers.current.animation?.stop()
    setIsPlaying(false)
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

  const pathLength = trajectory[trajectory.length - 1].time

  const [isPlaying, setIsPlaying] = useState(false)
  const play = () => {
    layers.current.animation?.play(trajectory)
    setIsPlaying(true)
  }
  const stop = () => {
    layers.current.animation?.stop()
    setIsPlaying(false)
  }

  return (
    <Fragment>
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
      <h1>{`${round2(pathLength)}s`}</h1>
      <button onClick={isPlaying ? stop : play}>
        {isPlaying ? 'Stop' : 'Animate'}
      </button>
    </Fragment>
  )
}
