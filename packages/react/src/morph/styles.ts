export const morphStyles = `
[data-glaze-group]{position:relative;isolation:isolate;box-sizing:border-box}
[data-glaze-canvas]{position:absolute;inset:0;display:block;visibility:hidden;pointer-events:none;z-index:0;max-width:none}
[data-glaze-canvas-layer]{position:absolute;inset:0;pointer-events:none;z-index:0}
[data-glaze-ready="true"]>[data-glaze-canvas-layer]>[data-glaze-canvas]{visibility:inherit}
[data-glaze-surface]{position:absolute;left:0;top:0;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;z-index:1;color:inherit;border:0;padding:0;transform-origin:center;background:color-mix(in srgb,Canvas 65%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 4px 16px #0002}
[data-glaze-ready="true"] [data-glaze-surface]{background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}
[data-glaze-content]{display:flex;align-items:center;justify-content:center;flex-shrink:0;transform-origin:center}
[data-glaze-surface][disabled] [data-glaze-content]{opacity:.4}
button[data-glaze-surface]{cursor:pointer;font:inherit}
button[data-glaze-surface]:disabled{cursor:default}
[data-glaze-surface]:focus-visible{outline:2px solid currentColor;outline-offset:3px}
@media(forced-colors:active){[data-glaze-canvas]{display:none!important}[data-glaze-surface]{background:Canvas!important;color:CanvasText!important;border:1px solid ButtonText}}
`;
