// Adapted from html-to-image 1.11.13, src/clone-node.ts (MIT).
// Image selection preserves currentSrc and disables cloned picture candidates.
// Upstream helpers are pinned to 1.11.13; see THIRD-PARTY-NOTICES.md.
import type { Options as ImageOptions } from "html-to-image/lib/types.js";
import { captureYield } from "./capture-yield.js";
import { preserveAutoMargins } from "./clone-margins.js";
type Options = ImageOptions & {
  prune?: (node: HTMLElement) => boolean;
  imageSource?: (node: HTMLImageElement) => string | undefined;
  onImageClone?: (original: HTMLImageElement, clone: HTMLImageElement) => void;
  yield?: () => Promise<void>;
};
import { clonePseudoElements } from "html-to-image/lib/clone-pseudos.js";
import {
  createImage,
  toArray,
  isInstanceOfElement,
  getStyleProperties,
} from "html-to-image/lib/util.js";
import { getMimeType } from "html-to-image/lib/mimes.js";
import { resourceToDataURL } from "html-to-image/lib/dataurl.js";

async function cloneCanvasElement(canvas: HTMLCanvasElement) {
  const dataURL = canvas.toDataURL();
  if (dataURL === "data:,") {
    return canvas.cloneNode(false) as HTMLCanvasElement;
  }
  return createImage(dataURL);
}

async function cloneVideoElement(video: HTMLVideoElement, options: Options) {
  if (video.currentSrc) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL();
    return createImage(dataURL);
  }

  const poster = video.poster;
  const contentType = getMimeType(poster);
  const dataURL = await resourceToDataURL(poster, contentType, options);
  return createImage(dataURL);
}

async function cloneIFrameElement(iframe: HTMLIFrameElement, options: Options) {
  try {
    if (iframe?.contentDocument?.body) {
      return (await cloneNode(
        iframe.contentDocument.body,
        options,
        true,
      )) as HTMLBodyElement;
    }
  } catch {
    // Failed to clone iframe
  }

  return iframe.cloneNode(false) as HTMLIFrameElement;
}

async function cloneSingleNode<T extends HTMLElement>(
  node: T,
  options: Options,
): Promise<HTMLElement> {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return cloneCanvasElement(node);
  }

  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return cloneVideoElement(node, options);
  }

  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node, options);
  }

  const clone = node.cloneNode(isSVGElement(node)) as T;
  if (
    isInstanceOfElement(node, HTMLSourceElement) &&
    node.parentElement?.tagName === "PICTURE"
  ) {
    // The selected image is embedded below. SVG image documents cannot load
    // the original external picture candidates again (observed in WebKit).
    clone.removeAttribute("srcset");
    clone.removeAttribute("sizes");
  }
  if (isInstanceOfElement(node, HTMLImageElement)) {
    const image = clone as unknown as HTMLImageElement;
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    image.src = options.imageSource?.(node) ?? (node.currentSrc || node.src);
    options.onImageClone?.(node, image);
  }
  return clone;
}

const isSlotElement = (node: HTMLElement): node is HTMLSlotElement =>
  node.tagName != null && node.tagName.toUpperCase() === "SLOT";

const isSVGElement = (node: HTMLElement): node is HTMLSlotElement =>
  node.tagName != null && node.tagName.toUpperCase() === "SVG";

async function cloneChildren<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
): Promise<T> {
  if (isSVGElement(clonedNode)) {
    return clonedNode;
  }

  let children: T[] = [];

  if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
    children = toArray<T>(nativeNode.assignedNodes());
  } else if (
    isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
    nativeNode.contentDocument?.body
  ) {
    children = toArray<T>(nativeNode.contentDocument.body.childNodes);
  } else {
    children = toArray<T>((nativeNode.shadowRoot ?? nativeNode).childNodes);
  }

  if (
    children.length === 0 ||
    isInstanceOfElement(nativeNode, HTMLVideoElement)
  ) {
    return clonedNode;
  }

  await children.reduce(
    (deferred, child) =>
      deferred
        .then(() => cloneNode(child, options))
        .then((clonedChild: HTMLElement | null) => {
          if (clonedChild) {
            clonedNode.appendChild(clonedChild);
          }
        }),
    Promise.resolve(),
  );

  return clonedNode;
}

function cloneCSSStyle<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
) {
  const targetStyle = clonedNode.style;
  if (!targetStyle) {
    return;
  }

  const sourceStyle = window.getComputedStyle(nativeNode);
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText;
    targetStyle.transformOrigin = sourceStyle.transformOrigin;
  } else {
    getStyleProperties(options).forEach((name) => {
      let value = sourceStyle.getPropertyValue(name);
      if (
        isInstanceOfElement(nativeNode, HTMLIFrameElement) &&
        name === "display" &&
        value === "inline"
      ) {
        value = "block";
      }

      if (name === "d" && clonedNode.getAttribute("d")) {
        value = `path(${clonedNode.getAttribute("d")})`;
      }

      targetStyle.setProperty(
        name,
        value,
        sourceStyle.getPropertyPriority(name),
      );
    });
  }
  preserveAutoMargins(nativeNode, sourceStyle, targetStyle);
}

function cloneInputValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
    clonedNode.innerHTML = nativeNode.value;
  }

  if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
    clonedNode.setAttribute("value", nativeNode.value);
  }
}

function cloneSelectValue<T extends HTMLElement>(nativeNode: T, clonedNode: T) {
  if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
    const clonedSelect = clonedNode as any as HTMLSelectElement;
    const selectedOption = Array.from(clonedSelect.children).find(
      (child) => nativeNode.value === child.getAttribute("value"),
    );

    if (selectedOption) {
      selectedOption.setAttribute("selected", "");
    }
  }
}

function decorate<T extends HTMLElement>(
  nativeNode: T,
  clonedNode: T,
  options: Options,
): T {
  if (isInstanceOfElement(clonedNode, Element)) {
    cloneCSSStyle(nativeNode, clonedNode, options);
    if (
      nativeNode.matches(
        '[data-liquid-host][data-liquid-mode="sharp"][data-liquid-enabled="true"]',
      )
    ) {
      // Keep the layout box, but never feed a sharp glass surface's own tint,
      // border, shadow or pseudo-elements back into its background texture.
      clonedNode.style.opacity = "0";
      return clonedNode;
    }
    clonePseudoElements(nativeNode, clonedNode, options);
    cloneInputValue(nativeNode, clonedNode);
    cloneSelectValue(nativeNode, clonedNode);
  }

  return clonedNode;
}

async function ensureSVGSymbols<T extends HTMLElement>(
  clone: T,
  options: Options,
) {
  const uses = clone.querySelectorAll ? clone.querySelectorAll("use") : [];
  if (uses.length === 0) {
    return clone;
  }

  const processedDefs: { [key: string]: HTMLElement } = {};
  for (let i = 0; i < uses.length; i++) {
    const use = uses[i];
    const id = use.getAttribute("xlink:href");
    if (id) {
      const exist = clone.querySelector(id);
      const definition = document.querySelector(id) as HTMLElement;
      if (!exist && definition && !processedDefs[id]) {
        // eslint-disable-next-line no-await-in-loop
        processedDefs[id] = (await cloneNode(definition, options, true))!;
      }
    }
  }

  const nodes = Object.values(processedDefs);
  if (nodes.length) {
    const ns = "http://www.w3.org/1999/xhtml";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("xmlns", ns);
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.overflow = "hidden";
    svg.style.display = "none";

    const defs = document.createElementNS(ns, "defs");
    svg.appendChild(defs);

    for (let i = 0; i < nodes.length; i++) {
      defs.appendChild(nodes[i]);
    }

    clone.appendChild(svg);
  }

  return clone;
}

export async function cloneNode<T extends HTMLElement>(
  node: T,
  options: Options,
  isRoot?: boolean,
): Promise<T | null> {
  if (isRoot) options = { ...options, yield: captureYield() };
  await options.yield?.();
  if (!isRoot && options.filter && !options.filter(node)) {
    return null;
  }
  if (!isRoot && node instanceof Element && options.prune?.(node)) {
    const placeholder = node.cloneNode(false) as T;
    cloneCSSStyle(node, placeholder, options);
    // Keep the browser-resolved layout box, without embedding or painting an
    // off-region subtree. Never mutate the application's own DOM or resources.
    for (const name of [
      "src",
      "srcset",
      "sizes",
      "poster",
      "href",
      "xlink:href",
    ])
      placeholder.removeAttribute(name);
    if (placeholder instanceof HTMLImageElement)
      placeholder.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    if (placeholder.style) {
      placeholder.style.opacity = "0";
      placeholder.style.backgroundImage = "none";
      placeholder.style.borderImageSource = "none";
      placeholder.style.maskImage = "none";
      placeholder.style.listStyleImage = "none";
    }
    return placeholder;
  }

  return Promise.resolve(node)
    .then((clonedNode) => cloneSingleNode(clonedNode, options) as Promise<T>)
    .then((clonedNode) => cloneChildren(node, clonedNode, options))
    .then((clonedNode) => decorate(node, clonedNode, options))
    .then((clonedNode) => ensureSVGSymbols(clonedNode, options));
}
