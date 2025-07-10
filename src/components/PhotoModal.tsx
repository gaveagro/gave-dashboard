
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  description?: string;
  year?: number;
}

const PhotoModal = ({ isOpen, onClose, photoUrl, description, year }: PhotoModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={photoUrl}
            alt={description || 'Foto de parcela'}
            className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
          />
          {(description || year) && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-2 rounded">
              {year && <span className="text-sm font-medium">{year}</span>}
              {description && year && <span className="mx-2">•</span>}
              {description && <span className="text-sm">{description}</span>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoModal;
