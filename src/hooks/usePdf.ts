import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import api, { getApiBaseUrl } from '@/lib/api';
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

  // Student following & sync state
  const [hostCurrentPage, setHostCurrentPage] = useState<number>(initialPdf?.currentPage || 1);
  const [isFollowingHost, setIsFollowingHost] = useState<boolean>(true);
  const isFollowingHostRef = useRef<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document into memory reliably from ArrayBuffer, File, Blob, or URL string
  const loadPdfDocument = useCallback(async (source: File | Blob | ArrayBuffer | string) => {
    try {
      setLoading(true);
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }

      let arrayBuffer: ArrayBuffer;
      if (source instanceof ArrayBuffer) {
        arrayBuffer = source;
      } else if (source instanceof Blob) {
        arrayBuffer = await source.arrayBuffer();
      } else if (typeof source === 'string') {
        let fetchUrl = source;
        if (fetchUrl.startsWith('/uploads')) {
          fetchUrl = `${getApiBaseUrl()}${fetchUrl}`;
        }

        try {
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            throw new Error(`HTTP error ${response.status} fetching PDF file`);
          }
          arrayBuffer = await response.arrayBuffer();
        } catch (fetchErr: any) {
          // If fetch fails on absolute URL, fallback to getApiBaseUrl if it's an uploaded PDF
          if (fetchUrl.includes('/uploads/pdf/')) {
            const rel = '/uploads/pdf/' + fetchUrl.split('/uploads/pdf/')[1];
            const fallbackRes = await fetch(`${getApiBaseUrl()}${rel}`);
            if (!fallbackRes.ok) throw fetchErr;
            arrayBuffer = await fallbackRes.arrayBuffer();
          } else {
            throw fetchErr;
          }
        }
      } else {
        throw new Error('Unsupported PDF source');
      }

      // Clone arrayBuffer slice because PDF.js transfers the buffer to the web worker
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
      const doc = await loadingTask.promise;

      setPdfDoc(doc);

      // Always update totalPages from the verified PDF document
      setPdfState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          totalPages: doc.numPages,
        };
      });

      return doc.numPages;
    } catch (err: any) {
      console.warn('Could not load PDF binary:', err?.message || err);
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
      setHostCurrentPage(initialPdf.currentPage || 1);
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
        setHostCurrentPage(incomingPdf.currentPage || 1);
        setIsFollowingHost(true);
        isFollowingHostRef.current = true;
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

      setHostCurrentPage(newPage);
      setPdfState((prev) => {
        if (!prev) return null;
        // If following host, or if host themselves, follow the change
        if (isFollowingHostRef.current || isHost) {
          return { ...prev, currentPage: newPage };
        }
        return prev;
      });
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

        // Read ArrayBuffer directly on main thread to guarantee PDF.js worker never fails fetch
        const arrayBuffer = await file.arrayBuffer();
        const totalPages = (await loadPdfDocument(arrayBuffer)) || 1;

        const objectUrl = URL.createObjectURL(file);

        // Full local state with instant verified page count
        const newPdf: PdfState = {
          fileName: file.name,
          fileUrl: objectUrl,
          totalPages,
          currentPage: 1,
          scale: 1.0,
        };

        setPdfState(newPdf);
        setHostCurrentPage(1);
        setIsFollowingHost(true);
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
          } else if (resData?.relativePath) {
            publicUrl = `${getApiBaseUrl()}${resData.relativePath}`;
          }
        } catch (uploadErr: any) {
          console.error('PDF upload to server failed:', uploadErr);
          toast.error('Warning: Server upload failed. Students may not be able to download the slides.');
        }

        if (socket && socket.connected) {
          // Broadcast to classroom participants with the public URL and verified totalPages
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

  // Change page: host broadcasts; students can browse and re-sync
  const changePage = useCallback(
    (page: number) => {
      if (!pdfState) return;

      if (page < 1 || page > pdfState.totalPages) return;

      if (isHost) {
        setPdfState((prev) => (prev ? { ...prev, currentPage: page } : null));
        setHostCurrentPage(page);

        if (socket && socket.connected) {
          socket.emit('pdf:page-change', { classroomCode, page });
        }
      } else {
        // Students can navigate independently
        setPdfState((prev) => (prev ? { ...prev, currentPage: page } : null));
        const following = page === hostCurrentPage;
        setIsFollowingHost(following);
        isFollowingHostRef.current = following;
      }
    },
    [pdfState, isHost, socket, classroomCode, hostCurrentPage]
  );

  // Student action: snap back to host's slide
  const syncWithHost = useCallback(() => {
    if (!pdfState || isHost) return;
    setPdfState((prev) => (prev ? { ...prev, currentPage: hostCurrentPage } : null));
    setIsFollowingHost(true);
    isFollowingHostRef.current = true;
    toast.info(`Synced to host slide (${hostCurrentPage})`);
  }, [pdfState, isHost, hostCurrentPage]);

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
    setZoom((z) => Math.min(3.0, +(z + 0.25).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
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
    hostCurrentPage,
    isFollowingHost,
    syncWithHost,
    loadPdfDocument,
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
