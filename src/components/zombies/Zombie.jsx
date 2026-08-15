import { useEffect, useRef, useMemo } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import { useColliders } from "../../hooks/useColliders.jsx";

const IDLE = "Armature|Idle";
const WALK = "Armature|Walk";
const ATTACK = "Armature|Attack";
const WANDER_RADIUS = 6;

const _toTarget = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _origin = new THREE.Vector3();

const _groundRay = new THREE.Raycaster();
const _down = new THREE.Vector3(0, -1, 0);
const _groundOrigin = new THREE.Vector3();

const ZOMBIE_TYPES = {
  z1: {
    url: "/models/zombies/Zombie.glb",
    clips: {
      idle: "Armature|Idle",
      walk: "Armature|Walk",
      attack: "Armature|Attack",
    },
    scale: 0.5,
  },
  z2: {
    url: "/models/zombies/Zombie2.glb",
    clips: {
      idle: "CharacterArmature|Idle",
      walk: "CharacterArmature|Walk",
      attack: "CharacterArmature|Punch",
    },
    scale: 1.5,
  },
  z3: {
    url: "/models/zombies/Zombie3.glb",
    clips: {
      idle: "CharacterArmature|Idle",
      walk: "CharacterArmature|Walk",
      attack: "CharacterArmature|Punch",
    },
    scale: 1.5,
  },
};

export function Zombie({
  playerRef,
  home = [0, 0, 0],
  onCatch,
  speed = 3.5,
  type = "z1",
  aggroRadius = 12,
  leash = 30,
  attackRange = 1.4,
}) {
  const wanderTarget = useRef(new THREE.Vector3());
  const wanderTimer = useRef(0);
  const attackTimer = useRef(0);

  const stuckTimer = useRef(0);
  const sideSign = useRef(1);
  const lastPos = useRef(new THREE.Vector3());
  const progressTimer = useRef(0);

  const group = useRef();
  // const state = useRef(IDLE)
  const { list } = useColliders();

  const cfg = ZOMBIE_TYPES[type];
  const { scene, animations } = useGLTF(cfg.url);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions } = useAnimations(animations, clone);
  const state = useRef(cfg.clips.idle);

  // console.log(animations.map(a => a.name))

  const WANDER_RADIUS = 18;

  // wandering

  useEffect(() => {
    group.current?.position.set(...home);
    clone.scale.setScalar(cfg.scale);
    actions[cfg.clips.idle]?.reset().fadeIn(0.2).play();
    group.current?.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
  }, [actions]);

  const play = (name) => {
    if (name === state.current) return;
    actions[state.current]?.fadeOut(0.2);
    actions[name]?.reset().fadeIn(0.2).play();
    state.current = name;
  };

  // attack branch
  // blocked view
  // chase
  // reached wander target

  useFrame((_, delta) => {
    const me = group.current;
    const player = playerRef.current;
    if (!me || !player) return;

    me.position.y = groundAtZ(me.position, list, delta)
    _toTarget.subVectors(player.position, me.position);
    _toTarget.y = 0;
    const dist = _toTarget.length();

    // if (Math.random() < 0.01) console.log('dist', me.position.distanceTo(player.position))

    const fromHome = Math.hypot(
      me.position.x - home[0],
      me.position.z - home[2],
    );

    attackTimer.current -= delta;
    stuckTimer.current -= delta;

    if (dist < attackRange) {
      _dir.copy(_toTarget).divideScalar(dist);
      _origin.set(me.position.x, me.position.y + 1, me.position.z);
      _ray.set(_origin, _dir);
      _ray.far = dist;

      const blockedView =
        _ray.intersectObjects(list.current ?? [], false).length > 0;

      if (!blockedView) {
        play(cfg.clips.attack);
        if (attackTimer.current <= 0) {
          attackTimer.current = 1.5;
          onCatch?.(me.position.x, me.position.z);
        }
        return; // only return when it actually attacks
      }
      // wall in the way — no return, fall through to the chase branch below
    }

    _toTarget.subVectors(player.position, me.position);
    _toTarget.y = 0;

    // chase if the player is close, but give up past the leash
    if (dist < aggroRadius && fromHome < leash) {
      play(cfg.clips.walk);
      _toTarget.divideScalar(dist); // normalise

      me.rotation.y = Math.atan2(_toTarget.x, _toTarget.z);

      const stepX = _toTarget.x * speed * delta;
      const stepZ = _toTarget.z * speed * delta;

      const movedX = !blockedAt(me.position, stepX, 0, list);
      const movedZ = !blockedAt(me.position, 0, stepZ, list);
      if (movedX) me.position.x += stepX;
      if (movedZ) me.position.z += stepZ;

      progressTimer.current -= delta;
      if (progressTimer.current <= 0) {
        const moved = me.position.distanceTo(lastPos.current);
        lastPos.current.copy(me.position);
        progressTimer.current = 0.6;

        // should have covered ~speed*0.6 units; anything under a third means jammed
        if (moved < speed * 0.2 && stuckTimer.current <= 0) {
          stuckTimer.current = 3;
          const px = -_toTarget.z,
            pz = _toTarget.x;
          const leftClear = !blockedAt(me.position, px * 0.5, pz * 0.5, list);
          sideSign.current = leftClear ? 1 : -1;
        }
      }

      if (stuckTimer.current > 0) {
        const sx = -_toTarget.z * sideSign.current * speed * delta;
        const sz = _toTarget.x * sideSign.current * speed * delta;
        if (!blockedAt(me.position, sx, 0, list)) me.position.x += sx;
        if (!blockedAt(me.position, 0, sz, list)) me.position.z += sz;
      }
    } else {
      wanderTimer.current -= delta;

      if (wanderTimer.current <= 0) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * WANDER_RADIUS;
        wanderTarget.current.set(
          home[0] + Math.sin(a) * r,
          0,
          home[2] + Math.cos(a) * r,
        );
        wanderTimer.current = 3 + Math.random() * 4; // pick a new spot every 3–7s
      }

      _toTarget.subVectors(wanderTarget.current, me.position);
      _toTarget.y = 0;
      const d = _toTarget.length();

      if (d < 0.4) {
        play(cfg.clips.idle);
      } else {
        play(cfg.clips.walk);
        _toTarget.divideScalar(d);
        me.rotation.y = Math.atan2(_toTarget.x, _toTarget.z);

        const wanderSpeed = speed * 0.4; // shamble when not chasing
        const sx = _toTarget.x * wanderSpeed * delta;
        const sz = _toTarget.z * wanderSpeed * delta;

        if (!blockedAt(me.position, sx, 0, list)) me.position.x += sx;
        if (!blockedAt(me.position, 0, sz, list)) me.position.z += sz;
      }
    }
  });

  return <primitive ref={group} object={clone} />;
}

const Z_RADIUS = 0.6;

function blockedAt(pos, dx, dz, list) {
  const meshes = list.current;
  if (!meshes?.length) return false;
  const len = Math.hypot(dx, dz);
  if (len === 0) return false;

  _dir.set(dx / len, 0, dz / len);
  _ray.far = len + Z_RADIUS; // was len + 0.5

  for (const h of [0.7, 1.2]) {
    // 2 heights
    _origin.set(pos.x, pos.y + h, pos.z);
    _ray.set(_origin, _dir);
    if (_ray.intersectObjects(meshes, false).length > 0) return true;
  }
  return false;
}

const STEP_UP = 0.6
const FALL = 12

function groundAtZ(pos, list, delta) {
  const meshes = list.current
  if (!meshes?.length) return Math.max(0, pos.y - FALL * delta)

  _groundOrigin.set(pos.x, pos.y + STEP_UP, pos.z)
  _groundRay.set(_groundOrigin, _down)
  _groundRay.far = STEP_UP + 0.5

  const hits = _groundRay.intersectObjects(meshes, false)
  return hits.length ? hits[0].point.y : Math.max(0, pos.y - FALL * delta)
}

export function Model(props) {
  const group = React.useRef();
  const { scene, animations } = useGLTF("/models/zombies/Zombie.glb");
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="RootNode">
          <group name="Armature">
            <primitive object={nodes.mixamorigHips} />
          </group>
          <skinnedMesh
            name="Character"
            geometry={nodes.Character.geometry}
            material={materials.ColorSwatch}
            skeleton={nodes.Character.skeleton}
          />
        </group>
      </group>
    </group>
  );
}

// useGLTF.preload('/models/zombies/Zombie.glb')
Object.values(ZOMBIE_TYPES).forEach((t) => useGLTF.preload(t.url));
