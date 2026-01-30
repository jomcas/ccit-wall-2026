import React, { useEffect, useCallback } from 'react';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const hasMultiple = images.length > 1;

  const handlePrevious = useCallback(() => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onNavigate(newIndex);
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onNavigate(newIndex);
  }, [currentIndex, images.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasMultiple) handlePrevious();
          break;
        case 'ArrowRight':
          if (hasMultiple) handleNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scrolling when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, hasMultiple, handlePrevious, handleNext, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="lightbox-overlay" onClick={handleBackdropClick}>
      {/* Close button */}
      <button className="lightbox-close" onClick={onClose} aria-label="Close">
        <FiX size={24} />
      </button>

      {/* Previous button */}
      {hasMultiple && (
        <button
          className="lightbox-nav lightbox-prev"
          onClick={handlePrevious}
          aria-label="Previous image"
        >
          <FiChevronLeft size={32} />
        </button>
      )}

      {/* Image container */}
      <div className="lightbox-content">
        <img
          src={images[currentIndex]}
          alt={`Attachment ${currentIndex + 1} of ${images.length}`}
          className="lightbox-image"
        />
        
        {/* Image counter */}
        {hasMultiple && (
          <div className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Next button */}
      {hasMultiple && (
        <button
          className="lightbox-nav lightbox-next"
          onClick={handleNext}
          aria-label="Next image"
        >
          <FiChevronRight size={32} />
        </button>
      )}

      {/* Thumbnail dots for navigation */}
      {hasMultiple && (
        <div className="lightbox-dots">
          {images.map((_, index) => (
            <button
              key={index}
              className={`lightbox-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => onNavigate(index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
