// Entrada do pacote do Three.js usado no site (só o que a cena do Blocão usa).
// Gerar: npm run vendor  →  assets/vendor/three-imperio.min.js (ES module, já minificado)
export {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, InstancedMesh, BoxGeometry, PlaneGeometry, IcosahedronGeometry,
  MeshStandardMaterial, MeshBasicMaterial, ShadowMaterial, CanvasTexture, Color, Vector3, Object3D, Matrix4,
  DirectionalLight, HemisphereLight, AmbientLight, PMREMGenerator, RepeatWrapping, SRGBColorSpace, NoColorSpace,
  ACESFilmicToneMapping, PCFSoftShadowMap, LinearMipmapLinearFilter, MathUtils, Clock, Raycaster, Vector2, Plane,
} from "three";
export { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
