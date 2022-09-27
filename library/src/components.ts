import * as THREE from "three";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";
import {
  CameraComponent,
  RaycasterComponent,
  RendererComponent,
  SceneComponent,
  ToolComponents,
} from "./core";

/**
 * The entry point of Open BIM Components.
 * It contains the basic items to create a BIM 3D scene based on Three.js, as
 * well as all the tools provided by this library. It also manages the update
 * loop of everything. Each instance has to be initialized with {@link init}.
 */
export class Components {
  /**
   * All the tools being used. This makes the management of tools very easy
   * (e.g. turning them on/off, sharing data between them, updating them, etc).
   */
  readonly tools: ToolComponents;

  /**
   * All the loaded [meshes](https://threejs.org/docs/#api/en/objects/Mesh).
   * This includes IFC models, fragments, 3D scans, etc.
   */
  readonly meshes: THREE.Mesh[] = [];

  private clock: THREE.Clock;
  private updateRequestCallback: number = -1;

  private _renderer?: RendererComponent;
  private _scene?: SceneComponent;
  private _camera?: CameraComponent;
  private _raycaster?: RaycasterComponent;

  /**
   * The [Three.js renderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer)
   * used to render the scene. This library provides multiple renderer
   * components with pre-made functionality (e.g. rendering of 2D CSS elements.
   */
  get renderer() {
    if (!this._renderer) {
      throw new Error("Renderer hasn't been initialised.");
    }
    return this._renderer;
  }

  /**
   * This needs to be initialize before calling {@link init}.
   *
   * @example
   *
   * ```ts
   * import * as OBC from 'openbim-components';
   *
   * components.renderer = new OBC.SimpleRenderer(components, container);
   * ```
   */
  set renderer(renderer: RendererComponent) {
    this._renderer = renderer;
  }

  /**
   * The [Three.js scene](https://threejs.org/docs/#api/en/scenes/Scene)
   * where all the rendered items are placed.
   */
  get scene() {
    if (!this._scene) {
      throw new Error("Scene hasn't been initialised.");
    }
    return this._scene;
  }

  /**
   * This needs to be initialize before calling {@link init}.
   *
   * @example
   *
   * ```ts
   * import * as OBC from 'openbim-components';
   *
   * components.scene = new OBC.SimpleScene(components);
   * ```
   */
  set scene(scene: SceneComponent) {
    this._scene = scene;
  }

  /**
   * The [Three.js camera](https://threejs.org/docs/#api/en/cameras/Camera)
   * that determines the point of view of the renderer.
   * ```
   */
  get camera() {
    if (!this._camera) {
      throw new Error("Camera hasn't been initialised.");
    }
    return this._camera;
  }

  /**
   * This needs to be initialize before calling {@link init}.
   *
   * @example
   *
   * ```ts
   * import * as OBC from 'openbim-components';
   *
   * components.scene = new OBC.SimpleCamera(components);
   * ```
   */
  set camera(camera: CameraComponent) {
    this._camera = camera;
  }

  /**
   * The [Three.js raycaster](https://threejs.org/docs/#api/en/core/Raycaster)
   * used primarily to pick 3D items with the mouse or a touch screen.
   */
  get raycaster() {
    if (!this._raycaster) {
      throw new Error("Raycaster hasn't been initialised.");
    }
    return this._raycaster;
  }

  /**
   * Although this is not necessary to make the library work, it's necessary
   * to initialize this if any component that needs a raycaster is used.
   *
   * ```ts
   * import * as OBC from 'openbim-components';
   *
   * components.raycaster = new COMPONENTS.SimpleRaycaster(components);
   * ```
   */
  set raycaster(raycaster: RaycasterComponent) {
    this._raycaster = raycaster;
  }

  /**
   * The array of [Three.js clipping planes](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.clippingPlanes)
   * that are being currently used to clip the 3D view. **This shouldn't be
   * edited directly**: instead, there are pre-build components to handle
   * clipping planes easily.
   */
  get clippingPlanes() {
    return this.renderer.get().clippingPlanes;
  }

  constructor() {
    this.clock = new THREE.Clock();
    this.tools = new ToolComponents();
    Components.setupBVH();
  }

  private static setupBVH() {
    THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    THREE.Mesh.prototype.raycast = acceleratedRaycast;
  }

  /**
   * Initializes the library. It should be called at the start of the app after
   * initializing the {@link scene}, the {@link renderer} and the
   * {@link camera}. Additionally, if any component that need a raycaster is
   * used, the {@link raycaster} will need to be initialized.
   *
   * @example
   *
   * ```ts
   * import * as OBC from 'openbim-components';
   *
   * const components = new OBC.Components();
   * const container = document.getElementById('container');
   * components.scene = new OBC.SimpleScene(components);
   * components.renderer = new OBC.SimpleRenderer(components, container);
   * components.camera = new OBC.SimpleCamera(components);
   *
   * components.init();
   * ```
   */
  init() {
    this.clock.start();
    this.update();
  }

  /**
   * Disposes the memory of all the components and tools of this instance of
   * the library. A memory leak will be created if:
   *
   * - An instance of the library ends up out of scope and this function isn't
   * called. This is especially relevant in Single Page Applications (React,
   * Angular, Vue, etc).
   *
   * - Any of the objects of this instance (meshes, geometries, etc) is
   * referenced by a reference type (object or array). <br>
   *
   * You can learn more about how Three.js handles memory leaks
   * [here](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects).
   *
   * @example
   *
   * ```ts
   * const components = new Components();
   *
   * // External array used to store a reference to the BIM models that we load
   * const storedModels = [];
   *
   * // The app executes and the user does many things. At some point:
   * storedModels.push(bimModel);
   *
   * // Now we want to get rid of this instance of the library:
   * // If this array is not emptied, we will create a memory leak:
   * storedModels = [];
   *
   * components.dispose();
   * ```
   */
  dispose() {
    cancelAnimationFrame(this.updateRequestCallback);
    // TODO: Implement memory disposal for the whole library
  }

  private update = () => {
    const delta = this.clock.getDelta();
    this.scene.update(delta);
    this.renderer.update(delta);
    this.camera.update(delta);
    this.tools.update(delta);
    this.updateRequestCallback = requestAnimationFrame(this.update);
  };
}