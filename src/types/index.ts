import type { BufferGeometry, Group } from 'three';
export type ModelUnit='mm'|'cm'|'inch'; export type ModelFormat='stl'|'obj'|'3mf';
export interface Dimensions{x:number;y:number;z:number}
export interface MeshSummary{status:'OK'|'Warning'|'Error';boundaryEdges:number;nonManifoldEdges:number;degenerateTriangles:number;disconnectedShells:number;inconsistentNormals:number}
export interface RecentModel{id:string;name:string;format:ModelFormat;unit:ModelUnit;dimensions:Dimensions;lastOpened:number;blob:Blob;thumbnail?:string;orientation:number[];mesh?:MeshSummary}
export type BuildVolume={shape:'rectangular';x:number;y:number;z:number}|{shape:'circular';diameter:number;z:number};
export interface PrinterProfile{id:string;manufacturer:string;model:string;variant?:string;buildVolume:BuildVolume;defaultNozzleDiameterMm:number;availableNozzleDiametersMm?:number[];userCreated:boolean}
export interface MaterialProfile{id:string;name:string;overhangSeverityFactor:number;bridgeSeverityFactor:number;notes?:string}
export interface LoadedModel{root:Group;geometries:BufferGeometry[];format:ModelFormat;unit:ModelUnit;unitLocked:boolean}
export type AnalysisMode='normal'|'overhang'|'thickness'|'contact';
