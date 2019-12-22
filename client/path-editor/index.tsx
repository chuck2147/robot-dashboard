import { h, render } from 'preact'
import { useRef, useEffect, useState } from 'preact/hooks'
import fieldImage from '../../2018Field.png'
import { css } from 'linaria'
import { lerp } from '../utils'
import { initUiCanvas } from './ui-canvas'
import { Path } from '../types'
import { initPathCanvas } from './path-canvas'

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

export const PathEditor = () => {
  const pathCanvas = useRef<HTMLCanvasElement>()
  const uiCanvas = useRef<HTMLCanvasElement>()
  const renderers = useRef<(() => void)[]>([])

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

  const renderAllLayers = () => {
    renderers.current.forEach(renderer => renderer())
    console.log(path.current)
  }

  useEffect(() => {
    if (!uiCanvas.current) return

    const ui = initUiCanvas(uiCanvas.current, path, renderAllLayers)
    if (!ui) return

    renderers.current.push(ui.render)

    // const ctx = uiCanvas.current.getContext('2d')
    // const minX = convertX(0)
    // const maxX = convertX(27 * feet)
    // const minY = convertY(0)
    // const maxY = convertY(27 * feet)
    // ctx && ctx.fillRect(minX, minY, maxX - minX, maxY - minY)

    return () => ui.destroy()
  }, [])

  useEffect(() => {
    if (!pathCanvas.current) return

    const pathCanvasInstance = initPathCanvas(pathCanvas.current, path)
    if (!pathCanvasInstance) return

    renderers.current.push(pathCanvasInstance.render)

    return () => pathCanvasInstance.destroy()
  }, [])

  return (
    <div class={fieldStyle}>
      <img src={fieldImage} alt="2018 field" class={imageStyle} />
      <canvas ref={pathCanvas} width={canvasWidth} height={canvasHeight} />
      <canvas ref={uiCanvas} width={canvasWidth} height={canvasHeight} />
    </div>
  )
}
