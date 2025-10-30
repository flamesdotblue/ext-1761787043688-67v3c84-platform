import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, DepthOfFieldEffect, BloomEffect, VignetteEffect, SMAAEffect, BrightnessContrastEffect } from "postprocessing";

export default function ParallaxScene({ imageURL, settings }) {
  const mountRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const targetAspect = 16 / 9;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0b0b, 8, 18);

    const camera = new THREE.PerspectiveCamera(50, 16/9, 0.1, 100);
    camera.position.set(0, 0, 8);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);

    const dof = new DepthOfFieldEffect(camera, {
      focusDistance: 0.015,
      focalLength: 0.028,
      bokehScale: 1.4,
    });
    const bloom = new BloomEffect({ intensity: 0.2, luminanceThreshold: 0.6, luminanceSmoothing: 0.2 });
    const vignette = new VignetteEffect({ darkness: 0.6, offset: 0.2 });
    const smaa = new SMAAEffect();
    const bc = new BrightnessContrastEffect({ brightness: settings.brightness - 1.0, contrast: 0.02 });

    composer.addPass(renderPass);
    composer.addPass(new EffectPass(camera, smaa));
    composer.addPass(new EffectPass(camera, dof, bloom, vignette, bc));

    // Lighting for subtle shading
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(-2, 3, 2);
    scene.add(dir);

    // Dust particles
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    const particleTex = makeCircleSprite();

    function updateParticles(density = 0.7) {
      // Clear
      while (particleGroup.children.length) particleGroup.remove(particleGroup.children[0]);
      const count = Math.floor(2000 * density);
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = (Math.random() * 2 - 1) * 9; // x
        positions[i * 3 + 1] = (Math.random() * 2 - 1) * 5; // y
        positions[i * 3 + 2] = Math.random() * 6 - 2; // z depth range
        sizes[i] = Math.random() * 12 + 6;
      }
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geom.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      const mat = new THREE.PointsMaterial({
        map: particleTex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        sizeAttenuation: true,
        color: new THREE.Color(0xffffff),
        size: 10,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geom, mat);
      particleGroup.add(points);
    }

    // Image planes
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    let planes = [];

    loader.load(
      imageURL,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const { fg, mid, bg } = makeMaskedTextures(tex.image);

        const depths = [-1.5, 0, 1.2];
        const masks = [fg, mid, bg];

        masks.forEach((mTex, i) => {
          const plane = makeImagePlane(mTex, 16, 9);
          plane.position.z = depths[i] * (settings.parallaxDepth * 0.8 + 0.2);
          plane.material.transparent = true;
          planes.push(plane);
          scene.add(plane);
        });
      },
      undefined,
      (err) => {
        // Fallback: solid gradient if image fails
        const gradientTex = makeGradientTexture(1600, 900);
        const plane = makeImagePlane(gradientTex, 16, 9);
        scene.add(plane);
        planes.push(plane);
      }
    );

    function resize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      // fit 16:9 area into container while preserving
      const containerAspect = w / h;
      let rw, rh;
      if (containerAspect > targetAspect) {
        rh = h;
        rw = h * targetAspect;
      } else {
        rw = w;
        rh = w / targetAspect;
      }
      renderer.setSize(rw, rh, false);
      renderer.domElement.style.width = rw + "px";
      renderer.domElement.style.height = rh + "px";
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.left = ((w - rw) / 2) + "px";
      renderer.domElement.style.top = ((h - rh) / 2) + "px";
      camera.aspect = 16/9;
      camera.updateProjectionMatrix();
      composer.setSize(rw, rh);
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    resize();

    updateParticles(settings.particleDensity);

    let raf;
    const start = performance.now();

    function animate() {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const t = (now - start) / 1000;
      const period = Math.max(8, Math.min(15, settings.duration));
      const loopT = (t % period) / period; // 0..1
      const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * 2 * x); // cosine loop

      // Camera gentle push and pan
      const push = settings.pushIn * 0.4;
      const pan = settings.pan * 0.4;
      camera.position.z = 8 - push * Math.sin(loopT * Math.PI * 2);
      camera.position.x = pan * Math.sin(loopT * Math.PI * 2);
      camera.position.y = 0.15 * pan * Math.cos(loopT * Math.PI * 2);
      camera.lookAt(0, 0, 0);

      // Parallax offset by moving planes subtly relative to camera motion
      planes.forEach((p, i) => {
        const depthFactor = (i - 1) * 0.6 * settings.parallaxDepth;
        p.position.x = depthFactor * camera.position.x * 0.8;
        p.position.y = depthFactor * camera.position.y * 0.8 + Math.sin(t * 0.2 + i) * 0.02 * settings.wind;
        p.rotation.z = Math.sin(t * 0.05 + i) * 0.002;
      });

      // Drift dust with simulated breeze
      particleGroup.children.forEach((points) => {
        const pos = points.geometry.getAttribute("position");
        const arr = pos.array;
        const breeze = settings.wind * 0.2;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] += Math.sin(t * 0.2 + arr[i+2]) * 0.002 * breeze; // x
          arr[i+1] += (Math.sin(t * 0.15 + arr[i] * 0.2) * 0.002 + 0.001) * (0.5 + Math.random()*0.5) * breeze; // y
          // loop bounds
          if (arr[i+1] > 5) arr[i+1] = -5;
        }
        pos.needsUpdate = true;
      });

      // Depth of field subtle shift
      dof.circleOfConfusionMaterial.bokehScale = 1.2 + settings.dofIntensity * 0.9;
      const focusAnim = 0.012 + 0.01 * settings.dofIntensity * Math.sin(loopT * Math.PI * 2);
      dof.uniforms.get("focusDistance").value = focusAnim;

      // Brightness update
      bc.uniforms.get("brightness").value = settings.brightness - 1.0;

      composer.render();
    }

    animate();

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      composer?.dispose?.();
      renderer?.dispose?.();
      mount.removeChild(renderer.domElement);
      planes.forEach((p) => p.geometry.dispose());
    };

    return () => cleanupRef.current?.();
  }, [imageURL, settings.parallaxDepth, settings.particleDensity, settings.pushIn, settings.pan, settings.dofIntensity, settings.duration, settings.wind, settings.brightness]);

  return (
    <div ref={mountRef} className="w-full h-[calc(100vh-64px)] relative overflow-hidden bg-neutral-950" />
  );
}

function makeImagePlane(texture, width, height) {
  const geom = new THREE.PlaneGeometry(width, height, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0, transparent: true });
  const mesh = new THREE.Mesh(geom, mat);
  return mesh;
}

function makeGradientTexture(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#1f2937");
  grd.addColorStop(1, "#111827");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMaskedTextures(image) {
  // Create three masks for foreground/mid/background from a single image
  const w = image.width; const h = image.height;
  const make = (maskDrawer) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0, w, h);
    const m = document.createElement("canvas"); m.width = w; m.height = h;
    const mc = m.getContext("2d");
    maskDrawer(mc, w, h);
    // apply mask
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(m, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const fg = make((mc, w, h) => {
    // bottom-focused radial mask for foreground
    const grad = mc.createRadialGradient(w*0.5, h*0.85, h*0.05, w*0.5, h*0.9, h*0.6);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    mc.fillStyle = grad; mc.fillRect(0,0,w,h);
  });

  const mid = make((mc, w, h) => {
    const grad = mc.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.15, "rgba(255,255,255,0)");
    grad.addColorStop(0.45, "rgba(255,255,255,1)");
    grad.addColorStop(0.75, "rgba(255,255,255,0)");
    mc.fillStyle = grad; mc.fillRect(0,0,w,h);
  });

  const bg = make((mc, w, h) => {
    // top-heavy mask for background
    const grad = mc.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.5, "rgba(255,255,255,0)");
    mc.fillStyle = grad; mc.fillRect(0,0,w,h);
  });

  return { fg, mid, bg };
}

function makeCircleSprite(size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(size/2, size/2, size/2, 0, Math.PI*2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
