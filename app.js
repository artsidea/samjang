// HTML 요소 가져오기
const video = document.getElementById("camera");
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

// Three.js 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 배경 추가 (검은색)
const backgroundGeometry = new THREE.PlaneGeometry(20, 20);
const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
backgroundMesh.position.z = -1; // 배경을 카메라 뒤로 배치
scene.add(backgroundMesh);

// 파티클 초기화
const particleCount = 150000; // 파티클 수
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3); // 파티클 위치
const colors = new Float32Array(particleCount * 3); // 파티클 색상 저장
const velocities = new Float32Array(particleCount * 3); // 파티클 속도

// 초기 파티클 위치 설정 (랜덤 배치)
for (let i = 0; i < particleCount; i++) {
  const x = (Math.random() - 0.5) * 20;
  const y = (Math.random() - 0.5) * 20;
  const z = (Math.random() - 0.5) * 2;
  positions[i * 3] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = z;

  velocities[i * 3] = 0;
  velocities[i * 3 + 1] = 0;
  velocities[i * 3 + 2] = 0;

  // 초기 색상은 랜덤
  colors[i * 3] = Math.random();
  colors[i * 3 + 1] = Math.random();
  colors[i * 3 + 2] = Math.random();
}
particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));

// 파티클 재질
const particleMaterial = new THREE.PointsMaterial({
  size: 0.03,
  vertexColors: true,
  sizeAttenuation: true,
  transparent: true,
});
const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

camera.position.z = 15; // 카메라 위치

// 캔버스 크기
canvas.width = 128;
canvas.height = 128;

// 카메라 연결
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  video.srcObject = stream;
  video.play();
});

// 애니메이션 루프
function animate() {
  requestAnimationFrame(animate);

  // 캔버스에 현재 프레임 그리기
  ctx.save();
  ctx.scale(-1, 1); // 좌우 반전
  ctx.translate(-canvas.width, 0);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 현재 프레임의 픽셀 데이터 가져오기
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  // 파티클 업데이트
  const positionsAttr = particles.attributes.position.array;
  const colorsAttr = particles.attributes.color.array;

  for (let i = 0; i < particleCount; i++) {
    const x = Math.floor((positions[i * 3] / 20 + 0.5) * canvas.width);
    const y = Math.floor((-positions[i * 3 + 1] / 20 + 0.5) * canvas.height);
    const index = (y * canvas.width + x) * 4;

    if (index >= 0 && index < pixels.length) {
      // 영상의 픽셀 색상으로 파티클 색상 설정
      const r = pixels[index] / 255;
      const g = pixels[index + 1] / 255;
      const b = pixels[index + 2] / 255;

      colorsAttr[i * 3] += (r - colorsAttr[i * 3]) * 0.1; // 보간
      colorsAttr[i * 3 + 1] += (g - colorsAttr[i * 3 + 1]) * 0.1;
      colorsAttr[i * 3 + 2] += (b - colorsAttr[i * 3 + 2]) * 0.1;

      // Z 위치를 밝기에 따라 조정
      const brightness = (r + g + b) / 3;
      const targetZ = brightness * 5 - 2.5; // 밝기에 따라 입체적으로 표현
      velocities[i * 3 + 2] += (targetZ - positionsAttr[i * 3 + 2]) * 0.05;
    }

    // 속도 감쇠 적용
    velocities[i * 3 + 2] *= 0.9;

    // 속도를 현재 위치에 반영
    positionsAttr[i * 3 + 2] += velocities[i * 3 + 2];
  }

  particles.attributes.position.needsUpdate = true;
  particles.attributes.color.needsUpdate = true;

  // Three.js 렌더링
  renderer.render(scene, camera);
}
animate();