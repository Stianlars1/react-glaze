export const menuStyles = `
[data-glaze-menu-root]{box-sizing:border-box;vertical-align:middle}
[data-glaze-menu-root] [data-glaze-group]{pointer-events:none}
[data-glaze-menu-root] [data-glaze-surface][inert]{pointer-events:none!important}
[data-glaze-menu-item-content]{display:inline-flex;align-items:center;justify-content:center;gap:10px;flex-shrink:0;white-space:nowrap;width:max-content;max-width:none}
[data-glaze-menu-item-content]>svg{flex-shrink:0}
[data-glaze-menu-panel] [data-glaze-content]{width:100%;height:100%}
[data-glaze-menu-scroll]{position:relative;box-sizing:border-box;overflow:auto;overscroll-behavior:contain;padding:12px;width:100%;height:100%;pointer-events:auto;scrollbar-width:thin}
[data-glaze-menu-grid]{position:relative;display:grid;width:max-content;min-width:100%}
[data-glaze-menu-panel-item]{appearance:none;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:inherit;font:inherit;padding:8px 16px;min-width:44px;min-height:44px;border-radius:17px;cursor:pointer;text-align:start}
[data-glaze-menu-panel-item]:disabled{cursor:default;opacity:.4}
[data-glaze-menu-panel][data-appearance="labels"] [data-glaze-menu-panel-item]{justify-content:flex-start}
[data-glaze-menu-panel-item]:focus-visible{outline:auto;outline-offset:-3px}
[data-glaze-menu-trigger-overlay]{appearance:none;position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;padding:0;background:transparent;color:inherit;font:inherit;cursor:pointer;z-index:2}
[data-glaze-menu-trigger-overlay]:disabled{cursor:default;opacity:.4}
[data-glaze-menu-trigger-overlay]:focus-visible{outline:auto;outline-offset:3px}
[data-glaze-menu-trigger-overlay][inert]{visibility:hidden;pointer-events:none}
[data-glaze-menu-close]{appearance:none;position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;padding:0;border-radius:50%;background:color-mix(in srgb,Canvas 65%,transparent);color:inherit;cursor:pointer;pointer-events:auto;z-index:2}
[data-glaze-menu-close]:focus-visible{outline:auto;outline-offset:2px}
[data-glaze-menu-panel][inert] [data-glaze-menu-scroll]{pointer-events:none}
@media(hover:hover){[data-glaze-menu-panel-item]:enabled:hover{background:color-mix(in srgb,currentColor 8%,transparent)}}
@media(forced-colors:active){[data-glaze-menu-panel-item]:focus-visible{outline:2px solid Highlight}}
`;
