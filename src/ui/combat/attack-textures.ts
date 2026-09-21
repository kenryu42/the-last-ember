import { Texture } from "pixi.js";
import type { AttackKind } from "./attack-timeline";
const C = (x: number) => Math.max(0, Math.min(1, x)),
  TAU = Math.PI * 2;
export function createAttackTextures() {
  const textures: Texture[] = [];
  function canvasTex(
    w: number,
    h: number,
    draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
  ) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    draw(ctx, w, h);
    const texture = Texture.from(c);
    textures.push(texture);
    return texture;
  }
  const soft = canvasTex(64, 64, (c) => {
    const im = c.createImageData(64, 64);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4,
          r = Math.hypot((x - 32) / 31, (y - 32) / 31),
          n = 0.83 + 0.17 * Math.sin(x * 0.8 + Math.sin(y * 0.5)) * Math.sin(y * 0.7);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255;
        im.data[i + 3] = 255 * Math.pow(Math.max(0, 1 - r), 1.6) * n;
      }
    c.putImageData(im, 0, 0);
  });
  const flameTex = canvasTex(64, 96, (c) => {
    const im = c.createImageData(64, 96);
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4,
          v = y / 96,
          center = 32 + Math.sin(v * 7) * 6 * (1 - v),
          r = Math.hypot((x - center) / (8 + v * 22), (y - 60) / 50),
          n = 0.75 + 0.25 * Math.sin(x * 0.55 + Math.sin(y * 0.22) * 3) * Math.sin(y * 0.4);
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255;
        im.data[i + 3] = Math.round(255 * Math.pow(Math.max(0, 1 - r), 1.05) * n);
      }
    c.putImageData(im, 0, 0);
  });
  const shardTex = canvasTex(20, 32, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(10, 0);
    c.lineTo(17, 16);
    c.lineTo(8, 32);
    c.lineTo(3, 14);
    c.closePath();
    c.fill();
  });
  const featherTex = canvasTex(32, 64, (c) => {
    c.fillStyle = "#fff";
    c.beginPath();
    c.moveTo(16, 1);
    c.bezierCurveTo(36, 24, 28, 46, 16, 62);
    c.bezierCurveTo(-5, 43, 8, 12, 16, 1);
    c.fill();
    c.strokeStyle = "#888";
    c.beginPath();
    c.moveTo(16, 3);
    c.lineTo(16, 60);
    c.stroke();
  });
  const fireballTex = canvasTex(96, 96, (c) => {
    const im = c.createImageData(96, 96);
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) {
        const i = (y * 96 + x) * 4,
          dx = (x - 48) / 43,
          dy = (y - 48) / 43,
          r = Math.hypot(dx, dy),
          noise = Math.sin(x * 0.43 + Math.sin(y * 0.31) * 2) * Math.sin(y * 0.47) * 0.035,
          edge = r + noise,
          hot = C(1 - r);
        im.data[i] = 255;
        im.data[i + 1] = Math.round(85 + 170 * Math.pow(hot, 0.45));
        im.data[i + 2] = Math.round(8 + 210 * Math.pow(hot, 1.4));
        im.data[i + 3] = Math.round(255 * C((1 - edge) * 3.5));
      }
    c.putImageData(im, 0, 0);
  });
  const sparkTex = canvasTex(48, 8, (c) => {
    const g = c.createLinearGradient(0, 0, 48, 0);
    g.addColorStop(0, "#ffffff00");
    g.addColorStop(0.8, "#ffffff");
    g.addColorStop(1, "#ffffff00");
    c.fillStyle = g;
    c.fillRect(0, 2, 48, 4);
  });
  async function svgTexture(path: string, color: string, id: AttackKind) {
    const outline = ["stag", "roots", "shade"].includes(id);
    const fill = outline ? "none" : "url(#material)";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 200 200"><defs><linearGradient id="material" x1="0" y1="0" x2="1" y2=".25"><stop stop-color="#3a413f"/><stop offset=".3" stop-color="${color}"/><stop offset=".48" stop-color="#fff5da"/><stop offset=".55" stop-color="${color}"/><stop offset="1" stop-color="#536060"/></linearGradient></defs><path d="${path}" fill="${fill}" stroke="${color}" stroke-width="${outline ? 5 : 1.5}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const texture = Texture.from(img);
    textures.push(texture);
    return texture;
  }
  const arrowTex = canvasTex(512, 96, (c) => {
    const wood = c.createLinearGradient(0, 42, 0, 53);
    wood.addColorStop(0, "#e4c69a");
    wood.addColorStop(0.5, "#a77c45");
    wood.addColorStop(1, "#573b25");
    c.fillStyle = wood;
    c.fillRect(50, 44, 360, 7);
    c.strokeStyle = "#755538";
    c.lineWidth = 0.6;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(54, 45 + i * 2);
      c.lineTo(405, 45 + i * 2);
      c.stroke();
    }
    const metal = c.createLinearGradient(385, 23, 440, 65);
    metal.addColorStop(0, "#76868e");
    metal.addColorStop(0.48, "#eaf3f8");
    metal.addColorStop(0.51, "#5e747f");
    metal.addColorStop(1, "#b3c4cb");
    c.fillStyle = metal;
    c.beginPath();
    c.moveTo(400, 25);
    c.lineTo(463, 48);
    c.lineTo(400, 70);
    c.lineTo(413, 48);
    c.closePath();
    c.fill();
    for (const sign of [-1, 1]) {
      c.fillStyle = sign === 1 ? "#e0ddd0" : "#8c948c";
      c.beginPath();
      c.moveTo(50, 48);
      c.lineTo(64, 48 + sign * 21);
      c.quadraticCurveTo(95, 48 + sign * 23, 130, 48);
      c.closePath();
      c.fill();
      c.strokeStyle = "#575e55";
      for (let x = 64; x < 124; x += 6) {
        c.beginPath();
        c.moveTo(x, 48);
        c.lineTo(x - 7, 48 + sign * (130 - x) * 0.3);
        c.stroke();
      }
    }
    c.fillStyle = "#534837";
    for (let i = 0; i < 8; i++) c.fillRect(48 + i * 3, 42, 1.5, 11);
  });
  const swordTex = canvasTex(200, 350, (c) => {
    const gr = c.createLinearGradient(65, 0, 125, 0);
    gr.addColorStop(0, "#6c818c");
    gr.addColorStop(0.47, "#dce8ef");
    gr.addColorStop(0.5, "#f9ffff");
    gr.addColorStop(0.53, "#93a6ae");
    gr.addColorStop(1, "#526672");
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(86, 245);
    c.lineTo(85, 58);
    c.lineTo(100, 17);
    c.lineTo(115, 58);
    c.lineTo(113, 245);
    c.closePath();
    c.fill();
    c.strokeStyle = "#f4fcfc";
    c.lineWidth = 1.3;
    c.stroke();
    c.fillStyle = "#aa8544";
    c.fillRect(56, 243, 88, 9);
    c.fillStyle = "#44392e";
    c.fillRect(91, 252, 17, 64);
    c.strokeStyle = "#96764b";
    for (let y = 255; y < 314; y += 7) {
      c.beginPath();
      c.moveTo(91, y);
      c.lineTo(108, y + 4);
      c.stroke();
    }
    c.fillStyle = "#ad8c54";
    c.beginPath();
    c.ellipse(100, 320, 13, 9, 0, 0, TAU);
    c.fill();
  });

  return {
    soft,
    flameTex,
    shardTex,
    featherTex,
    fireballTex,
    sparkTex,
    arrowTex,
    swordTex,
    svgTexture,
    destroy() {
      for (const texture of textures) texture.destroy(true);
    },
  };
}
