import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import api from '@/lib/api';
import { PdfState } from '@/types/pdf';
import { toast } from '@/components/ui/Toast';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface UsePdfProps {
  socket: Socket | null;
  classroomCode: string;
  isHost: boolean;
  initialPdf?: PdfState | null;
}

export const usePdf = ({
  socket,
  classroomCode,
  isHost,
  initialPdf = null,
}: UsePdfProps) => {
  const [pdfState, setPdfState] = useState<PdfState | null>(initialPdf);
  const [loading, setLoading] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document into memory
  const loadPdfDocument = useCallback(async (url: string) => {
    try {
      setLoading(true);
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      let doc;
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        const loadingTask = pdfjsLib.getDocument({ url });
        doc = await loadingTask.promise;
      } else {
        // Fetch array buffer directly to avoid Web Worker cross-origin network restrictions
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status} fetching PDF file`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        doc = await loadingTask.promise;
      }

      setPdfDoc(doc);
      return doc.numPages;
    } catch (err: any) {
      console.warn('Could not load PDF binary from URL:', err?.message || err);
      toast.error('Failed to load PDF: ' + (err?.message || 'Could not fetch file'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Render a specific page to canvas
  const renderPage = useCallback(
    async (pageNumber: number, scale: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            // Ignore cancel error
          }
        }

        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext as any);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering PDF page:', err);
        }
      }
    },
    [pdfDoc]
  );

  // Sync initial PDF if passed (or when it changes — e.g. classroom:state arrives after mount)
  useEffect(() => {
    if (initialPdf) {
      setPdfState(initialPdf);
      if (initialPdf.fileUrl && !initialPdf.fileUrl.startsWith('blob:')) {
        loadPdfDocument(initialPdf.fileUrl);
      }
    } else {
      setPdfState(null);
      setPdfDoc(null);
    }
  }, [initialPdf, loadPdfDocument]);

  // Render canvas whenever pdfDoc, currentPage or zoom changes
  useEffect(() => {
    if (pdfDoc && pdfState?.currentPage) {
      renderPage(pdfState.currentPage, zoom);
    }
  }, [pdfDoc, pdfState?.currentPage, zoom, renderPage]);

  // Socket listeners for PDF synchronization
  useEffect(() => {
    if (!socket) return;

    const handlePdfShared = async (payload: any) => {
      console.log('>>> [usePdf] Received pdf:shared socket event:', payload);
      const incomingPdf: PdfState =
        payload?.pdf ||
        (payload?.fileName
          ? {
              fileName: payload.fileName,
              fileUrl: payload.fileUrl || '',
              totalPages: payload.totalPages || 1,
              currentPage: payload.currentPage || 1,
              scale: payload.scale || 1.0,
            }
          : (payload as PdfState));

      if (incomingPdf?.fileName) {
        setPdfState(incomingPdf);
        if (!isHost) {
          toast.info(`Host shared: ${incomingPdf.fileName}`, 'New PDF Presentation');
        }
        // Only load if URL is a real fetchable URL (not a local blob URL)
        if (incomingPdf.fileUrl && !incomingPdf.fileUrl.startsWith('blob:')) {
          loadPdfDocument(incomingPdf.fileUrl);
        }
      }
    };

    const handlePdfPageChanged = (payload: { currentPage?: number; page?: number } | number) => {
      let newPage: number = 1;
      if (typeof payload === 'number') {
        newPage = payload;
      } else if (payload && typeof payload.currentPage === 'number') {
        newPage = payload.currentPage;
      } else if (payload && typeof payload.page === 'number') {
        newPage = payload.page;
      }

      setPdfState((prev) => (prev ? { ...prev, currentPage: newPage } : null));
    };

    const handlePdfClosed = () => {
      setPdfState(null);
      setPdfDoc(null);
      toast.info('Host closed the PDF presentation');
    };

    socket.on('pdf:shared', handlePdfShared);
    socket.on('pdf:share', handlePdfShared);
    socket.on('pdf:page-changed', handlePdfPageChanged);
    socket.on('pdf:page-change', handlePdfPageChanged);
    socket.on('pdf:closed', handlePdfClosed);
    socket.on('pdf:close', handlePdfClosed);

    return () => {
      socket.off('pdf:shared', handlePdfShared);
      socket.off('pdf:share', handlePdfShared);
      socket.off('pdf:page-changed', handlePdfPageChanged);
      socket.off('pdf:page-change', handlePdfPageChanged);
      socket.off('pdf:closed', handlePdfClosed);
      socket.off('pdf:close', handlePdfClosed);
    };
  }, [socket, loadPdfDocument, isHost]);

  // Host action: share local file
  const shareLocalPdf = useCallback(
    async (file: File) => {
      if (!isHost) {
        toast.error('Only host can share a PDF.');
        return;
      }

      try {
        setLoading(true);
        const objectUrl = URL.createObjectURL(file);
        const totalPages = (await loadPdfDocument(objectUrl)) || 1;

        // Full local state with blob URL for the host (instant preview)
        const newPdf: PdfState = {
          fileName: file.name,
          fileUrl: objectUrl,
          totalPages,
          currentPage: 1,
          scale: 1.0,
        };

        setPdfState(newPdf);
        setZoom(1.0);

        // Upload the PDF to the backend so all students can download and render the actual presentation!
        let publicUrl = '';
        try {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await api.post('/pdf/upload', formData);
          const resData = uploadRes.data?.data || uploadRes.data;
          if (resData?.fileUrl) {
            publicUrl = resData.fileUrl;
          }
        } catch (uploadErr: any) {
          console.error('PDF upload to server failed:', uploadErr);
          toast.error('Warning: Server upload failed. Students may not be able to download the slides.');
        }

        if (socket && socket.connected) {
          // Broadcast to classroom participants with the public URL
          socket.emit('pdf:share', {
            classroomCode,
            fileName: file.name,
            fileUrl: publicUrl,
            totalPages,
          });
        }

        toast.success(`Shared ${file.name} (${totalPages} pages)`);
      } catch (err: any) {
        toast.error('Failed to load PDF file: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    },
    [isHost, socket, classroomCode, loadPdfDocument]
  );

  // Host action: change page
  const changePage = useCallback(
    (page: number) => {
      if (!pdfState) return;
      if (!isHost) {
        toast.warning('Students cannot change pages. Following host view.');
        return;
      }

      if (page < 1 || page > pdfState.totalPages) return;

      setPdfState((prev) => (prev ? { ...prev, currentPage: page } : null));

      if (socket && socket.connected) {
        // ✅ Backend PageChangeDto expects { page } not { currentPage }
        socket.emit('pdf:page-change', { classroomCode, page });
      }
    },
    [pdfState, isHost, socket, classroomCode]
  );

  const nextPage = useCallback(() => {
    if (pdfState && pdfState.currentPage < pdfState.totalPages) {
      changePage(pdfState.currentPage + 1);
    }
  }, [pdfState, changePage]);

  const prevPage = useCallback(() => {
    if (pdfState && pdfState.currentPage > 1) {
      changePage(pdfState.currentPage - 1);
    }
  }, [pdfState, changePage]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.5, +(z + 0.2).toFixed(1)));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, +(z - 0.2).toFixed(1)));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1.0);
  }, []);

  // Host action: close PDF
  const closePdf = useCallback(() => {
    if (!isHost) return;

    if (pdfState?.fileUrl && pdfState.fileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfState.fileUrl);
    }

    setPdfState(null);
    setPdfDoc(null);

    if (socket && socket.connected) {
      socket.emit('pdf:close', { classroomCode });
    }
  }, [isHost, pdfState, socket, classroomCode]);

  return {
    pdfState,
    loading,
    zoom,
    canvasRef,
    pdfDoc,
    shareLocalPdf,
    changePage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    closePdf,
  };
};
