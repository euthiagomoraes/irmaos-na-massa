import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Bolo 3D procedural (sem modelos externos, ~0 KB de assets):
 * suporte dourado, massa creme, calda de chocolate escorrendo e rosas no topo.
 * Inclina suavemente seguindo o ponteiro e gira devagar.
 */
const cores = {
  creme: '#FBE3C4',
  chocolate: '#7B2C05',
  suporte: '#EEA261',
  rosa: '#E2745C',
  rosaClara: '#F4A58E',
  folha: '#7F7A40',
  florBranca: '#FFF3E2',
}

function Rosa({ posicao, escala = 1, cor = cores.rosa }: { posicao: [number, number, number]; escala?: number; cor?: string }) {
  const petalas = useMemo(() => Array.from({ length: 7 }, (_, i) => i), [])
  return (
    <group position={posicao} scale={escala}>
      {petalas.map((i) => {
        const ang = (i / petalas.length) * Math.PI * 2
        const r = i < 3 ? 0.07 : 0.13
        return (
          <mesh key={i} position={[Math.cos(ang) * r, 0.04 + (i < 3 ? 0.05 : 0), Math.sin(ang) * r]} rotation={[0.5 * Math.sin(ang), ang, 0.5 * Math.cos(ang)]} castShadow>
            <sphereGeometry args={[0.12, 16, 12, 0, Math.PI]} />
            <meshStandardMaterial color={cor} roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={cor} roughness={0.5} />
      </mesh>
    </group>
  )
}

function Folha({ posicao, rot }: { posicao: [number, number, number]; rot: number }) {
  return (
    <mesh position={posicao} rotation={[-0.6, rot, 0]} scale={[0.09, 0.02, 0.22]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color={cores.folha} roughness={0.7} />
    </mesh>
  )
}

function Bolo() {
  const grupo = useRef<THREE.Group>(null)
  const raio = 1.1
  const altura = 0.95

  const pingos = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const ang = (i / 22) * Math.PI * 2 + (i % 3) * 0.05
        const comp = 0.18 + ((i * 37) % 11) / 30
        return { ang, comp }
      }),
    [],
  )

  useFrame(({ pointer, clock }, delta) => {
    const g = grupo.current
    if (!g) return
    g.rotation.y += delta * 0.18
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -pointer.y * 0.18 + 0.05, 0.06)
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, pointer.x * 0.08, 0.06)
    g.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.04 - 0.35
  })

  return (
    <group ref={grupo}>
      {/* Suporte */}
      <mesh position={[0, -0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.42, 1.38, 0.1, 64]} />
        <meshStandardMaterial color={cores.suporte} roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.8, 32]} />
        <meshStandardMaterial color={cores.suporte} roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh position={[0, -0.96, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.08, 48]} />
        <meshStandardMaterial color={cores.suporte} roughness={0.35} metalness={0.25} />
      </mesh>

      {/* Massa */}
      <mesh position={[0, altura / 2 - 0.07, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[raio, raio, altura, 64]} />
        <meshStandardMaterial color={cores.creme} roughness={0.8} />
      </mesh>

      {/* Calda de chocolate */}
      <mesh position={[0, altura - 0.04, 0]}>
        <cylinderGeometry args={[raio + 0.03, raio + 0.03, 0.1, 64]} />
        <meshStandardMaterial color={cores.chocolate} roughness={0.25} metalness={0.05} />
      </mesh>
      {pingos.map(({ ang, comp }, i) => (
        <mesh key={i} position={[Math.cos(ang) * (raio + 0.02), altura - 0.08 - comp / 2, Math.sin(ang) * (raio + 0.02)]}>
          <capsuleGeometry args={[0.065, comp, 6, 12]} />
          <meshStandardMaterial color={cores.chocolate} roughness={0.25} />
        </mesh>
      ))}

      {/* Rosas e flores */}
      <Rosa posicao={[-0.25, altura + 0.06, 0.05]} escala={1.25} />
      <Rosa posicao={[0.3, altura + 0.04, -0.12]} escala={1.05} cor={cores.rosaClara} />
      <Rosa posicao={[0.05, altura + 0.03, 0.42]} escala={0.85} />
      <Folha posicao={[-0.62, altura + 0.04, 0.12]} rot={0.9} />
      <Folha posicao={[0.62, altura + 0.04, -0.05]} rot={-1.2} />
      <Folha posicao={[0.25, altura + 0.04, 0.62]} rot={2.6} />
      {[[-0.5, 0.35], [0.55, 0.3], [-0.1, -0.5], [0.4, 0.55], [-0.55, -0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, altura + 0.05, z]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color={cores.florBranca} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

export default function Bolo3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.35, 4.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        frameloop="always"
      >
        <ambientLight intensity={0.85} color="#FFF4E8" />
        <directionalLight position={[3, 5, 4]} intensity={1.4} color="#FFE9D2" />
        <directionalLight position={[-4, 2, -2]} intensity={0.5} color="#F4A58E" />
        <Bolo />
      </Canvas>
    </div>
  )
}
