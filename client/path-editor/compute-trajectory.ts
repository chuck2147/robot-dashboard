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
  lerp,
} from '../utils'
import {
  bezierDivisions,
  maxVelocity as globalMaxVelocity,
  maxAccel as originalMaxAccel,
  maxDecel as originalMaxDecel,
  curvatureVelocity,
  angularAccel,
  angularDecel,
} from '../../config'
import { motionProfile } from './motion-profile'

const enum SmoothDirection {
  FORWARDS,
  REVERSE,
}

/** in/s */
const maxAccel = originalMaxAccel * 12
/** in/s */
const maxDecel = originalMaxDecel * 12

type TrajectoryPointWithoutTime = Omit<
  TrajectoryPoint,
  'time' | 'angle' | 'angularVelocity'
>
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
        t,
        afterWaypoint: i,
      })
    }
  })

  const maxVelocity = (path.maxVelocity || globalMaxVelocity) * 12
  const clampVelocity = clamp(-maxVelocity, maxVelocity)

  let trajectory = interpolatedPath.map(point => {
    /* const netVelocity = maxVelocity */
    const netVelocity = clampVelocity(curvatureVelocity / point.curvature)
    const velocity: Vector2 = {
      x: netVelocity * Math.cos(point.heading),
      y: netVelocity * Math.sin(point.heading),
    }
    return { ...point, velocity }
  })

  trajectory = smoothTrajectory(trajectory, SmoothDirection.FORWARDS)
  trajectory = smoothTrajectory(trajectory, SmoothDirection.REVERSE)

  let prevTime = 0
  let prevPoint: TrajectoryPointWithoutTime | null = null

  const trajectoryWithTime = trajectory.map(point => {
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

  const anglePointsWithTime = path.angles
    .sort((a, b) => {
      if (a.afterWaypoint > b.afterWaypoint) return 1
      if (b.afterWaypoint > a.afterWaypoint) return -1
      return a.t - b.t
    })
    .map(anglePoint => {
      let beforePoint = trajectoryWithTime[0]
      let afterPoint = trajectoryWithTime[0]
      const t = anglePoint.t

      for (
        let i = bezierDivisions * anglePoint.afterWaypoint;
        i < bezierDivisions * (anglePoint.afterWaypoint + 1);
        i++
      ) {
        beforePoint = trajectoryWithTime[i]
        afterPoint = trajectoryWithTime[i + 1]

        if (
          beforePoint &&
          afterPoint &&
          beforePoint.t <= t &&
          t <= afterPoint.t
        ) {
          break
        }
      }
      const time =
        beforePoint && afterPoint
          ? lerp(
              beforePoint.t,
              afterPoint.t,
              beforePoint.time,
              afterPoint.time,
            )(t)
          : // If the point is not between two points, just use one of them
            // This happens when the point is on the start or end of the path
            (beforePoint || afterPoint).time
      return { ...anglePoint, time }
    })

  const trajectoryWithAngles = trajectoryWithTime.map(point => {
    // If it is before the first angle point, use the angle from the first angle point
    if (point.time <= anglePointsWithTime[0].time) {
      const angle = anglePointsWithTime[0].angle
      return { ...point, angle, angularVelocity: 0 }
    }
    const lastAnglePoint = anglePointsWithTime[anglePointsWithTime.length - 1]
    // If it is after the last angle point, use the angle from the last angle point
    if (point.time >= lastAnglePoint.time) {
      const angle = lastAnglePoint.angle
      return { ...point, angle, angularVelocity: 0 }
    }
    const anglePointBefore = anglePointsWithTime
      .slice()
      .reverse()
      .find(anglePoint => anglePoint.time < point.time)
    const anglePointAfter = anglePointsWithTime.find(
      anglePoint => anglePoint.time >= point.time,
    )
    if (!anglePointBefore || !anglePointAfter)
      throw new Error('could not find angle point before/after')

    const duration = anglePointAfter.time - anglePointBefore.time
    const startAngle = anglePointBefore.angle
    const endAngle = anglePointAfter.angle
    const distance = endAngle - startAngle

    const profileResult = motionProfile({
      time: point.time - anglePointBefore.time,
      distance,
      duration,
      accel: angularAccel,
      decel: angularDecel,
    })

    return {
      ...point,
      angle: profileResult.position + startAngle,
      angularVelocity: profileResult.velocity,
    }
  })

  return trajectoryWithAngles
}
