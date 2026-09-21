import { Application, Container, Graphics, Sprite, ParticleContainer, Particle } from "pixi.js";
import type { Texture, BLEND_MODES } from "pixi.js";
import { createAttackTimeline } from "./attack-timeline";
import type { AttackKind, AttackStage } from "./attack-timeline";
import { attackShapes } from "./attack-shapes";
import { createAttackTextures } from "./attack-textures";

export type AttackGeometry = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
};
export type AttackRequest = {
  kind: AttackKind;
  stage: AttackStage;
  geometry: AttackGeometry;
  duration: number;
  powerful: boolean;
  blocked: boolean;
};
type Motion = ReturnType<typeof createAttackTimeline>["motion"];
const C = (x: number) => Math.max(0, Math.min(1, x));
const L = (a: number, b: number, p: number) => a + (b - a) * p;
const E = (p: number) => 1 - Math.pow(1 - C(p), 3);
const colors: Record<AttackKind, string> = {
  blade: "#dce4e0",
  arrow: "#dbc59b",
  spell: "#ff9f43",
  wolf: "#eadcc1",
  raider: "#e3b289",
  soldier: "#d6e4e6",
  shade: "#9bd7be",
  sentinel: "#ceb58e",
  stag: "#d2bf9e",
  crow: "#bfc2e1",
  wraith: "#b7eafa",
  roots: "#acb97b",
  marshal: "#e1b197",
  hollow: "#c1b1ee",
};
function sprite(tex: Texture, parent: Container, w: number, h: number) {
  const s = new Sprite(tex);
  s.anchor.set(0.5);
  s.width = w;
  s.height = h;
  parent.addChild(s);
  return s;
}
function particleLayer(parent: Container, tex: Texture, count: number, blend: BLEND_MODES = "add") {
  const pc = new ParticleContainer({
    dynamicProperties: {
      position: true,
      rotation: true,
      vertex: true,
      color: true,
    },
    texture: tex,
  });
  pc.blendMode = blend;
  parent.addChild(pc);
  const ps = Array.from({ length: count }, () => {
    const p = new Particle({
      texture: tex,
      anchorX: 0.5,
      anchorY: 0.5,
      alpha: 0,
    });
    pc.addParticle(p);
    return p;
  });
  return { pc, ps };
}
async function createModel(id: AttackKind, textures: ReturnType<typeof createAttackTextures>) {
  const color = colors[id],
    root = new Container(),
    choreography = new Container(),
    body = new Container();
  root.addChild(choreography);
  choreography.addChild(body);
  root.visible = false;
  const parts: { s: Sprite; cls: string }[] = [];
  if (id === "blade") parts.push({ s: sprite(textures.swordTex, body, 94, 166), cls: "weapon" });
  else if (id === "arrow")
    parts.push({ s: sprite(textures.arrowTex, body, 218, 41), cls: "arrow" });
  else if (id !== "spell")
    for (const path of attackShapes[id])
      parts.push({
        s: sprite(await textures.svgTexture(path.d, color, id), body, 150, 150),
        cls: path.cls,
      });
  const glow = sprite(textures.soft, body, 125, 125);
  glow.tint = color;
  glow.blendMode = "add";
  body.setChildIndex(glow, 0);
  const trail = new Graphics()
    .moveTo(-85, 51)
    .quadraticCurveTo(-2, -25, 87, -54)
    .quadraticCurveTo(22, 7, -85, 51)
    .fill({ color, alpha: 0.35 })
    .moveTo(-85, 51)
    .quadraticCurveTo(-2, -25, 87, -54)
    .stroke({ color: 0xfff8e4, width: 2 });
  body.addChild(trail);
  const ring = new Graphics().circle(0, 0, 44).stroke({ color, width: 1.4 });
  body.addChild(ring);
  const shield = new Graphics()
    .moveTo(0, -48)
    .lineTo(35, -30)
    .lineTo(30, 18)
    .quadraticCurveTo(20, 40, 0, 52)
    .quadraticCurveTo(-20, 40, -30, 18)
    .lineTo(-35, -30)
    .closePath()
    .stroke({ color: 0xc9e9f0, width: 2.5 });
  root.addChild(shield);
  shield.visible = false;
  const ambient = particleLayer(body, textures.soft, 32, "normal");
  const fire = id === "spell" ? particleLayer(body, textures.flameTex, 110) : null;
  const core = id === "spell" ? sprite(textures.fireballTex, body, 54, 54) : null;
  if (core) core.blendMode = "add";
  const tex =
    id === "crow"
      ? textures.featherTex
      : id === "wraith"
        ? textures.shardTex
        : ["spell", "shade", "hollow"].includes(id)
          ? textures.soft
          : textures.sparkTex;
  const debris = particleLayer(body, tex, 26, id === "crow" ? "normal" : "add");
  if (id === "arrow") {
    glow.x = ring.x = debris.pc.x = 88;
  }
  return {
    id,
    color,
    root,
    choreography,
    body,
    parts,
    glow,
    trail,
    ring,
    shield,
    ambient,
    fire,
    core,
    debris,
  };
}
type Model = Awaited<ReturnType<typeof createModel>>;

/** One renderer per mounted game. GSAP renders only while an attack is active. */
export async function createAttackRenderer(host: HTMLElement) {
  const app = new Application();
  await app.init({
    resizeTo: window,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(devicePixelRatio, 2),
    autoDensity: true,
    preference: "webgl",
    autoStart: false,
  });
  app.canvas.setAttribute("aria-hidden", "true");
  host.append(app.canvas);
  const textures = createAttackTextures();
  const models = new Map<AttackKind, Model>();
  try {
    // Explicit entries keep the complete set checked by the compiler.
    for (const id of [
      "blade",
      "arrow",
      "spell",
      "wolf",
      "raider",
      "soldier",
      "shade",
      "sentinel",
      "stag",
      "crow",
      "wraith",
      "roots",
      "marshal",
      "hollow",
    ] satisfies AttackKind[]) {
      const model = await createModel(id, textures);
      models.set(id, model);
      app.stage.addChild(model.root);
    }
  } catch (error) {
    app.destroy(true, { children: true });
    textures.destroy();
    throw error;
  }
  let active: ReturnType<typeof createAttackTimeline> | null = null;
  function clear() {
    active?.timeline.kill();
    active = null;
    for (const model of models.values()) model.root.visible = false;
    app.render();
  }
  return {
    play(request: AttackRequest | null) {
      clear();
      if (!request) return;
      const model = models.get(request.kind);
      if (!model) return;
      const { geometry, stage } = request;
      const animation = createAttackTimeline(
        request.kind,
        model.choreography,
        stage,
        request.duration,
      );
      active = animation;
      const scale = (request.powerful ? 1.05 : 0.8) * Math.min(1, window.innerWidth / 600);
      model.root.visible = true;
      model.root.scale.set(scale);
      const projectile = request.kind === "arrow" || request.kind === "spell";
      model.root.rotation = projectile ? (geometry.angle * Math.PI) / 180 : 0;
      const render = () => {
        const progress = projectile ? animation.motion.strike : 1;
        // Arrow broadhead, rather than shaft midpoint, reaches the target.
        const offset = request.kind === "arrow" ? 88 * scale : 0;
        model.root.position.set(
          geometry.x + geometry.dx * progress - Math.cos(model.root.rotation) * offset,
          geometry.y + geometry.dy * progress - Math.sin(model.root.rotation) * offset,
        );
        draw(model, animation.motion, stage);
        model.shield.visible = request.blocked && stage === "impact";
        model.shield.alpha = animation.motion.fade;
        model.shield.rotation = -model.root.rotation;
        model.shield.position.set(offset / scale, 0);
        app.render();
      };
      animation.timeline.eventCallback("onUpdate", render);
      animation.timeline.eventCallback("onComplete", () => {
        model.root.visible = false;
        app.render();
      });
      render();
      animation.timeline.play();
    },
    destroy() {
      active?.timeline.kill();
      app.destroy(true, { children: true });
      textures.destroy();
    },
  };
}
function draw(m: Model, motion: Motion, stage: AttackStage) {
  const { id } = m,
    wind = 372,
    strike = 228,
    hit = 600,
    t = stage === "impact" ? 600 + motion.time : motion.time;
  const age = t - hit,
    w = motion.wind,
    s = motion.strike,
    k = s,
    decay = motion.fade,
    opacity = motion.opacity,
    sec = t;
  m.body.position.set(0, 0);
  m.body.rotation = 0;
  m.body.scale.set(1);
  m.trail.visible = ["blade", "raider", "marshal"].includes(id) && t > wind;
  m.trail.alpha = age < 0 ? s : decay;
  m.trail.scale.set(Math.max(0.01, E(s)), 1);
  m.glow.alpha = age >= 0 ? Math.max(0, 1 - age / 170) * 0.75 : 0;
  m.ring.alpha = age >= 0 ? (1 - C(age / 400)) * 0.45 : 0;
  m.ring.scale.set(Math.max(0.01, E(Math.max(age, 0) / 250) * 1.5));
  m.parts.forEach(({ s: p, cls }, i) => {
    p.alpha = opacity;
    p.position.set(0, 0);
    p.rotation = 0;
    p.scale.set(id === "blade" ? 0.47 : id === "arrow" ? 0.426 : 0.375);
    if (id === "blade" || id === "raider") {
      p.rotation = L(-1.1, 0.7, k);
      if (cls === "trail") p.alpha *= 0.18;
    }
    if (id === "arrow") {
      p.rotation = age > 0 ? Math.sin(age * 0.08) * Math.exp(-age / 110) * 0.018 : 0;
    }
    if (id === "wolf") {
      p.y = (cls === "jaw-upper" ? -1 : 1) * L(20, -8, k);
      p.rotation = -0.1;
    }
    if (id === "soldier") {
      p.rotation = Math.PI;
      p.y = L(-58, 0, k);
    }
    if (id === "sentinel") {
      p.rotation = L(-0.5, 0, k);
      p.y = L(-35, 45, k);
      if (cls === "fracture") p.alpha = age >= 0 ? decay * 0.6 : 0;
    }
    if (id === "stag") {
      p.scale.set(0.375 * L(0.6, 1.1, k));
      p.y = L(-15, 10, k);
    }
    if (id === "crow") {
      p.y = L(-35, 8, k);
      p.rotation =
        cls === "wing-left" ? L(0.5, -0.25, k) : cls === "wing-right" ? L(-0.5, 0.25, k) : 0;
    }
    if (id === "wraith") {
      p.y = cls.includes("one") ? L(-42, 9, k) : 0;
      if (cls.includes("two")) p.alpha = age >= 0 ? decay : 0;
    }
    if (id === "roots") {
      const grow = Math.max(0.01, E(C(s - i * 0.09)));
      p.scale.y = 0.375 * grow;
      p.y = (1 - grow) * 70;
    }
    if (id === "marshal") {
      p.rotation = (i ? 1 : -1) * L(-0.4, 0.08, Math.pow(C((t - wind - i * 45) / strike), 3));
    }
    if (id === "shade") {
      if (cls === "spectral-coil") {
        p.rotation = sec * 0.0013;
        p.alpha *= 0.4;
      } else p.scale.set(0.375 * L(1.2, 0.8, k));
    }
    if (id === "hollow") {
      if (cls === "void-ring") {
        p.rotation = sec * 0.001;
        p.scale.set(
          0.375 * (age < 0 ? L(0.6, 1.1, w) * (1 - k * 0.8) : Math.max(0.02, 1 - E(age / 180))),
        );
      } else p.alpha = age >= 0 ? 1 - C(age / 300) : 0;
    }
  });
  m.ambient.ps.forEach((p, i) => {
    const q = ((sec + i * 71) % 1200) / 1200,
      magical = ["shade", "hollow"].includes(id);
    p.alpha =
      age > 0 && age < 800
        ? (id === "spell" ? 0.08 : magical ? 0.12 : 0) * Math.sin(q * Math.PI)
        : 0;
    p.tint = id === "spell" ? 0x7c807c : m.color;
    p.x = Math.sin(i * 2.39 + q * 2) * 24 * (1 + q);
    p.y = -q * 100;
    p.scaleX = 0.4 + q * 0.9;
    p.scaleY = 0.6 + q;
    p.rotation = i + q;
    if (id === "spell") {
      p.x = -25 - q * 110;
      p.y = Math.sin(i + q * 4) * 12 - q * 12;
      p.scaleX = 0.3 + q * 0.6;
      p.scaleY = 0.3 + q * 0.4;
    }
  });
  if (m.fire && m.core) {
    const charge = motion.charge,
      burn = motion.fade,
      burst = motion.burst;
    m.core.alpha = charge * burn * 0.92;
    m.core.width = m.core.height = (44 + burst * 65) * charge;
    m.glow.alpha = charge * burn * 0.55;
    m.glow.width = m.glow.height = 105 + burst * 95;
    m.fire.ps.forEach((p, i) => {
      const q = ((sec + i * 47) % (470 + (i % 7) * 31)) / (470 + (i % 7) * 31),
        a = i * 2.399 + sec * 0.003,
        head = i < 56;
      p.alpha = charge * burn * (head ? 0.32 : 0.42) * Math.sin(q * Math.PI);
      if (head) {
        const r = (12 + q * 14 + burst * 38) * charge;
        p.x = Math.cos(a) * r;
        p.y = Math.sin(a) * r;
        p.rotation = a + Math.PI / 2;
        p.scaleX = (0.27 + (i % 3) * 0.07) * charge;
        p.scaleY = (0.4 + (i % 4) * 0.07) * charge;
      } else {
        const tail = q * (t >= wind ? 112 : 25);
        p.x = -18 - tail - burst * 12;
        p.y = Math.sin(i * 1.7 + q * 7) * (7 + q * 7) + Math.sin(sec * 0.008 - q * 5) * 5 * q;
        p.rotation = -Math.PI / 2 + Math.sin(q * 5 + i) * 0.17;
        p.scaleX = (0.24 + (i % 3) * 0.07) * (1 - q * 0.5) * charge;
        p.scaleY = (0.5 + (i % 4) * 0.12) * (1 - q * 0.35) * charge;
      }
      p.tint = head
        ? q < 0.35
          ? 0xffe699
          : 0xffa134
        : q < 0.35
          ? 0xffb54d
          : q < 0.7
            ? 0xf5781d
            : 0xb13b10;
    });
  }

  m.debris.ps.forEach((p, i) => {
    const a = age - (i % 4) * 15,
      q = C(a / 750),
      angle = i * 2.399,
      magic = ["shade", "hollow"].includes(id),
      dist = magic ? 90 * (1 - E(q)) : E(q) * (25 + ((i * 17) % 65));
    p.alpha = a > 0 && a < 750 ? (1 - q) * 0.85 : 0;
    p.tint = m.color;
    p.x = Math.cos(angle) * dist;
    p.y = Math.sin(angle) * dist * 0.6 + (id === "spell" ? -q * 55 : q * q * 25);
    p.rotation = angle + q * (id === "crow" ? 4 : 0);
    p.scaleX = id === "crow" ? 0.23 : id === "wraith" ? 0.2 : id === "spell" ? 0.05 : 0.13;
    p.scaleY = id === "crow" ? 0.23 : id === "wraith" ? 0.25 : id === "spell" ? 0.05 : 0.28;
  });
}
