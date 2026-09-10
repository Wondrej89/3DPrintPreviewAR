import {openDB} from 'idb'; import type {RecentModel} from '../types'; export const MAX_RECENTS=10;
const db=()=>openDB('printscope',1,{upgrade(d){d.createObjectStore('models',{keyPath:'id'});d.createObjectStore('settings')}});
export const trimLRU=<T extends {lastOpened:number}>(items:T[],limit=MAX_RECENTS)=>[...items].sort((a,b)=>b.lastOpened-a.lastOpened).slice(0,limit);
export async function saveModel(m:RecentModel){const d=await db();await d.put('models',m);const all=await d.getAll('models') as RecentModel[];for(const old of trimLRU(all).length===all.length?[]:all.sort((a,b)=>b.lastOpened-a.lastOpened).slice(MAX_RECENTS))await d.delete('models',old.id)}
export async function recentModels(){return trimLRU(await (await db()).getAll('models') as RecentModel[])} export async function removeModel(id:string){await(await db()).delete('models',id)}
export async function setting<T>(key:string,fallback:T):Promise<T>{return (await(await db()).get('settings',key) as T)||fallback} export async function setSetting<T>(key:string,v:T){await(await db()).put('settings',v,key)}
