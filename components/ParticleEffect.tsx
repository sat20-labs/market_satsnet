// import { useEffect, useRef } from 'react';
// import * as THREE from 'three';

// export default function ParticleEffect() {
//   const mountRef = useRef<HTMLDivElement | null>(null);

//   useEffect(() => {
//     const mount = mountRef.current;
//     if (!mount) return;

//     // Scene setup
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(
//       75,
//       mount.clientWidth / mount.clientHeight,
//       0.1,
//       1000,
//     );
//     const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
//     renderer.setSize(mount.clientWidth, mount.clientHeight);
//     mount.appendChild(renderer.domElement);

//     // Particle setup
//     const particleCount = 2000;
//     const particles = new THREE.BufferGeometry();
//     const particleMaterial = new THREE.PointsMaterial({
//       color: 0x0047fa,
//       size: 0.005,
//     });

//     const positions = new Float32Array(particleCount * 3);
//     for (let i = 0; i < particleCount; i++) {
//       const phi = Math.acos(2 * Math.random() - 1);
//       const theta = 2 * Math.PI * Math.random();
//       const radius = Math.pow(Math.random(), 1 / 3); // Cubic root for uniform density

//       positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
//       positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
//       positions[i * 3 + 2] = radius * Math.cos(phi);
//     }

//     particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
//     const particleSystem = new THREE.Points(particles, particleMaterial);
//     scene.add(particleSystem);

//     camera.position.z = 2;

//     // Animation loop
//     const animate = () => {
//       requestAnimationFrame(animate);
//       particleSystem.rotation.y += 0.001;
//       particleSystem.rotation.z += 0.001;
//       renderer.render(scene, camera);
//     };

//     animate();

//     // Handle window resize
//     const handleResize = () => {
//       if (!mount) return;
//       camera.aspect = mount.clientWidth / mount.clientHeight;
//       camera.updateProjectionMatrix();
//       renderer.setSize(mount.clientWidth, mount.clientHeight);
//     };
//     window.addEventListener('resize', handleResize);

//     return () => {
//       mount.removeChild(renderer.domElement);
//       window.removeEventListener('resize', handleResize);
//     };
//   }, []);

//   return (
//     <div
//       ref={mountRef}
//       className="w-full h-full absolute pt-0 pl-0 z-20 pointer-events-none"
//     />
//   );
// }
