import * as THREE from 'three';

export type CoordinateSystemType = 'cartesian' | 'polar' | 'cylindrical' | 'spherical' | 'none';
export type CoordinateSystemSelection = 'auto' | CoordinateSystemType;

export interface CoordinateDetectionResult {
  recommended: CoordinateSystemType;
  reasonKey: string;
  confidence: number;
}

export class CoordinateSystemManager {
  /**
   * Automatically detect the best coordinate system based on bounding box dimensions.
   * Analyzes aspect ratios and rotational symmetry along X, Y, and Z axes.
   */
  public static detectSystem(box: THREE.Box3): CoordinateDetectionResult {
    if (box.isEmpty()) {
      return {
        recommended: 'cartesian',
        reasonKey: 'coord.reason_default_cartesian',
        confidence: 0.8,
      };
    }

    const size = new THREE.Vector3();
    box.getSize(size);
    const { x: dx, y: dy, z: dz } = size;

    if (dx <= 0 || dy <= 0 || dz <= 0) {
      return {
        recommended: 'cartesian',
        reasonKey: 'coord.reason_default_cartesian',
        confidence: 0.8,
      };
    }

    // Check spherical symmetry: dx, dy, dz are nearly identical (within 12%)
    const maxDim = Math.max(dx, dy, dz);
    const minDim = Math.min(dx, dy, dz);
    const sphereRatio = minDim / maxDim;

    if (sphereRatio > 0.88) {
      return {
        recommended: 'spherical',
        reasonKey: 'coord.reason_spherical_symmetric',
        confidence: 0.92,
      };
    }

    // Check circular / cylindrical symmetry along Y axis (dx ≈ dz)
    const xzRatio = Math.min(dx, dz) / Math.max(dx, dz);
    if (xzRatio > 0.85) {
      // If Y is very thin compared to X & Z -> Disk / Polar
      if (dy / Math.max(dx, dz) < 0.25) {
        return {
          recommended: 'polar',
          reasonKey: 'coord.reason_polar_planar',
          confidence: 0.88,
        };
      }
      // Otherwise Y is elongated or moderate -> Cylindrical column / pipe / shaft
      return {
        recommended: 'cylindrical',
        reasonKey: 'coord.reason_cylindrical_rotational',
        confidence: 0.9,
      };
    }

    // Check circular / cylindrical symmetry along Z axis (dx ≈ dy)
    const xyRatio = Math.min(dx, dy) / Math.max(dx, dy);
    if (xyRatio > 0.85) {
      if (dz / Math.max(dx, dy) < 0.25) {
        return {
          recommended: 'polar',
          reasonKey: 'coord.reason_polar_planar',
          confidence: 0.85,
        };
      }
      return {
        recommended: 'cylindrical',
        reasonKey: 'coord.reason_cylindrical_rotational',
        confidence: 0.88,
      };
    }

    // Default to Cartesian for general mechanical / asymmetric / aerodynamic assemblies
    return {
      recommended: 'cartesian',
      reasonKey: 'coord.reason_cartesian_general',
      confidence: 0.85,
    };
  }

  /**
   * Build the 3D visual object representing the chosen coordinate system.
   */
  public static buildCoordinateVisuals(
    type: CoordinateSystemType,
    box: THREE.Box3
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `coord_system_${type}`;

    if (type === 'none') {
      return group;
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    if (!box.isEmpty()) {
      box.getSize(size);
      box.getCenter(center);
    } else {
      size.set(50, 50, 50);
      center.set(0, 0, 0);
    }

    const maxDim = Math.max(size.x, size.y, size.z, 20);
    const radius = Math.max(Math.hypot(size.x, size.z) * 0.65, maxDim * 0.6, 25);
    const effectiveBaseY = box.isEmpty() ? -25 : box.min.y;

    switch (type) {
      case 'cartesian':
        this.addCartesianVisuals(group, center, effectiveBaseY, maxDim);
        break;
      case 'polar':
        this.addPolarVisuals(group, center, effectiveBaseY, radius);
        break;
      case 'cylindrical':
        this.addCylindricalVisuals(group, center, box, radius);
        break;
      case 'spherical':
        this.addSphericalVisuals(group, center, Math.max(maxDim * 0.7, radius));
        break;
    }

    return group;
  }

  /**
   * 1. 笛卡爾直角座標系 (Cartesian XYZ):
   * Rectangular ground grid with distinct colored primary axes and XYZ directional arrows.
   */
  private static addCartesianVisuals(
    group: THREE.Group,
    center: THREE.Vector3,
    baseY: number,
    extent: number
  ) {
    const gridSize = Math.ceil(extent * 2.4 / 10) * 10;
    const divisions = Math.max(10, Math.min(40, Math.round(gridSize / 5)));

    // Base Grid
    const grid = new THREE.GridHelper(gridSize, divisions, 0x6366f1, 0x1e293b);
    grid.position.set(center.x, baseY, center.z);
    group.add(grid);

    // Primary XYZ Axes
    const axesLength = gridSize * 0.45;
    const axesHelper = new THREE.AxesHelper(axesLength);
    axesHelper.position.set(center.x, baseY + 0.05, center.z);
    group.add(axesHelper);

    // Axis Arrows
    const origin = new THREE.Vector3(center.x, baseY + 0.05, center.z);
    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), origin, axesLength, 0xef4444, axesLength * 0.12, axesLength * 0.06);
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), origin, axesLength, 0x22c55e, axesLength * 0.12, axesLength * 0.06);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), origin, axesLength, 0x3b82f6, axesLength * 0.12, axesLength * 0.06);

    group.add(arrowX);
    group.add(arrowY);
    group.add(arrowZ);
  }

  /**
   * 2. 極座標系 (Polar Coordinate System):
   * Concentric radial rings on the base plane with 12 angular spokes (every 30°),
   * labeled visually with primary radii markers.
   */
  private static addPolarVisuals(
    group: THREE.Group,
    center: THREE.Vector3,
    baseY: number,
    radius: number
  ) {
    const rings = 5;
    const segments = 64;
    const ringStep = radius / rings;

    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
    });
    const mainRingMaterial = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.8,
    });

    // Concentric rings
    for (let r = 1; r <= rings; r++) {
      const curR = r * ringStep;
      const points: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          center.x + Math.cos(theta) * curR,
          baseY,
          center.z + Math.sin(theta) * curR
        ));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geom, r === rings ? mainRingMaterial : ringMaterial);
      group.add(line);
    }

    // 12 Radial Spokes (every 30°)
    const spokeMat = new THREE.LineBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.35,
    });
    const spokePoints: THREE.Vector3[] = [];
    for (let deg = 0; deg < 360; deg += 30) {
      const rad = THREE.MathUtils.degToRad(deg);
      spokePoints.push(
        new THREE.Vector3(center.x, baseY, center.z),
        new THREE.Vector3(center.x + Math.cos(rad) * radius, baseY, center.z + Math.sin(rad) * radius)
      );
    }
    const spokeGeom = new THREE.BufferGeometry().setFromPoints(spokePoints);
    const spokeLines = new THREE.LineSegments(spokeGeom, spokeMat);
    group.add(spokeLines);

    // Center marker
    const originArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(center.x, baseY, center.z),
      radius * 0.35,
      0x22c55e,
      radius * 0.08,
      radius * 0.04
    );
    group.add(originArrow);
  }

  /**
   * 3. 圓柱座標系 (Cylindrical Coordinate System):
   * Multilevel horizontal concentric rings (r, θ) stacked along height (z),
   * connected by vertical meridian pillars forming a cylindrical cage.
   */
  private static addCylindricalVisuals(
    group: THREE.Group,
    center: THREE.Vector3,
    box: THREE.Box3,
    radius: number
  ) {
    const minY = box.isEmpty() ? -25 : box.min.y;
    const maxY = box.isEmpty() ? 25 : box.max.y;
    const height = Math.max(maxY - minY, 10);
    const levels = 4;
    const segments = 64;

    const ringMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
    });
    const mainRingMat = new THREE.LineBasicMaterial({
      color: 0x059669,
      transparent: true,
      opacity: 0.75,
    });

    // Horizontal rings at each height level
    for (let i = 0; i <= levels; i++) {
      const y = minY + (i / levels) * height;
      const points: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          center.x + Math.cos(theta) * radius,
          y,
          center.z + Math.sin(theta) * radius
        ));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const isBoundary = i === 0 || i === levels;
      const line = new THREE.Line(geom, isBoundary ? mainRingMat : ringMat);
      group.add(line);
    }

    // 8 Vertical cage pillars along circumference
    const pillarPoints: THREE.Vector3[] = [];
    const pillarMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.3,
    });
    for (let deg = 0; deg < 360; deg += 45) {
      const rad = THREE.MathUtils.degToRad(deg);
      const px = center.x + Math.cos(rad) * radius;
      const pz = center.z + Math.sin(rad) * radius;
      pillarPoints.push(
        new THREE.Vector3(px, minY, pz),
        new THREE.Vector3(px, maxY, pz)
      );
    }
    const pillarGeom = new THREE.BufferGeometry().setFromPoints(pillarPoints);
    const pillarLines = new THREE.LineSegments(pillarGeom, pillarMat);
    group.add(pillarLines);

    // Central cylindrical axis (Z / Height axis)
    const axisPoints = [
      new THREE.Vector3(center.x, minY - height * 0.1, center.z),
      new THREE.Vector3(center.x, maxY + height * 0.15, center.z),
    ];
    const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
    const axisLine = new THREE.Line(axisGeom, new THREE.LineBasicMaterial({ color: 0x10b981 }));
    group.add(axisLine);

    // Radial spokes on base plane
    const baseSpokes: THREE.Vector3[] = [];
    for (let deg = 0; deg < 360; deg += 45) {
      const rad = THREE.MathUtils.degToRad(deg);
      baseSpokes.push(
        new THREE.Vector3(center.x, minY, center.z),
        new THREE.Vector3(center.x + Math.cos(rad) * radius, minY, center.z + Math.sin(rad) * radius)
      );
    }
    const baseSpokeGeom = new THREE.BufferGeometry().setFromPoints(baseSpokes);
    group.add(new THREE.LineSegments(baseSpokeGeom, pillarMat));
  }

  /**
   * 4. 球座標系 (Spherical Coordinate System):
   * Spherical grid containing latitude parallels, longitude meridian arcs, and 3-axis sphere cage (r, θ, φ).
   */
  private static addSphericalVisuals(
    group: THREE.Group,
    center: THREE.Vector3,
    radius: number
  ) {
    const latLines = 6;
    const segments = 64;

    const sphereMat = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.4,
    });
    const equatorMat = new THREE.LineBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.75,
    });

    // Latitude circles (Parallel rings)
    for (let i = 1; i < latLines; i++) {
      const phi = (i / latLines) * Math.PI; // 0 to PI
      const ringRadius = radius * Math.sin(phi);
      const ringY = center.y + radius * Math.cos(phi);

      const points: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const theta = (s / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(
          center.x + Math.cos(theta) * ringRadius,
          ringY,
          center.z + Math.sin(theta) * ringRadius
        ));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const isEquator = i === latLines / 2;
      group.add(new THREE.Line(geom, isEquator ? equatorMat : sphereMat));
    }

    // 8 Longitude meridian rings
    for (let deg = 0; deg < 180; deg += 45) {
      const rad = THREE.MathUtils.degToRad(deg);
      const points: THREE.Vector3[] = [];
      for (let s = 0; s <= segments; s++) {
        const angle = (s / segments) * Math.PI * 2;
        const y = center.y + Math.cos(angle) * radius;
        const dist = Math.sin(angle) * radius;
        const x = center.x + Math.cos(rad) * dist;
        const z = center.z + Math.sin(rad) * dist;
        points.push(new THREE.Vector3(x, y, z));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geom, sphereMat));
    }

    // Three orthogonal axis lines through center
    const axesMat = new THREE.LineBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.6,
    });
    const axesPoints = [
      new THREE.Vector3(center.x - radius * 1.15, center.y, center.z),
      new THREE.Vector3(center.x + radius * 1.15, center.y, center.z),
      new THREE.Vector3(center.x, center.y - radius * 1.15, center.z),
      new THREE.Vector3(center.x, center.y + radius * 1.15, center.z),
      new THREE.Vector3(center.x, center.y, center.z - radius * 1.15),
      new THREE.Vector3(center.x, center.y, center.z + radius * 1.15),
    ];
    const axesGeom = new THREE.BufferGeometry().setFromPoints(axesPoints);
    group.add(new THREE.LineSegments(axesGeom, axesMat));
  }
}
