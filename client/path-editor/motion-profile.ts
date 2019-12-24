/** Generates a motion profile to travel the given distance in the given time */

export const motionProfile = ({
  time,
  accel,
  decel,
  distance,
  duration,
}: {
  accel: number
  decel: number
  time: number
  distance: number
  duration: number
}) => {
  // quadratic formula a,b,c
  const a = -(1 / accel) - 1 / decel
  const b = 2 * duration
  const c = -2 * distance
  const cruiseVelocity = (-b + Math.sqrt(b ** 2 - 4 * a * c)) / (2 * a)

  const accelTime = cruiseVelocity / accel
  const decelTime = cruiseVelocity / decel
  const cruiseTime = duration - accelTime - decelTime

  if (isNaN(cruiseVelocity)) {
    return { position: NaN, velocity: NaN }
  }

  const beginCruise = accelTime
  const beginDecel = accelTime + cruiseTime

  if (time < beginCruise) {
    return {
      position: 0.5 * accel * time ** 2,
      velocity: accel * time,
    }
  }

  const accelDistance = cruiseVelocity ** 2 / (2 * accel)

  if (time < beginDecel) {
    return {
      position: accelDistance + cruiseVelocity * (time - beginCruise),
      velocity: cruiseVelocity,
    }
  }

  const cruiseDistance = cruiseTime * cruiseVelocity
  const decelDistance = cruiseVelocity ** 2 / (2 * decel)

  const timeAlongDecel = time - accelTime - cruiseTime
  const decelTriangleBase = decelTime - timeAlongDecel

  return {
    position:
      accelDistance +
      cruiseDistance +
      (decelDistance - (decelTriangleBase ** 2 * decel) / 2),
    velocity: cruiseVelocity - decel * timeAlongDecel,
  }
}
