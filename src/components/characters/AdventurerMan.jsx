import { useEffect, useRef, useMemo } from 'react'
import { useGraph, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { PerspectiveCamera } from '@react-three/drei'
import { useColliders } from '../../hooks/useColliders.jsx'

import { SkeletonUtils } from 'three-stdlib'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// export function AdventurerMan({ controlled, itemRefs, grabFn, colliders, bounds = 24.5, ...props }) {
// remove colliders from the props
export function AdventurerMan({ controlled, itemRefs, grabFn, selfRef, inputRef, bounds, carrying, setCarrying, ...props }) {

  const Idle = 'CharacterArmature|Idle'
  const Run = 'CharacterArmature|Run'
  const IdleHold = 'CharacterArmature|Idle_Sword'
  const RunHold = 'CharacterArmature|Run_Shoot'

  const { list } = useColliders()

  const group = useRef()
  const current = useRef(Idle)
  const camera = useRef()
  const yaw = useRef(0)
  const dragging = useRef(false)
  const pitch = useRef(0)
  const keys = useRef({})

  const wasMoving = useRef(false)
  const heading = useRef(0)
  const camDist = useRef(3)
  const vy = useRef(0)

  const { scene, animations } = useGLTF('/models/characters/AdventurerMan.glb')
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { nodes, materials } = useGraph(clone)
  const { actions, names } = useAnimations(animations, group)
  const { pointer } = useThree()

  const _lookTarget = new THREE.Vector3()
  const _axis = new THREE.Vector3()
  const _headPos = new THREE.Vector3()
  const _worldPos = new THREE.Vector3()

  const _ray = new THREE.Raycaster()
  const _rayDir = new THREE.Vector3()
  const _rayOrigin = new THREE.Vector3()

  const _camLocal = new THREE.Vector3()
  const _camWorld = new THREE.Vector3()
  const _pivotWorld = new THREE.Vector3()
  const _camDir = new THREE.Vector3()

  const _groundRay = new THREE.Raycaster()
  const _down = new THREE.Vector3(0, -1, 0)
  const _groundOrigin = new THREE.Vector3()
  const _side = new THREE.Vector3()

  const _q = new THREE.Quaternion()
  const _parentQ = new THREE.Quaternion()
  const _groupQ = new THREE.Quaternion()

  // console.log(Object.keys(nodes))

  // const speed = 10
  const speed = carrying ? 7 : 10
  const GRAB_RANGE = 2.5

  // console.log(animations.map(a => a.name))

  useEffect(() => {
    group.current?.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.frustumCulled = false
      }
    })
    actions[Idle]?.reset().fadeIn(0.2).play()
  } , [actions])

useEffect(() => { if (grabFn) grabFn.current = () => toggleGrab() }, [grabFn, nodes, carrying])


useEffect(() => { if (selfRef) selfRef.current = group.current }, [selfRef])

useEffect(() => { if (inputRef) inputRef.current = keys.current }, [inputRef])

const toggleGrab = () => {
  const hand = nodes.WristR
  if (!hand || !group.current) return

  // drop
  if (carrying) {
    const obj = itemRefs.current?.[carrying]
    if (!obj) return
    obj.getWorldPosition(_worldPos)
    group.current.parent.attach(obj)
    obj.position.copy(_worldPos)
    // obj.scale.setScalar(0.05)
    const cfg = obj.userData.item
    obj.scale.setScalar(cfg.scale)
    obj.rotation.set(0, 0, 0)
    obj.position.y = 0.05
    setCarrying(null)
    return
  }

  // pick up whatever is closest and in range
  const p = group.current.position
  let bestId = null
  let bestDist = GRAB_RANGE

  for (const key in itemRefs.current) {
    const o = itemRefs.current[key]
    if (!o) continue
    o.getWorldPosition(_worldPos)
    const d = Math.hypot(_worldPos.x - p.x, _worldPos.z - p.z)
    if (d < bestDist) { bestDist = d; bestId = Number(key) }
  }

  if (bestId === null) return

  const obj = itemRefs.current[bestId]
  const cfg = obj.userData.item
  hand.add(obj)
  obj.position.set(...cfg.hand.pos)
  obj.rotation.set(...cfg.hand.rot)
  obj.scale.setScalar(cfg.hand.scale)
  setCarrying(bestId)
}


  useEffect(() => {
    if (!controlled) return

    const down = (e) => {
      if (e.key === ' ') e.preventDefault()
      if (e.repeat) return
      keys.current[e.key.toLowerCase()] = true
      if (e.key === 'Enter') toggleGrab()
    }
    const up = (e) => { keys.current[e.key.toLowerCase()] = false }
    
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      for (const key in keys.current) keys.current[key] = false
      wasMoving.current = false
    }
  }, [controlled, carrying])


useEffect(() => {
  if (!controlled) return
  const last = { x: 0, y: 0 }

  const onDown = (e) => {
    if (e.target.closest?.('[data-ui]')) return   // don't look while using the joystick
    dragging.current = true
    last.x = e.clientX
    last.y = e.clientY
  }
  const onUp = () => { dragging.current = false }
  const onMove = (e) => {
    if (!dragging.current) return
    const mx = e.clientX - last.x
    const my = e.clientY - last.y
    last.x = e.clientX
    last.y = e.clientY
    yaw.current -= mx * 0.004
    pitch.current = THREE.MathUtils.clamp(pitch.current - my * 0.004, -1.0, 0.8)
  }

  window.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
  window.addEventListener('pointermove', onMove)
  return () => {
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    window.removeEventListener('pointermove', onMove)
  }
}, [controlled])

  // useEffect(() => {
  //   if (skin) materials.Skin.color.set(skin)
  //   if (shirt) materials.White.color.set(shirt)
  //   if (pants) materials.Orange.color.set(pants)
  //   if (shoes) materials.Grey.color.set(shoes)
  //   if (hair) {
  //     materials.Hair_Blond.color.set(hair)
  //     materials.Hair_Brown.color.set(hair)
  //   }
  // }, [skin, shirt, pants, hair, shoes, materials])

  useFrame((state, delta) => {
    if (!group.current) return

    const pos = group.current.position
    const k = keys.current

    let dx = 0, dz =  0  
    if (k['w']) dz += 1
    if (k['s']) dz -= 1
    if (k['a']) dx += 1
    if (k['d']) dx -= 1
    const moving = dx !== 0 || dz !== 0

    let motion
    if (carrying) motion = moving ? RunHold : IdleHold
    else motion = moving ? Run : Idle

    if (motion !== current.current) {
      actions[current.current]?.fadeOut(0.2)
      actions[motion]?.reset().fadeIn(0.2).play()
      current.current = motion
    }

const RADIUS = 0.3

// const HEIGHTS = [0.25, 0.9, 1.6]
// const HEIGHTS = [0.2, 0.5, 0.8, 1.1, 1.4, 1.7]
const HEIGHTS = [0.5, 0.8, 1.1, 1.4, 1.7]

const blocked = (x, y, z, dx, dz) => {
  const meshes = list.current
  if (!meshes || meshes.length === 0) return false

  const len = Math.hypot(dx, dz)
  if (len === 0) return false

  _rayDir.set(dx / len, 0, dz / len)
  _side.set(-_rayDir.z, 0, _rayDir.x)   // perpendicular, in the ground plane
  _ray.far = len + RADIUS

for (const h of HEIGHTS) {
  for (const off of [-RADIUS, 0, RADIUS]) {
    _rayOrigin.set(x + _side.x * off, y + h, z + _side.z * off)
    _ray.set(_rayOrigin, _rayDir)
    const hits = _ray.intersectObjects(meshes, false)
    if (hits.length > 0) {
      // console.log('blocked by:', hits[0].object.name, 'at height', h, 'offset', off)
      return true
    }
  }
}
  return false
}

  const PROBE_HEIGHT = 5
  const GROUND_FAR = 20

const groundAt = (x, y, z) => {
  const meshes = list.current
  if (!meshes || meshes.length === 0) return 0

  _groundOrigin.set(x, y + PROBE_HEIGHT, z)
  _groundRay.set(_groundOrigin, _down)
  _groundRay.far = GROUND_FAR

  const hits = _groundRay.intersectObjects(meshes, false)

  if (hits.length) console.log('ground:', hits[0].object.name, hits[0].point.y.toFixed(2))
  else console.log('ground: MISS, meshes:', meshes.length)

  return hits.length ? hits[0].point.y : 0
}

if (moving) {
      if (!wasMoving.current) {
        heading.current -= yaw.current
        yaw.current = 0
        pitch.current = 0
      }
      wasMoving.current = true

      group.current.rotation.y = heading.current

      const len = Math.hypot(dx, dz)
      dx /= len
      dz /= len

      const angle = heading.current + Math.atan2(dx, dz)
      const stepX = Math.sin(angle) * speed * delta
      const stepZ = Math.cos(angle) * speed * delta

      if (!blocked(pos.x, pos.y, pos.z, stepX, 0)) {
        // pos.x = THREE.MathUtils.clamp(pos.x + stepX, -39.5, 39.5)
        pos.x = THREE.MathUtils.clamp(pos.x + stepX, -bounds, bounds) 
        // pos.z = THREE.MathUtils.clamp(pos.z + stepZ, -bounds, bounds)
      }
      if (!blocked(pos.x, pos.y, pos.z, 0, stepZ)) {
        // pos.z = THREE.MathUtils.clamp(pos.z + stepZ, -39.5, 39.5)
        pos.z = THREE.MathUtils.clamp(pos.z + stepZ, -bounds, bounds)
      }

    } else {
      wasMoving.current = false
  }


const JUMP_SPEED = 6
const GRAVITY = 18

const floorY = groundAt(pos.x, pos.y, pos.z)
const grounded = pos.y <= floorY + 0.05

if (k[' '] && grounded) vy.current = JUMP_SPEED

if (!grounded || vy.current > 0) {
  vy.current -= GRAVITY * delta
  pos.y += vy.current * delta
  if (pos.y <= floorY) {
    pos.y = floorY
    vy.current = 0
  }
} else {
  pos.y = THREE.MathUtils.damp(pos.y, floorY, 15, delta)
  vy.current = 0
}
    

    const LIMIT = 1.2
    if (yaw.current > LIMIT) {
      const excess = yaw.current - LIMIT
      heading.current -= excess
      group.current.rotation.y -= excess
      yaw.current = LIMIT
    } else if (yaw.current < -LIMIT) {
      const excess = yaw.current + LIMIT
      heading.current -= excess
      group.current.rotation.y -= excess
      yaw.current = -LIMIT
    }

    const clamped = yaw.current
    const clampedPitch = pitch.current

    const applyTurn = (bone, yawAmt, pitchAmt) => {
      if (!bone) return
      if (!bone.userData.rest) bone.userData.rest = bone.quaternion.clone()

      bone.parent.getWorldQuaternion(_parentQ)
      _parentQ.invert()
      group.current.getWorldQuaternion(_groupQ)

      bone.quaternion.copy(bone.userData.rest)

      _axis.set(0, 1, 0).applyQuaternion(_parentQ)
      _q.setFromAxisAngle(_axis, yawAmt)
      bone.quaternion.premultiply(_q)

      _axis.set(1, 0, 0).applyQuaternion(_groupQ).applyQuaternion(_parentQ)
      _q.setFromAxisAngle(_axis, pitchAmt)
      bone.quaternion.premultiply(_q)
    }

    applyTurn(nodes.Neck, -clamped * 0.5, -clampedPitch * 0.5)
    applyTurn(nodes.Head, -clamped * 0.5, -clampedPitch * 0.7)


    // if (camera.current && nodes.Head) {
    //   nodes.Head.getWorldPosition(_headPos)
    //   group.current.worldToLocal(_headPos)

    //    camera.current.position.set(
    //     _headPos.x + Math.sin(-clamped) * 1,
    //     _headPos.y + 0.05,
    //     _headPos.z + Math.cos(-clamped) * 0.22
    //   )

    //   // const p = THREE.MathUtils.clamp(pitch.current, -0.6, 0.6)
    //   const p = THREE.MathUtils.clamp(pitch.current, -1.0, 0.8)
    //   _lookTarget.set(
    //     camera.current.position.x + Math.sin(-clamped) * Math.cos(p) * 5,
    //     camera.current.position.y + Math.sin(p) * 5,
    //     camera.current.position.z + Math.cos(-clamped) * Math.cos(p) * 5
    //   )
    //   group.current.localToWorld(_lookTarget)
    //   camera.current.lookAt(_lookTarget)
    // }     



const CAM_DIST = 3      // how far back the camera sits when nothing is in the way
const CAM_MARGIN = 0.25 // keep this much clearance from the surface it hit
const CAM_MIN = 0.8     // never get closer than this to the character

if (camera.current) {
  const theta = -clamped
  const p = THREE.MathUtils.clamp(clampedPitch, -1.0, 0.8)

  const pivotY = 1.4
  const lift = 0.6

  // where the camera would sit at full distance, in group-local space
  const horiz = Math.cos(p) * CAM_DIST
  _camLocal.set(
    -Math.sin(theta) * horiz,
    pivotY + lift - Math.sin(p) * CAM_DIST,
    -Math.cos(theta) * horiz
  )

  // the raycast has to happen in world space
  _pivotWorld.set(0, pivotY, 0)
  group.current.localToWorld(_pivotWorld)
  _camWorld.copy(_camLocal)
  group.current.localToWorld(_camWorld)

  _camDir.subVectors(_camWorld, _pivotWorld)
  const wanted = _camDir.length()
  _camDir.divideScalar(wanted)

  // anything between the character and the camera?
  let target = wanted
  const camMeshes = list.current
  if (camMeshes && camMeshes.length) {
    _ray.set(_pivotWorld, _camDir)
    _ray.far = wanted
    const hits = _ray.intersectObjects(list, false)
    // const hits = _ray.intersectObjects(meshes, false)
    if (hits.length) {
      target = Math.max(hits[0].distance - CAM_MARGIN, CAM_MIN)
    }
  }

  // snap inward immediately, ease back out
  camDist.current = target < camDist.current
    ? target
    : THREE.MathUtils.damp(camDist.current, target, 4, delta)

  _camWorld.copy(_pivotWorld).addScaledVector(_camDir, camDist.current)
  if (_camWorld.y < 0.3) _camWorld.y = 0.3   // world-space floor
  group.current.worldToLocal(_camWorld)
  camera.current.position.copy(_camWorld)

  _lookTarget.set(0, pivotY, 0)
  group.current.localToWorld(_lookTarget)
  camera.current.lookAt(_lookTarget)
}

    
  })

  return (
    <group ref={group} {...props} dispose={null}>
      <PerspectiveCamera ref={camera} makeDefault fov={75} near={0.05} />
      <group name="Root_Scene">
        <group name="RootNode">
          <group name="CharacterArmature" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <primitive object={nodes.Root} />
          </group>
          <group name="Adventurer_Feet" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh name="Adventurer_Feet_1" geometry={nodes.Adventurer_Feet_1.geometry} material={materials.Black} skeleton={nodes.Adventurer_Feet_1.skeleton} />
            <skinnedMesh name="Adventurer_Feet_2" geometry={nodes.Adventurer_Feet_2.geometry} material={materials.Grey} skeleton={nodes.Adventurer_Feet_2.skeleton} />
          </group>
          <group name="Adventurer_Legs" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh name="Adventurer_Legs_1" geometry={nodes.Adventurer_Legs_1.geometry} material={materials.Brown2} skeleton={nodes.Adventurer_Legs_1.skeleton} />
            <skinnedMesh name="Adventurer_Legs_2" geometry={nodes.Adventurer_Legs_2.geometry} material={materials.Brown} skeleton={nodes.Adventurer_Legs_2.skeleton} />
          </group>
          <group name="Adventurer_Body" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh name="Adventurer_Body_1" geometry={nodes.Adventurer_Body_1.geometry} material={materials.Green} skeleton={nodes.Adventurer_Body_1.skeleton} />
            <skinnedMesh name="Adventurer_Body_2" geometry={nodes.Adventurer_Body_2.geometry} material={materials.LightGreen} skeleton={nodes.Adventurer_Body_2.skeleton} />
            <skinnedMesh name="Adventurer_Body_3" geometry={nodes.Adventurer_Body_3.geometry} material={materials.Skin} skeleton={nodes.Adventurer_Body_3.skeleton} />
          </group>
          <group name="Adventurer_Head" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
            <skinnedMesh name="Adventurer_Head_1" geometry={nodes.Adventurer_Head_1.geometry} material={materials.Skin} skeleton={nodes.Adventurer_Head_1.skeleton} />
            <skinnedMesh name="Adventurer_Head_2" geometry={nodes.Adventurer_Head_2.geometry} material={materials.Eyebrows} skeleton={nodes.Adventurer_Head_2.skeleton} />
            <skinnedMesh name="Adventurer_Head_3" geometry={nodes.Adventurer_Head_3.geometry} material={materials.Eye} skeleton={nodes.Adventurer_Head_3.skeleton} />
            <skinnedMesh name="Adventurer_Head_4" geometry={nodes.Adventurer_Head_4.geometry} material={materials.Hair} skeleton={nodes.Adventurer_Head_4.skeleton} />
          </group>
          <group name="Backpack" position={[0, 1.373, -0.117]} rotation={[-Math.PI / 2, 0, Math.PI]} scale={26.077}>
            <skinnedMesh name="Backpack_1" geometry={nodes.Backpack_1.geometry} material={materials.Brown} skeleton={nodes.Backpack_1.skeleton} />
            <skinnedMesh name="Backpack_2" geometry={nodes.Backpack_2.geometry} material={materials.Green} skeleton={nodes.Backpack_2.skeleton} />
            <skinnedMesh name="Backpack_3" geometry={nodes.Backpack_3.geometry} material={materials.LightGreen} skeleton={nodes.Backpack_3.skeleton} />
            <skinnedMesh name="Backpack_4" geometry={nodes.Backpack_4.geometry} material={materials.Gold} skeleton={nodes.Backpack_4.skeleton} />
          </group>
        </group>
      </group>
    </group>
  )
}

useGLTF.preload('/models/characters/AdventurerMan.glb')
