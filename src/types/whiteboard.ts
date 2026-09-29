export interface DrawData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

export interface EraseData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
}

export type WhiteboardTool = 'pen' | 'eraser';

export type WhiteboardOperation =
  | ({ type: 'draw' } & DrawData)
  | ({ type: 'erase' } & EraseData)
  | { type: 'clear' };

export interface WhiteboardDrawPayload {
  classroomCode: string;
  data: DrawData;
}

export interface WhiteboardErasePayload {
  classroomCode: string;
  data: EraseData;
}

export interface WhiteboardClearPayload {
  classroomCode: string;
}
