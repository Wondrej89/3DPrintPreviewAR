export interface BaseNode { type: string; loc?: SourceLocation | null; range?: [number, number] }
export interface SourceLocation { source?: string | null; start: Position; end: Position }
export interface Position { line: number; column: number }
export interface Node extends BaseNode { [key: string]: unknown }
export interface Program extends BaseNode { type: 'Program'; body: Node[]; sourceType: 'script' | 'module' }
