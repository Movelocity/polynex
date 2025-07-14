import { useState, useCallback } from 'react';
import { fileService } from '@/services';

interface Position {
  x: number;
  y: number;
}

export function useImagePreview() {
  const [filePreview, setFilePreview] = useState<string>('');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [lastTouchCenter, setLastTouchCenter] = useState<Position>({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  const calculateInitialZoom = (imgWidth: number, imgHeight: number, containerWidth: number, containerHeight: number) => {
    const scaleX = (containerWidth * 0.9) / imgWidth;
    const scaleY = (containerHeight * 0.9) / imgHeight;
    return Math.min(scaleX, scaleY, 1);
  };

  const previewImage = (fileUrl: string) => {
    const resolvedUrl = fileService.resolveFileUrl(fileUrl);
    setFilePreview(resolvedUrl);
    setShowFilePreview(true);
    setPosition({ x: 0, y: 0 });
    setImageDimensions(null);
    setContainerDimensions(null);
    
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      
      if (containerDimensions) {
        const initialZoom = calculateInitialZoom(img.width, img.height, containerDimensions.width, containerDimensions.height);
        setZoomLevel(initialZoom);
      } else {
        setZoomLevel(1);
      }
    };
    img.src = resolvedUrl;
  };

  const updateContainerSize = useCallback((width: number, height: number) => {
    setContainerDimensions(prevContainer => {
      if (prevContainer?.width === width && prevContainer?.height === height) {
        return prevContainer;
      }
      
      const newContainer = { width, height };
      
      setImageDimensions(prevImage => {
        if (prevImage && !prevContainer) {
          const initialZoom = calculateInitialZoom(prevImage.width, prevImage.height, width, height);
          setZoomLevel(initialZoom);
        }
        return prevImage;
      });
      
      return newContainer;
    });
  }, []);

  const handleZoom = (delta: number, event?: React.WheelEvent) => {
    const minZoom = 0.5;
    const newZoom = Math.max(minZoom, Math.min(5, zoomLevel + delta));
    setZoomLevel(newZoom);
    
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = event.clientX - rect.left - rect.width / 2;
      const centerY = event.clientY - rect.top - rect.height / 2;
      
      setPosition(prev => ({
        x: prev.x - centerX * (delta / zoomLevel),
        y: prev.y - centerY * (delta / zoomLevel)
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetViewer = () => {
    if (imageDimensions && containerDimensions) {
      const initialZoom = calculateInitialZoom(imageDimensions.width, imageDimensions.height, containerDimensions.width, containerDimensions.height);
      setZoomLevel(initialZoom);
    } else {
      setZoomLevel(1);
    }
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const closePreview = () => {
    setShowFilePreview(false);
    resetViewer();
  };

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    } else if (e.touches.length === 2) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    } else if (e.touches.length === 2 && lastTouchDistance > 0) {
      const distance = getDistance(e.touches[0], e.touches[1]);
      const center = getCenter(e.touches[0], e.touches[1]);
      
      const scale = distance / lastTouchDistance;
      const minZoom = 0.5;
      const newZoom = Math.max(minZoom, Math.min(5, zoomLevel * scale));
      
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = center.x - rect.left - rect.width / 2;
      const centerY = center.y - rect.top - rect.height / 2;
      
      setZoomLevel(newZoom);
      setPosition(prev => ({
        x: prev.x - centerX * (scale - 1),
        y: prev.y - centerY * (scale - 1)
      }));
      
      setLastTouchDistance(distance);
      setLastTouchCenter(center);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  return {
    filePreview,
    showFilePreview,
    zoomLevel,
    isDragging,
    position,
    previewImage,
    handleZoom,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetViewer,
    closePreview,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    updateContainerSize,
    imageDimensions,
    containerDimensions
  };
}