import type { ObjectsPlacementConfig } from './types'

const objects2Placement: ObjectsPlacementConfig = {
  byIndex: [],

  byName: {
    placeholder: { x: -30, z: -2, visible: false },

    grape_1: { x: -12, z: 9, visible: false },
    grape_3: { x: -12, z: 9, visible: false },
    grape_2: { x: -12, z: 9, visible: false },

    fence: { x: 11.5, z: 8, visible: true },

    chicken_1: { x: 10, z: -5, visible: true },
    cow_1: { x: 14, z: 10, visible: true },
    sheep_1: { x: -8, z: -2, visible: true },

    corn_1: { x: -8, z: 6, visible: true },
    corn_2: { x: -8, z: 6, visible: false },
    corn_3: { x: -8, z: 6, visible: false },

    strawberry_1: { x: -8, z: 9, visible: false },
    strawberry_2: { x: -8, z: 9, visible: false },
    strawberry_3: { x: -8, z: 9, visible: false },

    tomato_1: { x: -12, z: 6, visible: false },
    tomato_2: { x: -12, z: 6, visible: false },
    tomato_3: { x: -12, z: 6, visible: false },

    ground: { x: 0, z: 0, visible: false },
  },

  extraFence: {
    x: -10,
    z: -2,
    visible: true,
    rotationY: Math.PI,
  },

  coin: {
    x: 0,
    z: 0,
    visible: true,
    rotationX: Math.PI,
    rotationY: Math.PI,
    rotationZ: Math.PI,
    spinSpeed: 1.5,
  },
}

export default objects2Placement
