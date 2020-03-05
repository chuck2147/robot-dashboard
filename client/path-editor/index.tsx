/* eslint-disable complexity */
import { h, Fragment, JSX } from 'preact'
import { useRef, useEffect, useState, useCallback } from 'preact/hooks'
import fieldImage from '../../2020Field.png'
import { css } from 'linaria'
import { lerp } from '../utils'
import { initUiCanvas } from './ui-canvas'
import { Path, DisplayMode } from '../types'
import { initPathCanvas } from './path-canvas'
import { computeTrajectory } from './compute-trajectory'
import { initAnimationCanvas } from './animation-canvas'
import { useNTValue, connect, useLivePoint } from '../nt'
import { useConfState } from './use-conf-state'
import { initLiveCanvas } from './live-canvas'
import { maxVelocity as globalMaxVelocity } from '../../config'

declare global {
  interface Window {
    savePaths(
      folderPath: string,
      trajectories: string,
      paths: string,
    ): Promise<void>
    readPaths(folderPath: string): Promise<string>
  }
}

const fieldImageOriginalWidth = 1379
const fieldImageOriginalHeight = 2641

const canvasWidth = 2500
const canvasHeight =
  canvasWidth * (fieldImageOriginalHeight / fieldImageOriginalWidth)
export { canvasWidth }
export { canvasHeight }

// The numbers here are in terms of image pixels
// Then they get multiplied to be converted to canvas width
const fieldXMin = (70 / fieldImageOriginalWidth) * canvasWidth
const fieldXMax = (1309 / fieldImageOriginalWidth) * canvasWidth
const fieldYMin = (119 / fieldImageOriginalWidth) * canvasWidth
const fieldYMax = (2522 / fieldImageOriginalWidth) * canvasWidth

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
  live?: ReturnType<typeof initLiveCanvas>
}

export const PathEditor = () => {
  const [isSaving, setIsSaving] = useState(false)
  const pathCanvas = useRef<HTMLCanvasElement>()
  const uiCanvas = useRef<HTMLCanvasElement>()
  const liveCanvas = useRef<HTMLCanvasElement>()
  const animationCanvas = useRef<HTMLCanvasElement>()
  const layers = useRef<Layers>({})
  const isUpdateQueued = useRef(false)
  const [robotIp, setRobotIp] = useConfState<string | undefined>(
    'robotIp',
    'roborio-2147-frc.local',
  )
  const [jsonFolder, setJsonFolder] = useConfState<string | undefined>(
    'jsonFolder',
    '/foo/bar/src/main/deploy',
  )
  const [pathName, setPathName] = useState<string | null>(null)

  useEffect(() => {
    connect(robotIp)
  }, [robotIp])

  const paths = useRef<{ [key: string]: Path }>({})

  const path = useRef<Path | null>(null)

  const [trajectory, setTrajectory] = useState(
    path.current ? computeTrajectory(path.current) : null,
  )
  const [displayMode, setDisplayMode] = useState(DisplayMode.Waypoints)

  useEffect(() => {
    layers.current.path?.render(trajectory)
  }, [trajectory])

  useEffect(() => stopAnimation(), [trajectory])

  const onPathChange = () => {
    if (isUpdateQueued.current) return
    isUpdateQueued.current = true
    requestIdleCallback(() => {
      isUpdateQueued.current = false
      setTrajectory(path.current ? computeTrajectory(path.current) : null)
    })
  }

  const setPath = useCallback((pathName: string | null) => {
    if (pathName) path.current = paths.current[pathName] || null
    layers.current.ui?.render()
    onPathChange()
  }, [])

  useEffect(() => {
    setPath(pathName)
  }, [pathName, setPath])

  useEffect(() => {
    if (!uiCanvas.current) return
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
    if (!liveCanvas.current) return
    const liveLayer = initLiveCanvas(liveCanvas.current)
    layers.current.live = liveLayer
    return () => liveLayer?.destroy()
  })

  useEffect(() => {
    layers.current.ui?.setDisplayMode(displayMode)
  }, [displayMode])

  const pathDuration = trajectory && trajectory[trajectory.length - 1].time

  const [isPlaying, setIsPlaying] = useState(false)
  const playAnimation = () => {
    if (!trajectory) return
    layers.current.animation?.play(trajectory)
    setIsPlaying(true)
  }
  const stopAnimation = () => {
    layers.current.animation?.stop()
    setIsPlaying(false)
  }

  const [livePathName] = useNTValue<string>('/pathFollowing/currentPath')

  useEffect(() => {
    if (livePathName) layers.current.animation?.stop()
  }, [livePathName])

  const livePathCurrentPoint = useLivePoint('/pathFollowing/current')
  const livePathTargetPoint = useLivePoint('/pathFollowing/target')

  useEffect(() => {
    layers.current.live?.render(livePathTargetPoint, livePathCurrentPoint)
  }, [livePathCurrentPoint, livePathTargetPoint])

  useEffect(() => {
    // If there is a live path, render it, otherwise render the user-selected path
    setPath(livePathName || pathName)
  }, [livePathName, pathName, setPath])

  const newPath = () => {
    const name = 'New Path'
    paths.current[name] = {
      waypoints: [
        {
          x: 10,
          y: 10,
          heading: 0,
          handleBeforeLength: 20,
          handleAfterLength: 20,
        },
        {
          x: 100,
          y: 100,
          heading: 0,
          handleBeforeLength: 20,
          handleAfterLength: 20,
        },
      ],
      angles: [
        {
          afterWaypoint: 0,
          t: 0.1,
          angle: Math.PI / 2,
        },
        {
          afterWaypoint: 0,
          t: 0.9,
          angle: Math.PI / 2,
        },
      ],
    }
    setPathName(name)
  }

  const deletePathByName = (name: string) => {
    paths.current = Object.fromEntries(
      Object.entries(paths.current).filter(([key]) => key !== name),
    )
  }

  const deletePath = () => {
    if (!pathName) return
    deletePathByName(pathName)
    setPathName(Object.keys(paths.current)[0])
  }

  const renamePath: JSX.GenericEventHandler<HTMLInputElement> = e => {
    const newName = e.currentTarget.value
    if (!pathName || !newName) return
    paths.current[newName] = paths.current[pathName]
    deletePathByName(pathName)
    setPathName(newName)
  }

  const loadPaths = useCallback(() => {
    if (!jsonFolder) return
    window.readPaths(jsonFolder).then(json => {
      paths.current = JSON.parse(json)
      setPathName(Object.keys(paths.current)[0])
    })
  }, [jsonFolder])

  useEffect(() => {
    // If there are no paths, load paths
    if (Object.keys(paths.current).length === 0) loadPaths()
  }, [jsonFolder, loadPaths])

  const savePaths = () => {
    setIsSaving(true)
    if (!jsonFolder) return
    const trajectories = Object.entries(paths.current).map(
      ([pathName, path]) => {
        const trajectory = computeTrajectory(path)
        return { name: pathName, points: trajectory }
      },
    )

    window
      .savePaths(
        jsonFolder,
        JSON.stringify(trajectories),
        JSON.stringify(paths.current, null, 2),
      )
      .finally(() => setIsSaving(false))
  }

  const setMaxVelocity = (newMaxVelocity: number | null) => {
    if (!path.current) return
    if (newMaxVelocity === null) {
      delete path.current.maxVelocity
    } else {
      path.current.maxVelocity = newMaxVelocity
    }

    layers.current.ui?.render()
    onPathChange()
  }

  const hide = { display: 'none' }
  const hideIfLive = livePathName ? hide : undefined

  return (
    <div class={pathEditorStyle}>
      <div class={fieldStyle}>
        <img src={fieldImage} alt="field" class={imageStyle} />
        <canvas ref={pathCanvas} width={canvasWidth} height={canvasHeight} />
        <canvas
          ref={animationCanvas}
          width={canvasWidth}
          height={canvasHeight}
          style={hideIfLive}
        />
        <canvas ref={liveCanvas} width={canvasWidth} height={canvasHeight} />
        <canvas
          ref={uiCanvas}
          width={canvasWidth}
          height={canvasHeight}
          style={hideIfLive}
        />
      </div>
      <div class={rightPanelStyle}>
        <button onClick={() => window.location.reload()}>Reload</button>
        {pathDuration && <h1>{`${pathDuration.toPrecision(4)}s`}</h1>}
        {livePathName && <h1>{`Live Path: ${livePathName}`}</h1>}
        <h1>{`Connected: ${livePathCurrentPoint !== null}`}</h1>
        <input
          type="text"
          onChange={e => setRobotIp(e.currentTarget.value)}
          value={robotIp}
        />
        {!livePathName && (
          <Fragment>
            <input
              type="text"
              onChange={e => setJsonFolder(e.currentTarget.value)}
              value={jsonFolder}
            />
            <button onClick={loadPaths}>Load Paths</button>
            <button onClick={newPath}>New Path</button>
            {pathName && <button onClick={deletePath}>Delete Path</button>}
            {pathName && (
              <button onClick={savePaths} disabled={isSaving}>
                {isSaving ? 'Saving Paths...' : 'Save Paths'}
              </button>
            )}
            {pathName && (
              // eslint-disable-next-line caleb/jsx-a11y/no-onchange
              <select
                onChange={e => setPathName(e.currentTarget.value)}
                value={pathName || ''}
              >
                {Object.keys(paths.current).map(pathName => (
                  <option value={pathName} key={pathName}>
                    {pathName}
                  </option>
                ))}
              </select>
            )}
            {pathName && (
              <input type="text" value={pathName || ''} onInput={renamePath} />
            )}
            {pathName && (
              <button onClick={isPlaying ? stopAnimation : playAnimation}>
                {isPlaying ? 'Stop' : 'Animate'}
              </button>
            )}
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
            {path.current?.maxVelocity ? (
              <Fragment>
                <label>
                  <span>Max Speed (ft/s)</span>
                  <input
                    type="number"
                    min={1}
                    max={globalMaxVelocity}
                    step={0.5}
                    value={path.current.maxVelocity}
                    onInput={e => setMaxVelocity(Number(e.currentTarget.value))}
                  />
                </label>
                <button onClick={() => setMaxVelocity(null)}>
                  Un-Override Max Speed For Path
                </button>
              </Fragment>
            ) : (
              <button onClick={() => setMaxVelocity(globalMaxVelocity)}>
                Override Max Speed For Path
              </button>
            )}
          </Fragment>
        )}
      </div>
    </div>
  )
}
