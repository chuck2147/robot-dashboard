import {
  Path,
  InterpolatedPath,
  Trajectory,
  Vector2,
  TrajectoryPoint,
  Point,
} from '../types'
import {
  getAfterHandle,
  getBeforeHandle,
  cubicBezier,
  cubicBezierAngle,
  cubicBezierCurvature,
  clamp,
  distanceBetween,
} from '../utils'
import {
  bezierDivisions,
  maxVelocity as originalMaxVelocity,
  maxAccel as originalMaxAccel,
  maxDecel as originalMaxDecel,
  curvatureVelocity,
} from '../../config'

enum SmoothDirection {
  FORWARDS,
  REVERSE,
}

/** in/s */
const maxVelocity = originalMaxVelocity * 12
/** in/s */
const maxAccel = originalMaxAccel * 12
/** in/s */
const maxDecel = originalMaxDecel * 12

type TrajectoryPointWithoutTime = Omit<TrajectoryPoint, 'time'>
type TrajectoryWithoutTime = TrajectoryPointWithoutTime[]

const smoothTrajectory = (
  trajectory: TrajectoryWithoutTime,
  direction: SmoothDirection,
) => {
  let lastVelocity = 0
  let lastPoint: Point | null = null
  const orderedArray =
    direction === SmoothDirection.FORWARDS
      ? trajectory
      : trajectory.slice(0).reverse()

  const newTrajectory: TrajectoryWithoutTime = orderedArray.map(point => {
    const dist = lastPoint ? distanceBetween(lastPoint, point) : 0
    const accel = direction === SmoothDirection.FORWARDS ? maxAccel : maxDecel
    // v'^2 = v0^2 + 2a(x-x0)
    const maxVelocity = lastPoint
      ? Math.sqrt(lastVelocity ** 2 + 2 * accel * dist)
      : 0
    const originalNetVelocity = Math.sqrt(
      point.velocity.x ** 2 + point.velocity.y ** 2,
    )
    const netVelocity = Math.min(originalNetVelocity, maxVelocity)
    lastVelocity = netVelocity
    lastPoint = point
    return {
      ...point,
      velocity: {
        x: netVelocity * Math.cos(point.heading),
        y: netVelocity * Math.sin(point.heading),
      },
    }
  })
  if (direction === SmoothDirection.REVERSE) newTrajectory.reverse()
  return newTrajectory
}

export const computeTrajectory = (path: Path): Trajectory => {
  const interpolatedPath: InterpolatedPath = []
  path.waypoints.forEach((start, i) => {
    const end = path.waypoints[i + 1]
    if (!end) return

    const cp1 = getAfterHandle(start)
    const cp2 = getBeforeHandle(end)

    for (let t = 0; t <= 1; t += 1 / bezierDivisions) {
      const intermediatePoint = cubicBezier(t, start, end, cp1, cp2)
      interpolatedPath.push({
        ...intermediatePoint,
        heading: cubicBezierAngle(t, start, end, cp1, cp2),
        curvature: cubicBezierCurvature(t, start, end, cp1, cp2),
      })
    }
  })

  const clampVelocity = clamp(-maxVelocity, maxVelocity)

  const trajectory = interpolatedPath.map(point => {
    const netVelocity = clampVelocity(curvatureVelocity / point.curvature)
    const velocity: Vector2 = {
      x: netVelocity * Math.cos(point.heading),
      y: netVelocity * Math.sin(point.heading),
    }
    return { ...point, velocity }
  })

  const smoothed = smoothTrajectory(
    smoothTrajectory(trajectory, SmoothDirection.FORWARDS),
    SmoothDirection.REVERSE,
  )

  let prevTime = 0
  let prevPoint: TrajectoryPointWithoutTime | null = null

  const trajectoryWithTime = smoothed.map(point => {
    if (!prevPoint) {
      prevPoint = point
      return { ...point, time: 0 }
    }
    const distance = distanceBetween(point, prevPoint)
    const prevVelocity = Math.sqrt(
      prevPoint.velocity.x ** 2 + prevPoint.velocity.y ** 2,
    )
    const currVelocity = Math.sqrt(
      point.velocity.x ** 2 + point.velocity.y ** 2,
    )
    // Averaging the velocity of the previous and current path sections
    const velocity = (prevVelocity + currVelocity) / 2

    // d = vt
    const time = prevTime + distance / velocity
    prevPoint = point
    prevTime = time
    return { ...point, time }
  })
  return trajectoryWithTime
}
