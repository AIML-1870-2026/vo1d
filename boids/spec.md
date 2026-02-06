# 3D Boids Flocking Simulation — Spec

## Overview

An interactive browser-based 3D boids simulation that models realistic bird flocking behavior. Boids move through 3D space governed by three classic steering rules — **alignment**, **cohesion**, and **separation** — producing emergent flocking formations. Users can tune simulation parameters in real time via an on-screen control panel.

---

## Core Simulation Rules

Each boid evaluates neighbors within a configurable **neighbor radius** and computes three steering forces per frame:

| Rule | Behavior |
|---|---|
| **Alignment** | Steer toward the average heading of nearby boids. |
| **Cohesion** | Steer toward the average position (center of mass) of nearby boids. |
| **Separation** | Steer away from boids that are too close to avoid crowding. |

The final velocity of each boid is the weighted sum of these three vectors, normalized and scaled by the current **speed** setting.

---

## Visual Design

### Scene
- Dark background (deep navy or black) with subtle ambient lighting.
- A soft transparent bounding box or sphere to contain the flock and provide spatial reference.
- Optional: faint grid or particle fog for depth perception.

### Boids
- Each boid rendered as a small elongated cone or low-poly bird mesh, oriented along its velocity vector.
- Color can subtly shift based on local flock density or velocity magnitude (e.g., cool blues → warm oranges when clustered tightly).
- Faint motion trails (short fade-out lines behind each boid) to convey speed and direction.

### Camera
- Orbitable camera (click-drag to rotate, scroll to zoom).
- Default perspective positioned slightly above and to the side of the flock center.

---

## Controls Panel

A collapsible UI panel (top-right or side drawer) with the following controls:

### Simulation Parameters

| Control | Type | Default | Range |
|---|---|---|---|
| **Separation Weight** | Slider | 1.5 | 0.0 – 5.0 |
| **Alignment Weight** | Slider | 1.0 | 0.0 – 5.0 |
| **Cohesion Weight** | Slider | 1.0 | 0.0 – 5.0 |
| **Neighbor Radius** | Slider | 50 | 10 – 200 |
| **Speed** | Slider | 2.0 | 0.5 – 10.0 |

All sliders update the simulation in real time (no apply button needed).

### Actions

| Control | Type | Behavior |
|---|---|---|
| **Pause / Resume** | Toggle button | Freezes / resumes the simulation loop. Boids remain visible but stop moving when paused. |
| **Reset** | Button | Respawns all boids at random positions and velocities and resets all sliders to defaults. |

---

## Technical Details

### Stack
- **Three.js** for 3D rendering and camera controls (OrbitControls).
- Pure HTML/CSS/JS — single-file artifact (no build step).
- `requestAnimationFrame` loop for smooth 60fps updates.

### Boid Count
- Default: **150 boids**.
- Optional: expose a boid count slider (range 50–500) with reset required on change.

### Spatial Boundaries
- Boids are softly contained within a bounding region (e.g., a cube of side length 400 centered at origin).
- When a boid approaches the boundary, apply a gentle steering force back toward center (soft wall, not hard clamp).

### Performance Considerations
- Use instanced meshes (`THREE.InstancedMesh`) for efficient rendering of many identical boid geometries.
- Spatial hashing or simple distance checks for neighbor queries (simple brute-force is acceptable at ≤300 boids).

---

## Interaction Summary

1. Page loads → scene initializes with 150 boids in random positions flying in random directions.
2. Within seconds, flocking behavior emerges as alignment/cohesion/separation take effect.
3. User drags sliders to experiment — cranking separation creates dispersal, maxing cohesion forms tight swarms, etc.
4. User can orbit the camera to view the flock from any angle.
5. Pause freezes the scene for inspection; Reset starts fresh.

---

## Stretch Goals (Optional Enhancements)

- **Predator mode**: Click to spawn a predator that boids flee from.
- **Obstacle avoidance**: Place spheres in the scene that boids steer around.
- **Flock splitting**: Lower cohesion + raise separation to watch one flock fragment into sub-flocks.
- **Screenshot button**: Capture the current canvas as a PNG.
- **Stats overlay**: Show FPS, average flock velocity, and neighbor count.
