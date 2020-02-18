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
  t: number
  afterWaypoint: number
}

export interface LiveTrajectoryPoint extends Point {
  angle: number
}

export interface TrajectoryPoint extends InterpolatedPoint {
  velocity: Vector2
  time: number
  angle: number
  angularVelocity: number
}
export type Trajectory = TrajectoryPoint[]

export type InterpolatedPath = InterpolatedPoint[]

export interface AnglePoint {
  afterWaypoint: number
  /** `t` value of point along it's segment */
  t: number
  angle: number
}

export interface Path {
  waypoints: Waypoint[]
  angles: AnglePoint[]
}

export interface Vector2 {
  y: number
  x: number
}

export enum DisplayMode {
  Waypoints,
  AnglePoints,
}

type RequestIdleCallbackHandle = any
type RequestIdleCallbackOptions = {
  timeout: number
}
type RequestIdleCallbackDeadline = {
  readonly didTimeout: boolean
  timeRemaining: () => number
}
type RequestIdleCallback = (
  callback: (deadline: RequestIdleCallbackDeadline) => void,
  opts?: RequestIdleCallbackOptions,
) => RequestIdleCallbackHandle
type CancelIdleCallback = (handle: RequestIdleCallbackHandle) => void

declare global {
  const requestIdleCallback: RequestIdleCallback
  const cancelIdleCallback: CancelIdleCallback
  interface Window {
    requestIdleCallback: RequestIdleCallback
    cancelIdleCallback: CancelIdleCallback
  }
}
