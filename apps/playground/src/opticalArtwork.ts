// Drawing instructions from the pinned Drawn To optical-type scene.
// Kept separate from the glass: the result is ordinary page imagery.
export function drawOpticalArtwork(width: number, height: number) {
  const aspect = width / height,
    portrait = aspect < 1;
  const canvas = document.createElement("canvas");
  canvas.width = portrait ? 1200 : 2200;
  canvas.height = Math.round(canvas.width / aspect);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f5f5f0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#deded5";
  ctx.lineWidth = 1;
  for (const y of [0.21, 0.49, 0.77]) {
    ctx.beginPath();
    ctx.moveTo(55, canvas.height * y);
    ctx.lineTo(canvas.width - 55, canvas.height * y);
    ctx.stroke();
  }
  ctx.fillStyle = "#20231f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.min(canvas.width * 0.264, canvas.height * 0.385)}px Inter, sans-serif`;
  ctx.letterSpacing = `${-canvas.width * 0.013}px`;
  ctx.fillText(
    "LOOK",
    canvas.width * 0.49,
    canvas.height * (portrait ? 0.36 : 0.29),
  );
  ctx.fillText(
    "AGAIN.",
    canvas.width * 0.49,
    canvas.height * (portrait ? 0.6 : 0.7),
  );
  ctx.letterSpacing = "0px";
  ctx.font = `400 ${canvas.width * (portrait ? 0.025 : 0.0105)}px "Geist Mono", monospace`;
  ctx.textAlign = "left";
  ctx.fillStyle = "#787e70";
  ctx.fillText("A DIFFERENT WAY OF SEEING", 58, canvas.height * 0.085);
  ctx.textAlign = "right";
  ctx.fillText("DRAWN TO / PERCEPTION", canvas.width - 58, canvas.height * 0.9);
  ctx.fillStyle = "#dbed69";
  ctx.fillRect(
    canvas.width * 0.83,
    canvas.height * 0.08,
    canvas.width * 0.07,
    canvas.width * 0.014,
  );
  return canvas;
}
let fontsReady: Promise<FontFace[]> | undefined;
export function loadOpticalFonts(base = "/fonts/") {
  // Canvas-only fonts are registered through FontFace, so the DOM capture
  // library does not embed unused global font-face rules into every snapshot.
  return (fontsReady ??= Promise.all([
    new FontFace("Inter", `url(${base}inter-600.ttf)`, {
      weight: "600",
    }).load(),
    new FontFace("Geist Mono", `url(${base}geist-mono-400.ttf)`, {
      weight: "400",
    }).load(),
  ]).then((faces) => {
    for (const face of faces) document.fonts.add(face);
    return faces;
  }));
}
