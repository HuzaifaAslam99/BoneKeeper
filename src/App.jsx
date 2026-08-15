import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";

import { CollidersProvider } from "./hooks/useColliders.jsx";
import { AdventurerMan } from "./components/characters/AdventurerMan";
import { Zombie } from "./components/zombies/Zombie.jsx";

import { House } from "./components/world/House.jsx";
import { Item } from "./components/items/Item.jsx";
import { useFrame } from "@react-three/fiber";
import { TouchControls } from "./ui/TouchControls.jsx";


const DEPOT = [0, 0, -20];

const isTouch =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

function DepositZone({ playerRef, carrying, onDeposit }) {
  const busy = useRef(false);

  useFrame(() => {
    if (!carrying) {
      busy.current = false;
      return;
    }
    if (busy.current || !playerRef.current) return;

    const p = playerRef.current.position;
    if (Math.hypot(p.x - DEPOT[0], p.z - DEPOT[2]) < 3) {
      busy.current = true;
      onDeposit();
    }
  });
  return null;
}

export default function App() {
  const START_ITEMS = [
    // graveyard — [0, 0.3, 10]
    { id: 1, type: "bone", position: [6, 0.5, 6] },
    { id: 2, type: "skeletalHand", position: [-6, 0.5, 15] },

    // parking lot — [-60, 0, -15]
    { id: 3, type: "fishBone", position: [-54, 0.5, -11] },
    { id: 4, type: "bullHorn", position: [-66, 0.5, -19] },

    // train station — [-45, 0, 40]
    { id: 5, type: "lantern", position: [-45, 0.5, 35] },
    { id: 6, type: "handAxe", position: [-45, 0.5, 40] },
  ];

  const World = 170;

  const boneRef = useRef();
  const grabFn = useRef(null);
  const inputRef = useRef(null);
  const playerRef = useRef();

  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(null);

  const [carrying, setCarrying] = useState(null);
  const [deposited, setDeposited] = useState(0);
  const [items, setItems] = useState(START_ITEMS);

  const DEPOT = [0, 0, -20];

  const itemRefs = useRef({});

  const TOTAL_RELICS = 6;

  const handleDeposit = () => {
    itemRefs.current[carrying]?.removeFromParent();
    delete itemRefs.current[carrying];
    setItems((arr) => arr.filter((it) => it.id !== carrying));
    setCarrying(null);
    setDeposited((n) => {
      const next = n + 1;
      if (next >= TOTAL_RELICS) setEnded("won");
      return next;
    });
  };

  const MAX_HP = 3;
  const KNOCKBACK = 4;

  const [hp, setHp] = useState(MAX_HP);

  const handleCatch = (zx, zz) => {
    const p = playerRef.current;
    if (!p) return;

    if (carrying) {
      const obj = itemRefs.current[carrying];
      if (obj) {
        obj.removeFromParent();
        p.parent.add(obj);
        obj.position.set(p.position.x, 0.05, p.position.z);
        obj.rotation.set(0, 0, 0);
        obj.scale.setScalar(obj.userData.item?.scale ?? 0.05);
      }
      setCarrying(null);
    }

    // knockback happens after — so the item stays where you were hit

    const dx = p.position.x - zx;
    const dz = p.position.z - zz;
    const len = Math.hypot(dx, dz) || 1;
    p.position.x += (dx / len) * KNOCKBACK;
    p.position.z += (dz / len) * KNOCKBACK;

    setHp((n) => {
      const next = n - 1;
      if (next <= 0) {
        setEnded("lost");
        return 0;
      }
      return next;
    });
  };

  const restart = () => {
    const held = itemRefs.current[carrying];
    held?.removeFromParent();
    setEnded(null);
    setHp(MAX_HP);
    setDeposited(0);
    setCarrying(null);
    setItems(START_ITEMS);
    itemRefs.current = {};
    playerRef.current?.position.set(0, 0, -6);
  };

  return (
    <div className="relative w-screen h-screen">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 5, 6] }}
      >
        <color attach="background" args={["#1a2030"]} />
        <fog attach="fog" args={["#1a2030", 25, 90]} />

        <CollidersProvider>
          <Environment preset="city" />
          <directionalLight
            position={[0, 140, 0]}
            intensity={5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-World / 2}
            shadow-camera-right={World / 2}
            shadow-camera-top={World / 2}
            shadow-camera-bottom={-World / 2}
            shadow-camera-far={World + 1}
          />


          <AdventurerMan
            controlled={started && !ended}
            selfRef={playerRef}
            inputRef={inputRef}
            itemRefs={itemRefs}
            grabFn={grabFn}
            position={[0, 0, -6]}
            bounds={World / 2 - 0.5}
            carrying={carrying}
            setCarrying={setCarrying}
          />

          {/* graveyard — z ≈ 10, the farthest and most dangerous */}
          <Zombie
            type="z1"
            playerRef={playerRef}
            home={[6, 0, 8]}
            onCatch={handleCatch}
          />
          <Zombie
            type="z2"
            playerRef={playerRef}
            home={[-8, 0, 16]}
            onCatch={handleCatch}
          />

          {/* parking lot — x ≈ -60, z ≈ -15, open ground */}
          <Zombie
            type="z3"
            playerRef={playerRef}
            home={[-54, 0, -10]}
            onCatch={handleCatch}
          />
          <Zombie
            type="z1"
            playerRef={playerRef}
            home={[-66, 0, -20]}
            onCatch={handleCatch}
          />

          {/* train station — x ≈ -45, z ≈ 40 */}
          <Zombie
            type="z2"
            playerRef={playerRef}
            home={[-40, 0, 35]}
            onCatch={handleCatch}
          />
          <Zombie
            type="z3"
            playerRef={playerRef}
            home={[-50, 0, 46]}
            onCatch={handleCatch}
          />

          <House
            url="/models/places/Graveyard.glb"
            position={[0, 0.3, 10]}
            scale={1}
          />
          <House
            url="/models/places/Castle.glb"
            position={[0, 0, -30]}
            scale={20}
          />
          <House
            url="/models/places/ParkingLot.glb"
            position={[-60, 0, -15]}
            scale={10}
          />
          <House
            url="/models/places/Japanese_Train_Station.glb"
            ground
            position={[-45, 0, 40]}
            scale={5}
          />

          {items.map((it) => (
            <Item
              key={it.id}
              data={it}
              carrying={carrying}
              objRef={(o) => {
                if (o) itemRefs.current[it.id] = o;
              }}
            />
          ))}

          <DepositZone
            playerRef={playerRef}
            carrying={carrying}
            onDeposit={handleDeposit}
          />

          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[World, World]} />
            <meshStandardMaterial color="#2a2a30" />
          </mesh>

          {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-60, 1.2, 50]} receiveShadow>
          <planeGeometry args={[World, World]} />
          <meshStandardMaterial color="#2a2a30" />
        </mesh> */}

          <mesh position={[DEPOT[0], 0.5, DEPOT[2]]} receiveShadow>
            <cylinderGeometry args={[3, 3, 0.1, 24]} />
            <meshStandardMaterial color="#4a3a2a" />
          </mesh>
        </CollidersProvider>
      </Canvas>

      {started && !ended && (
        <div className="absolute top-4 left-4 text-white font-mono text-lg pointer-events-none">
          <div className="flex gap-1 mb-2">
            {Array.from({ length: MAX_HP }).map((_, i) => (
              <div
                key={i}
                className={`w-5 h-5 border-2 border-white ${i < hp ? "bg-red-600" : "bg-transparent"}`}
              />
            ))}
          </div>
          <div>
            Relics delivered: {deposited} / {TOTAL_RELICS}
          </div>
          {carrying && <div>Press Enter to drop</div>}
        </div>
      )}

      {isTouch && started && !ended && (
        <TouchControls inputRef={inputRef} grabFn={grabFn} />
      )}

      {!started && (
        <div
          className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center
                      text-white font-mono gap-6"
        >
          <h1 className="text-5xl tracking-widest">BONEKEEPER</h1>
          <p className="text-sm opacity-70 max-w-md text-center">
            The dead are scattered. Gather what remains and return it to the
            pyre before they reach you.
          </p>

          <div className="text-sm grid grid-cols-2 gap-x-8 gap-y-2 mt-4">
            {isTouch ? (
              <>
                <span className="opacity-60">Move</span>
                <span>Left stick</span>
                <span className="opacity-60">Look</span>
                <span>Drag right side</span>
                <span className="opacity-60">Pick up / drop</span>
                <span>Grab button</span>
                <span className="opacity-60">Jump</span>
                <span>Jump button</span>
              </>
            ) : (
              <>
                <span className="opacity-60">Move</span>
                <span>W A S D</span>
                <span className="opacity-60">Look</span>
                <span>Drag mouse</span>
                <span className="opacity-60">Pick up / drop</span>
                <span>Enter</span>
                <span className="opacity-60">Jump</span>
                <span>Space</span>
              </>
            )}
          </div>

          <button
            onClick={() => setStarted(true)}
            className="mt-6 px-8 py-3 border border-white/40 hover:bg-white/10 tracking-wider"
          >
            BEGIN
          </button>
        </div>
      )}

      {ended && (
        <div
          className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center
                  text-white font-mono gap-6"
        >
          <h1 className="text-4xl tracking-widest">
            {ended === "won" ? "THE DEAD REST" : "YOU FELL"}
          </h1>
          <p className="text-sm opacity-70">
            {ended === "won"
              ? `All ${TOTAL_RELICS} relics returned.`
              : `${deposited} of ${TOTAL_RELICS} returned.`}
          </p>
          <button
            onClick={restart}
            className="mt-4 px-8 py-3 border border-white/40 hover:bg-white/10 tracking-wider"
          >
            AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
