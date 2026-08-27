'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, X, Loader2, Check, ArrowLeft, Ban, AlertCircle } from 'lucide-react';

interface Step7InterestPhotosProps {
  interestPreviews: string[];
  handleInterestImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeInterestImage: (index: number) => void;
  handleFinishProfile: () => Promise<void>;
  uploadingPhotos: boolean;
  renderErrorAlert: () => React.ReactNode;
  setStep: (step: number) => void;
}

export const Step7InterestPhotos: React.FC<Step7InterestPhotosProps> = ({
  interestPreviews,
  handleInterestImagesChange,
  removeInterestImage,
  handleFinishProfile,
  uploadingPhotos,
  renderErrorAlert,
  setStep,
}) => {
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setImagesError('Images must be JPG, PNG, or WEBP format.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImagesError('Each image size must be less than 5MB.');
        return;
      }
    }
    setImagesError(null);

    try {
      const dt = new DataTransfer();
      fileArray.forEach((f) => dt.items.add(f));
      const syntheticEvent = {
        target: { files: dt.files },
      } as React.ChangeEvent<HTMLInputElement>;
      handleInterestImagesChange(syntheticEvent);
    } catch {
      // Fallback if DataTransfer constructor unavailable
    }
  };

  const onChangeImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  return (
    <motion.div
      key="step7"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col justify-start space-y-3"
    >
      <div className="space-y-1.5 shrink-0 mb-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">Interest images</h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#B8E7FF]/40 dark:bg-[#B8E7FF]/20 text-[#0088CC] dark:text-[#B8E7FF] border border-[#B8E7FF]/60 dark:border-[#B8E7FF]/30">
            {interestPreviews.length} / 3 images
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Step 7: Add up to 3 optional images that represent your lifestyle or hobbies
        </p>

        {renderErrorAlert()}
      </div>

      <div className="space-y-2 pt-[45px] shrink-0">
        <label htmlFor="interestImagesInput" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Upload Photos (Max 3)
        </label>

        <div
          id="interest-images-container"
          aria-describedby={imagesError ? 'interest-images-error' : undefined}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`grid grid-cols-3 gap-3 p-2 rounded-2xl transition-all border-2 border-dashed ${
            imagesError
              ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20'
              : isDragging
              ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
          }`}
        >
          {interestPreviews.map((url, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group shadow-sm">
              <img src={url} alt={`Interest ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (!uploadingPhotos) {
                    removeInterestImage(idx);
                    setImagesError(null);
                  }
                }}
                disabled={uploadingPhotos}
                className={`absolute top-1.5 right-1.5 p-1 text-white rounded-full transition-all shadow-md ${
                  uploadingPhotos
                    ? 'bg-slate-400/90 cursor-not-allowed opacity-80'
                    : 'bg-rose-600 hover:bg-rose-500 active:scale-90 cursor-pointer'
                }`}
                title={uploadingPhotos ? 'Cannot remove image while saving profile' : 'Remove image'}
              >
                {uploadingPhotos ? (
                  <Ban className="w-3.5 h-3.5 text-white" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}

          {interestPreviews.length < 3 && (
            <label
              htmlFor="interestImagesInput"
              className={`aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 flex flex-col items-center justify-center transition-all p-2 text-center ${
                uploadingPhotos
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-[#00AAFF] cursor-pointer'
              }`}
            >
              <Upload className="w-5 h-5 text-[#00AAFF] mb-1" />
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Add / Drop Photo</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">Max 5MB</span>
            </label>
          )}
        </div>

        {imagesError && (
          <p
            id="interest-images-error"
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1.5"
            role="alert"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            <span>{imagesError}</span>
          </p>
        )}

        <input
          id="interestImagesInput"
          type="file"
          multiple
          disabled={uploadingPhotos}
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={imagesError ? 'interest-images-error' : undefined}
          aria-invalid={Boolean(imagesError)}
          onChange={onChangeImages}
          className="hidden"
        />
      </div>

      <div className="flex gap-3 pt-2 mt-auto shrink-0">
        <button
          type="button"
          onClick={() => setStep(6)}
          disabled={uploadingPhotos}
          className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleFinishProfile}
          disabled={uploadingPhotos}
          className="flex-1 py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
        >
          {uploadingPhotos ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Complete Registration
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
