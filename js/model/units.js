export const unitScale=u=>({mm:1,cm:10,inch:25.4}[u]??NaN);export const dimensionsText=d=>`${d.x.toFixed(1)} × ${d.y.toFixed(1)} × ${d.z.toFixed(1)} mm`;
