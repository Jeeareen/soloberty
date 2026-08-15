'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, ImageIcon, Camera, ArrowRight, ArrowLeft, X } from 'lucide-react';

interface Step6PhotoUploadProps {
  profilePhotoPreview: string | null;
  handleProfilePhotoFile: (file: File) => void;
  handleProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveProfilePhoto: () => void;
  renderErrorAlert?: () => React.ReactNode;
  setStep: (step: number) => void;
}

export const Step6PhotoUpload: React.FC<Step6PhotoUploadProps> = ({
  profilePhotoPreview,
  handleProfilePhotoFile,
  handleProfilePhotoChange,
  handleRemoveProfilePhoto,
  renderErrorAlert,
  setStep,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent window default drag & drop behavior to stop browser from opening files in new tab
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

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
      const droppedFile = e.dataTransfer.files[0];
      handleProfilePhotoFile(droppedFile);
    }
  };

  // Open WebRTC Camera stream modal (or fallback to native camera file input on mobile)
  const openCamera = async () => {
    setCameraError(null);
    setIsCameraStarting(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraInputRef.current?.click();
        setIsCameraStarting(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      setShowCameraModal(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err: any) {
      console.warn('WebRTC Camera access error:', err);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setCameraError('Camera access denied or unavailable. Please upload a photo instead.');
      }
    } finally {
      setIsCameraStarting(false);
    }
  };

  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setShowCameraModal(false);
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        handleProfilePhotoFile(file);
        stopCameraStream();
      }
    }, 'image/jpeg', 0.92);
  };

  return (
    <motion.div
      key="step6"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col justify-end h-full select-none"
    >
      {/* Top Header pushed down against dropzone box */}
      <div className="space-y-1 shrink-0 mt-auto mb-3">
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Upload your profile photo</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Step 6: Choose a clear photo of yourself for your main match card
        </p>
      </div>

      {renderErrorAlert && <div className="shrink-0 mb-2">{renderErrorAlert()}</div>}

      {/* Middle Fixed Dropzone Box pulled down tight against bottom navigation buttons */}
      <div className="w-full h-[250px] min-h-[250px] max-h-[250px] border-2 border-dashed border-slate-200 bg-slate-50 rounded-3xl relative flex flex-col items-center justify-between p-4 shrink-0 transition-colors duration-150 mb-3">
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full h-full flex flex-col items-center justify-between transition-colors duration-150 rounded-2xl ${
            isDragging ? 'bg-blue-50/80 border-blue-500' : ''
          }`}
        >
          {profilePhotoPreview ? (
            <div className="flex flex-col items-center justify-between h-full w-full py-1">
              {/* Upper Avatar Preview Frame */}
              <div className="flex items-center justify-center h-[140px] w-full relative shrink-0">
                <div className="relative group">
                  <img
                    src={profilePhotoPreview}
                    alt="Profile Preview"
                    className="w-28 h-28 object-cover rounded-full border-4 border-blue-500/20 shadow-lg"
                  />
                  {/* Red Circular Delete/Cancel Button on Top Right */}
                  <button
                    type="button"
                    onClick={handleRemoveProfilePhoto}
                    className="absolute top-0 right-0 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-transform active:scale-90 shadow-md cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-center gap-3 w-full max-w-sm h-[44px] shrink-0">
                <label
                  htmlFor="profilePhotoInput"
                  className="flex-1 h-[42px] bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
                >
                  <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                  Upload File
                </label>

                <button
                  type="button"
                  onClick={openCamera}
                  disabled={isCameraStarting}
                  className="flex-1 h-[42px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-center"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  Shoot Picture with Cam
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between h-full w-full py-1 text-center">
              {/* Upper Empty Dropzone Area */}
              <div className="flex flex-col items-center justify-center h-[140px] w-full space-y-2 shrink-0">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm">
                  <ImageIcon className="w-7 h-7" />
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-700">
                    <label htmlFor="profilePhotoInput" className="text-blue-600 hover:underline cursor-pointer">
                      Click to upload
                    </label>{' '}
                    or drag and drop your photo here
                  </p>
                  <p className="text-[11px] text-slate-400">JPG, PNG or WEBP (Max 5MB)</p>
                </div>
              </div>

              {/* Upload & Camera Buttons Row */}
              <div className="flex items-center justify-center gap-3 w-full max-w-sm h-[44px] shrink-0">
                <label
                  htmlFor="profilePhotoInput"
                  className="flex-1 h-[42px] bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 text-center"
                >
                  <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                  Upload File
                </label>

                <button
                  type="button"
                  onClick={openCamera}
                  disabled={isCameraStarting}
                  className="flex-1 h-[42px] bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-center"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  Shoot Picture with Cam
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Input for Device Upload */}
          <input
            id="profilePhotoInput"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleProfilePhotoChange}
            className="hidden"
          />

          {/* Hidden Native Camera Input for Mobile Fallback */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleProfilePhotoChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Bottom Navigation Buttons (User can continue even if no profile photo is selected) */}
      <div className="flex gap-3 pt-2 shrink-0">
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
          className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          {profilePhotoPreview ? 'Continue to Interest Images' : 'Skip / Continue to Interest Images'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Camera Stream WebRTC Modal Overlay */}
      <AnimatePresence>
        {showCameraModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl flex flex-col items-center space-y-4 border border-slate-100"
            >
              <div className="flex items-center justify-between w-full pb-1 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  Capture Profile Photo
                </span>
                <button
                  type="button"
                  onClick={stopCameraStream}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Close camera"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {cameraError ? (
                <div className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 text-center w-full">
                  {cameraError}
                </div>
              ) : (
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-blue-500/30 bg-slate-900 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full pointer-events-none" />
                </div>
              )}

              {/* Single Full-Width Capture Photo Button */}
              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={capturePhotoFromCamera}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
