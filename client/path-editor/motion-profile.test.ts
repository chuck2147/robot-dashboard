import { motionProfile } from './motion-profile'

test('motion profile', () => {
  const baseConfig = { accel: 1, decel: 1, distance: 4, duration: 6 }

  expect(motionProfile({ ...baseConfig, time: 0 })).toEqual({
    position: 0,
    velocity: 0,
  })
  expect(motionProfile({ ...baseConfig, time: 6 })).toEqual({
    position: 3.999999999999999,
    velocity: 0,
  })
})
