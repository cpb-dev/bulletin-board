"use client";

/** A chunky, glossy push-pin. */
export function Pin({
  color,
  position,
}: {
  color: string;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* needle base */}
      <mesh position={[0, 0, 0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.03, 8]} />
        <meshStandardMaterial color="#b9b9c4" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* head */}
      <mesh position={[0, 0, 0.035]} castShadow>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.25} />
      </mesh>
    </group>
  );
}
