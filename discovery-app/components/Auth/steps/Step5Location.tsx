'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Loader2, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface Step5LocationProps {
  formData: {
    locationType: 'exact' | 'approximate';
    city: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  selectedLocationData: {
    city: string;
    country: string;
    code: string;
    lat: number;
    lng: number;
  } | null;
  setSelectedLocationData: React.Dispatch<React.SetStateAction<any>>;
  isCityValid: boolean;
  setIsCityValid: (valid: boolean) => void;
  citySuggestions: { city: string; country: string; code: string; lat: number; lng: number }[];
  setCitySuggestions: React.Dispatch<React.SetStateAction<any>>;
  showCityDropdown: boolean;
  setShowCityDropdown: (show: boolean) => void;
  detectingGps: boolean;
  isGpsDetected: boolean;
  setIsGpsDetected: (detected: boolean) => void;
  handleDetectGpsLocation: () => void;
  handleStep5Next: (e: React.FormEvent) => void;
  renderErrorAlert: () => React.ReactNode;
  setStep: (step: number) => void;
}

export const Step5Location: React.FC<Step5LocationProps> = ({
  formData,
  setFormData,
  selectedLocationData,
  setSelectedLocationData,
  isCityValid,
  setIsCityValid,
  citySuggestions,
  setCitySuggestions,
  showCityDropdown,
  setShowCityDropdown,
  detectingGps,
  isGpsDetected,
  setIsGpsDetected,
  handleDetectGpsLocation,
  handleStep5Next,
  renderErrorAlert,
  setStep,
}) => {
  return (
    <motion.form
      key="step5"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onSubmit={handleStep5Next}
      className="space-y-5"
    >
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">Your location</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Step 5: Choose how you'd like to share your location with potential matches
        </p>
      </div>

      {renderErrorAlert()}

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Location Sharing Privacy
          </label>
          <div className="relative p-1 bg-slate-100 dark:bg-slate-900/90 rounded-2xl flex items-center border border-slate-200/80 dark:border-slate-800 shadow-inner">
            {[
              { id: 'approximate', title: 'Approximate', desc: 'Displays city center only.' },
              { id: 'exact', title: 'Exact Location', desc: 'Allows precise distance matching.' },
            ].map((opt) => {
              const isActive = formData.locationType === opt.id;
              return (
                <motion.button
                  key={opt.id}
                  type="button"
                  initial="rest"
                  whileHover="hover"
                  animate="rest"
                  onClick={() => {
                    setFormData((prev: any) => ({
                      ...prev,
                      locationType: opt.id as 'approximate' | 'exact',
                    }));
                    setShowCityDropdown(false);
                    setIsGpsDetected(false);
                    setSelectedLocationData(null);
                  }}
                  className="relative flex-1 py-3 px-3.5 text-left transition-colors duration-200 z-10 rounded-xl"
                >
                  {isActive && (
                    <motion.div
                      layoutId="locationPrivacyPill"
                      className="absolute inset-0 bg-[#00AAFF] dark:bg-[#B8E7FF] rounded-xl shadow-md"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                        mass: 0.7,
                      }}
                    />
                  )}
                  <motion.div
                    variants={{
                      rest: { scale: 1 },
                      hover: { scale: 1.03 },
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={`relative z-10 space-y-0.5 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-700 dark:text-white'}`}
                  >
                    <div className="font-bold text-xs sm:text-sm">{opt.title}</div>
                    <p
                      className={`text-[10px] sm:text-[11px] leading-snug ${
                        isActive ? 'text-amber-100 dark:text-slate-700 font-semibold' : 'text-slate-500 dark:text-slate-300'
                      }`}
                    >
                      {opt.desc}
                    </p>
                  </motion.div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {formData.locationType === 'approximate'
              ? 'City Name & Country Code'
              : 'GPS Live Location Detector'}
          </label>

          {formData.locationType === 'exact' ? (
            <button
              type="button"
              onClick={handleDetectGpsLocation}
              disabled={detectingGps || isGpsDetected || Boolean(selectedLocationData?.lat)}
              className={`w-full h-[46px] px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border shadow-sm ${
                detectingGps || isGpsDetected || Boolean(selectedLocationData?.lat)
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 opacity-90 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600 shadow-rose-600/20 active:scale-95 cursor-pointer'
              }`}
            >
              {detectingGps ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Detecting exact GPS coordinates...
                </>
              ) : isGpsDetected || selectedLocationData?.lat ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Location Detected: {formData.city}
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 text-white animate-bounce" />
                  Detect Current Location via GPS
                </>
              )}
            </button>
          ) : (
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none z-10" />
              <input
                type="text"
                required={formData.locationType === 'approximate'}
                value={formData.city}
                onChange={(e) => {
                  setFormData((prev: any) => ({ ...prev, city: e.target.value }));
                  setIsCityValid(false);
                }}
                onFocus={() => {
                  if (
                    formData.locationType === 'approximate' &&
                    citySuggestions.length > 0 &&
                    !formData.city.includes(',')
                  ) {
                    setShowCityDropdown(true);
                  }
                }}
                placeholder="Type city name (e.g. Vienna, London)..."
                className="w-full h-[46px] pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00AAFF] transition-all"
              />

              {/* OpenFreeMap / Photon Geocoding City Autocomplete Dropdown */}
              <AnimatePresence>
                {showCityDropdown &&
                  formData.locationType === 'approximate' &&
                  citySuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 bottom-full mb-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 max-h-44 overflow-y-auto p-1.5 space-y-0.5 ring-1 ring-slate-900/5"
                    >
                      {citySuggestions.map((item, idx) => (
                        <button
                          key={`${item.city}-${item.code}-${idx}`}
                          type="button"
                          onClick={() => {
                            const selectedCityStr = `${item.city}, ${item.code}`;
                            setFormData((prev: any) => ({ ...prev, city: selectedCityStr }));
                            setSelectedLocationData({
                              city: item.city,
                              country: item.country,
                              code: item.code,
                              lat: item.lat,
                              lng: item.lng,
                            });
                            setIsCityValid(true);
                            setCitySuggestions([]);
                            setShowCityDropdown(false);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-700 text-left flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors group cursor-pointer"
                        >
                          <span className="flex items-center gap-2 group-hover:text-blue-900 dark:group-hover:text-blue-300 font-bold">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
                            {item.city}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 font-extrabold text-[10px] rounded-md border border-blue-100 dark:border-slate-600 shrink-0">
                            {item.code}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(4)}
          className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="submit"
          disabled={
            detectingGps ||
            (formData.locationType === 'exact'
              ? !isGpsDetected
              : !isCityValid || !formData.city.trim())
          }
          className="flex-1 py-3.5 px-4 bg-[#00AAFF] hover:bg-[#0088CC] dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] text-white dark:text-slate-900 font-extrabold text-sm rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Continue to Photos
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.form>
  );
};
