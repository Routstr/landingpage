declare module 'three' {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
    clone(): Vector3;
    copy(v: Vector3): this;
    sub(v: Vector3): this;
    add(v: Vector3): this;
    normalize(): this;
    lengthSq(): number;
    length(): number;
    multiplyScalar(s: number): this;
    setScalar(s: number): this;
    distanceTo(v: Vector3): number;
  }

  export class Euler {
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Color {
    r: number;
    g: number;
    b: number;
    constructor(color?: number | string);
    set(color: number | string): this;
    setHex(hex: number): this;
  }

  export class Object3D {
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    userData: Record<string, unknown>;
    renderOrder: number;
    visible: boolean;
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
  }

  export class Group extends Object3D {}

  export class Material {
    dispose(): void;
    transparent: boolean;
    opacity: number;
    color: Color;
  }

  export class MeshStandardMaterial extends Material {
    constructor(params?: Record<string, unknown>);
    emissive: Color;
    roughness: number;
    metalness: number;
    flatShading: boolean;
  }

  export class MeshBasicMaterial extends Material {
    constructor(params?: Record<string, unknown>);
  }

  export class LineBasicMaterial extends Material {
    constructor(params?: Record<string, unknown>);
  }

  export class BufferAttribute {
    constructor(array: Float32Array, itemSize: number);
    needsUpdate: boolean;
    array: Float32Array;
  }

  export class BufferGeometry {
    attributes: Record<string, BufferAttribute>;
    setAttribute(name: string, attribute: BufferAttribute): this;
    setDrawRange(start: number, count: number): void;
    dispose(): void;
  }

  export class IcosahedronGeometry extends BufferGeometry {
    constructor(radius?: number, detail?: number);
  }

  export class EdgesGeometry extends BufferGeometry {
    constructor(geometry?: BufferGeometry, thresholdAngle?: number);
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class CircleGeometry extends BufferGeometry {
    constructor(radius?: number, segments?: number);
  }

  export class RingGeometry extends BufferGeometry {
    constructor(innerRadius?: number, outerRadius?: number, thetaSegments?: number);
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number);
  }

  export const BackSide: number;

  export class TorusGeometry extends BufferGeometry {
    constructor(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number);
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
    geometry: BufferGeometry;
    material: Material;
  }

  export class SpriteMaterial {
    constructor(params?: Record<string, unknown>);
    opacity: number;
    color: Color;
    map: CanvasTexture | null;
    transparent: boolean;
    depthWrite: boolean;
    blending: number;
    dispose(): void;
  }

  export class Sprite extends Object3D {
    constructor(material?: SpriteMaterial);
    material: SpriteMaterial;
    center: { x: number; y: number };
    scale: Vector3;
  }

  export const NormalBlending: number;
  export const AdditiveBlending: number;

  export class CanvasTexture {
    constructor(canvas: HTMLCanvasElement);
    needsUpdate: boolean;
    dispose(): void;
  }

  export class LineSegments extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
    geometry: BufferGeometry;
    material: Material;
  }

  export class Light extends Object3D {
    constructor(color?: number | string, intensity?: number);
  }

  export class AmbientLight extends Light {}
  export class DirectionalLight extends Light {}

  export class Scene extends Object3D {}

  export class PerspectiveCamera extends Object3D {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export class WebGLRenderer {
    constructor(params?: Record<string, unknown>);
    domElement: HTMLCanvasElement;
    setSize(width: number, height: number): void;
    setPixelRatio(ratio: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
  }
}
