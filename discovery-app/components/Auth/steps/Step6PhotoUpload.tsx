'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Upload, ImageIcon, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step6PhotoUploadProps {
  profilePhotoPreview: string | null;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setStep: (step: number) => void;
}

export const Step6PhotoUpload: React.FC<Step6PhotoUploadProps> = ({
  profilePhotoPreview,
  handleProfilePhotoChange,
  setStep,
}) => {
  return (
    <motion.div
      key="step6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Upload your profile photo</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Step 6: Choose a clear photo of yourself for your main match card
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 rounded-3xl transition-all relative">
          {profilePhotoPreview ? (
            <div className="relative group">
              <img
                src={profilePhotoPreview}
                alt="Profile Preview"
                className="w-32 h-32 object-cover rounded-full border-4 border-blue-500/20 shadow-lg"
              />
              <label
                htmlFor="profilePhotoInput"
                className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full cursor-pointer shadow-lg transition-transform active:scale-90"
                title="Change photo"
              >
                <Upload className="w-4 h-4" />
              </label>
            </div>
          ) : (
            <label
              htmlFor="profilePhotoInput"
              className="flex flex-col items-center justify-center cursor-pointer space-y-3 py-4 w-full"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <ImageIcon className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-blue-600 hover:underline">
                  Click to upload
                </span>{' '}
                <span className="text-xs text-slate-500">or drag and drop</span>
                <p className="text-[11px] text-slate-400">JPG, PNG or WEBP (Max 5MB)</p>
              </div>
            </label>
          )}

          <input
            id="profilePhotoInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleProfilePhotoChange}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(5)}
          className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(7)}
          className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
        >
          Continue to Interest Images
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
