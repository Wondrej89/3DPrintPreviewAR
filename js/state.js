export const state={currentModel:null,transform:{quaternion:[0,0,0,1],position:[0,0,0]},printer:null,nozzle:.4,material:null,analysisMode:'normal'};
const listeners=new Set();export function update(patch){Object.assign(state,patch);listeners.forEach(fn=>fn(state))}export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
