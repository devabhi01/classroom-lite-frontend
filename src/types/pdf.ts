export interface PdfState {
  fileName: string;
  fileUrl: string;
  totalPages: number;
  currentPage: number;
  scale?: number;
}

export interface PdfSharePayload {
  classroomCode: string;
  pdf: PdfState;
}

export interface PdfPageChangePayload {
  classroomCode: string;
  currentPage: number;
}
