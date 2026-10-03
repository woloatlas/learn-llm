import { Resvg } from "@resvg/resvg-js";

export interface SvgRenderResult {
  ok: boolean;
  pngBuffer?: Buffer;
  error?: string;
}

/**
 * Renders an SVG string to a high-resolution PNG buffer using Resvg.
 */
export function renderSvgToPng(svgContent: string, scale = 2): SvgRenderResult {
  try {
    const trimmed = svgContent.trim();
    if (!trimmed.includes("<svg")) {
      return { ok: false, error: "Content is not a valid <svg> document." };
    }

    const resvg = new Resvg(trimmed, {
      fitTo: { mode: "zoom", value: scale },
    });

    const pngData = resvg.render().asPng();
    return {
      ok: true,
      pngBuffer: Buffer.from(pngData),
    };
  } catch (err) {
    return {
      ok: false,
      error: `SVG rendering failed: ${String(err)}`,
    };
  }
}
