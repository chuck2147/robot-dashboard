export interface Point {
  /** x position in inches. 0 is the bottom left of the field */
  x: number
  /** y position in inches. 0 is the bottom right of the field */
  y: number
}

export interface Waypoint extends Point {
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

export interface InterpolatedPoint extends Point {
  /**
   * The direction the robot is moving, in radians, with 0 being right.
   * This is *not* the way the robot is facing,
   * because the robot's movement is separate from the robot's angle
   */
  heading: number
  curvature: number
}

export type TrajectoryPoint = InterpolatedPoint & {
  velocity: Vector2
}
export type Trajectory = TrajectoryPoint[]

export type InterpolatedPath = InterpolatedPoint[]

export interface AngleLocation {
  afterWaypoint: number
  segmentLengthPercent: number
  angle: number
}

export interface Path {
  waypoints: Waypoint[]
  angles: AngleLocation[]
}

export interface Vector2 {
  y: number
  x: number
}
