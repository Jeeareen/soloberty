'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Upload, X, Loader2, Check, ArrowLeft, Ban } from 'lucide-react';

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
  return (
    <motion.div
      key="step7"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Interest images</h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {interestPreviews.length} / 3 images
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500">
          Step 7: Upload up to 3 photos showing your hobbies, lifestyle, or activities
        </p>
      </div>

      {renderErrorAlert()}

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {interestPreviews.map((url, idx) => (
            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group shadow-sm">
              <img src={url} alt={`Interest ${idx + 1}`} className="w-full h-full object-cover" />
              {/* Delete button disabled with Ban / slash cursor while profile saving */}
              <button
                type="button"
                onClick={() => !uploadingPhotos && removeInterestImage(idx)}
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
              className={`aspect-square rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center transition-all p-2 text-center ${
                uploadingPhotos
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-blue-500 cursor-pointer'
              }`}
            >
              <Upload className="w-5 h-5 text-blue-600 mb-1" />
              <span className="text-[11px] font-bold text-slate-700">Add Photo</span>
              <span className="text-[9px] text-slate-400">Max 5MB</span>
            </label>
          )}
        </div>

        <input
          id="interestImagesInput"
          type="file"
          multiple
          disabled={uploadingPhotos}
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInterestImagesChange}
          className="hidden"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(6)}
          disabled={uploadingPhotos}
          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={handleFinishProfile}
          disabled={uploadingPhotos}
          className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadingPhotos ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving profile...
            </>
          ) : (
            <>
              Launch Soloberty
              <Check className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};
