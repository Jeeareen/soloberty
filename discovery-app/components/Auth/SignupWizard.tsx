'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/hooks/useAuth';
import { PREDEFINED_INTERESTS, type UserProfile } from '../../types/user';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { db, auth } from '../../lib/firebase/config';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { Sparkles, AlertCircle, LogIn, RefreshCw, Check, Loader2 } from 'lucide-react';

import { Step1Credentials } from './steps/Step1Credentials';
import { Step2BasicInfo } from './steps/Step2BasicInfo';
import { Step3Interests } from './steps/Step3Interests';
import { Step4BioScout, getBioCharCount } from './steps/Step4BioScout';
import { Step5Location } from './steps/Step5Location';
import { Step6PhotoUpload } from './steps/Step6PhotoUpload';
import { Step7InterestPhotos } from './steps/Step7InterestPhotos';

export const SignupWizard: React.FC = () => {
  const router = useRouter();
  const { signup, loading: authLoading, refreshProfileStatus } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [error, setErrorState] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [emailExists, setEmailExists] = useState<boolean>(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  // Live countdown timer for automatic login page redirection
  useEffect(() => {
    if (redirectCountdown === null) return;
    if (redirectCountdown <= 0) {
      router.push('/auth/login');
      return;
    }

    const timer = setTimeout(() => {
      setRedirectCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [redirectCountdown, router]);

  const setError = (msg: string | null) => {
    setErrorState(msg);
    if (msg !== null) {
      setErrorKey((prev) => prev + 1);
    }
  };

  // Form State across wizard steps
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    age: number | '';
    gender: 'male' | 'female' | 'other';
    interests: string[];
    bio: string;
    locationType: 'exact' | 'approximate';
    city: string;
    profilePhotoUrl: string;
    interestImageUrls: string[];
  }>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    age: '',
    gender: 'male',
    interests: [],
    bio: '',
    locationType: 'approximate',
    city: '',
    profilePhotoUrl: '',
    interestImageUrls: [],
  });

  // Step 5: City Autocomplete Suggestions (OpenFreeMap / Server API Geocoding)
  const [citySuggestions, setCitySuggestions] = useState<
    { city: string; country: string; code: string; lat: number; lng: number }[]
  >([]);
  const [selectedLocationData, setSelectedLocationData] = useState<{
    city: string;
    country: string;
    code: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [isCityValid, setIsCityValid] = useState<boolean>(false);
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);
  const [isGpsDetected, setIsGpsDetected] = useState<boolean>(false);

  useEffect(() => {
    const query = formData.city.trim();
    if (!query || query.length < 2 || formData.locationType !== 'approximate' || query.includes(',')) {
      setCitySuggestions([]);
      setShowCityDropdown(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setCitySuggestions(data.suggestions);
            setShowCityDropdown(data.suggestions.length > 0);
          }
        }
      } catch (err) {
        // Silently ignore aborts or network timeouts
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.city, formData.locationType]);

  // Step 1 Submission: Validate email/password locally and verify email isn't already registered
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let isRegistered = false;

      // Check Firebase Auth sign-in methods for email
      try {
        const methods = await fetchSignInMethodsForEmail(auth, trimmedEmail);
        if (methods && methods.length > 0) {
          isRegistered = true;
        }
      } catch (authErr) {
        // Silently ignore auth methods query errors (e.g. domain restriction)
      }

      // Also check Firestore users collection for existing email
      if (!isRegistered) {
        const userQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail));
        const querySnapshot = await getDocs(userQuery);
        if (!querySnapshot.empty) {
          isRegistered = true;
        }
      }

      if (isRegistered) {
        setEmailExists(true);
        setError(null);
        setRedirectCountdown(3);
        return;
      }

      setEmailExists(false);
      setRedirectCountdown(null);
      setStep(2);
    } catch (err: any) {
      console.error('Email verification error:', err);
      setEmailExists(false);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 Submission: Basic Info
  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (typeof formData.age !== 'number' || formData.age < 18 || formData.age > 130) {
      setError('Age must be between 18 and 130 years old.');
      return;
    }

    setError(null);
    setStep(3);
  };

  // Step 3 Submission: Interests
  const handleStep3Next = () => {
    setError(null);
    if (formData.interests.length === 0 || formData.interests.length > 3) {
      setError('Please select at least 1 interest (up to 3) to proceed.');
      return;
    }
    setStep(4);
  };

  // Step 4: Soloberty Scout Bio Auto-Generation
  const [generatingBio, setGeneratingBio] = useState<boolean>(false);

  const handleGenerateBio = async () => {
    setError(null);
    setGeneratingBio(true);

    const selectedInterestNames = PREDEFINED_INTERESTS
      .filter((i) => formData.interests.includes(i.id))
      .map((i) => i.name)
      .join(', ');

    try {
      const response = await fetch('/api/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name || 'a member',
          interests: selectedInterestNames,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate bio with Scout');
      }

      const data = await response.json();
      const cleanedText = (data.bio || '').trim().slice(0, 300);

      if (cleanedText.length >= 30) {
        setFormData((prev) => ({ ...prev, bio: cleanedText }));
      } else {
        throw new Error('Generated bio was too short');
      }
    } catch (err: any) {
      console.error('[Scout Bio Generation Error]:', err);
      throw err; // Propagate to ScoutBioButton so only the button displays the error micro-interaction
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleStep4Next = () => {
    const charCount = getBioCharCount(formData.bio);
    if (charCount < 30) {
      setError('Bio must be at least 30 characters long (excluding spaces).');
      return;
    }
    if (charCount > 300) {
      setError('Bio must be at most 300 characters long.');
      return;
    }
    setError(null);
    setStep(5);
  };

  // Step 6 & 7: Photo upload states
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [interestFiles, setInterestFiles] = useState<File[]>([]);
  const [interestPreviews, setInterestPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean>(false);

  const handleProfilePhotoFile = (file: File) => {
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Profile photo must be JPG, PNG, or WEBP format.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo size must be less than 5MB.');
      return;
    }

    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProfilePhotoFile(file);
  };

  const handleRemoveProfilePhoto = () => {
    setError(null);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
  };

  const handleInterestImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of selectedFiles) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setError('Images must be JPG, PNG, or WEBP format.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Each image size must be less than 5MB.');
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    const updatedFiles = [...interestFiles, ...validFiles].slice(0, 3);
    const updatedPreviews = [...interestPreviews, ...validPreviews].slice(0, 3);

    setInterestFiles(updatedFiles);
    setInterestPreviews(updatedPreviews);
  };

  const removeInterestImage = (index: number) => {
    setInterestFiles((prev) => prev.filter((_, i) => i !== index));
    setInterestPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Step 5: Detect GPS Location via HTML5 Geolocation + Reverse Geocoding
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  const handleDetectGpsLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setError(null);
    setDetectingGps(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'SolobertyApp/1.0 (contact@soloberty.app)',
                'Accept-Language': 'en',
              },
            }
          );

          let cityName = 'Current Location';
          let countryCode = 'GPS';
          let countryName = '';

          if (res.ok) {
            const data = await res.json();
            if (data && data.address) {
              const addr = data.address;
              cityName =
                addr.city ||
                addr.town ||
                addr.village ||
                addr.municipality ||
                addr.county ||
                'Detected Location';
              countryCode = (addr.country_code || '').toUpperCase();
              countryName = addr.country || '';
            }
          }

          const fullCityStr = countryCode ? `${cityName}, ${countryCode}` : cityName;
          setFormData((prev) => ({ ...prev, city: fullCityStr }));
          setSelectedLocationData({
            city: cityName,
            country: countryName,
            code: countryCode,
            lat: latitude,
            lng: longitude,
          });
          setIsCityValid(true);
          setIsGpsDetected(true);
        } catch (err) {
          const fullCityStr = `GPS (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
          setFormData((prev) => ({ ...prev, city: fullCityStr }));
          setSelectedLocationData({
            city: 'GPS Location',
            country: '',
            code: 'GPS',
            lat: latitude,
            lng: longitude,
          });
          setIsCityValid(true);
          setIsGpsDetected(true);
        } finally {
          setDetectingGps(false);
        }
      },
      (err) => {
        console.warn('GPS location error:', err);
        setError('Location permission denied or unavailable. Please enable GPS permissions.');
        setDetectingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleStep5Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.locationType === 'exact' && !isGpsDetected) {
      setError('Please click "Detect Current Location via GPS" to grab your coordinates.');
      return;
    }
    if (formData.locationType === 'approximate' && (!isCityValid || !formData.city.trim())) {
      setError('Please select a valid city from the upward dropdown menu.');
      return;
    }
    setError(null);
    setStep(6);
  };

  // Final Submission: Save full UserProfile to Firestore
  const handleFinishProfile = async () => {
    setError(null);
    setSuccessMessage(null);
    setUploadingPhotos(true);

    try {
      // 1. Create account in Firebase Auth only when user completes registration
      let currentUid = auth.currentUser?.uid;
      if (!currentUid) {
        const newUser = await signup(formData.email.trim(), formData.password);
        currentUid = newUser.uid;
      }

      // Upload Profile Photo directly to Cloudinary with scoped folder
      let profilePhotoUrl = '';
      let profilePhotoPublicId = '';
      if (profilePhotoFile) {
        try {
          const res = await uploadToCloudinary(profilePhotoFile, `users/${currentUid}/avatar`);
          profilePhotoUrl = res.secure_url;
          profilePhotoPublicId = res.public_id;
        } catch (cErr: any) {
          console.error('Cloudinary profile photo upload failed:', cErr);
          throw new Error(cErr?.message || 'Failed to upload profile photo to Cloudinary.');
        }
      }

      // Upload Interest Photos directly to Cloudinary with scoped folder and slotted model
      let interestImagesData: Array<{ slot: number; url: string; publicId: string; uploadedAt: string }> = [];
      if (interestFiles.length > 0) {
        try {
          const uploadResults = await Promise.all(
            interestFiles.slice(0, 3).map((file) => uploadToCloudinary(file, `users/${currentUid}/interests`))
          );
          interestImagesData = uploadResults.map((res, idx) => ({
            slot: idx + 1,
            url: res.secure_url,
            publicId: res.public_id,
            uploadedAt: new Date().toISOString(),
          }));
        } catch (cErr: any) {
          console.error('Cloudinary interest images upload failed:', cErr);
          throw new Error(cErr?.message || 'Failed to upload interest images to Cloudinary.');
        }
      }

      // Compile complete UserProfile object
      const fullProfile: UserProfile = {
        uid: currentUid,
        email: formData.email.trim() || auth.currentUser?.email || '',
        profileCompleted: true,
        name: formData.name || 'Soloberty User',
        age: typeof formData.age === 'number' ? formData.age : 25,
        gender: formData.gender,
        bio: formData.bio || 'Excited to explore new social connections on Soloberty!',
        interests: formData.interests,
        location: {
          type: formData.locationType,
          city: formData.city || 'Vienna, AT',
          coordinates: {
            lat: selectedLocationData?.lat || (formData.locationType === 'exact' ? 48.2082 : 0),
            lng: selectedLocationData?.lng || (formData.locationType === 'exact' ? 16.3738 : 0),
          },
        },
        avatarUrl: profilePhotoUrl,
        avatarPublicId: profilePhotoPublicId,
        profilePhoto: {
          url: profilePhotoUrl,
          publicId: profilePhotoPublicId,
          uploadedAt: new Date().toISOString(),
        },
        interestImages: interestImagesData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', currentUid), fullProfile, { merge: true });

      // Refresh auth context profile completion status
      if (refreshProfileStatus) {
        await refreshProfileStatus();
      }

      // Show success feedback confirmation and redirect to feed
      setSuccessMessage('Profile created! Welcome to Soloberty. Redirecting to your feed...');
      setTimeout(() => {
        router.push('/feed');
      }, 1500);
    } catch (err: any) {
      console.error('Final profile save error:', err);
      let errMsg = err?.message || 'Failed to complete profile registration. Please try again.';
      if (errMsg.includes('email-already-in-use')) {
        errMsg = 'This email address is already registered. Please log in or use a different email.';
        setStep(1);
      }
      setError(errMsg);
      setUploadingPhotos(false);
      return;
    }
  };

  // Interest selection handler (toggle exactly 3)
  const toggleInterest = (id: string) => {
    setError(null);
    setFormData((prev) => {
      const exists = prev.interests.includes(id);
      if (exists) {
        return { ...prev, interests: prev.interests.filter((i) => i !== id) };
      }
      if (prev.interests.length >= 3) {
        return prev;
      }
      return { ...prev, interests: [...prev.interests, id] };
    });
  };

  const renderErrorAlert = () => (
    <div className="min-h-[50px] flex items-center justify-center w-full">
      <AnimatePresence mode="wait">
        {successMessage ? (
          <motion.div
            key="successAlert"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/60 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 font-bold shadow-sm"
          >
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        ) : redirectCountdown !== null ? (
          <motion.div
            key="redirectAlert"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between text-rose-900 dark:text-rose-200 text-xs font-semibold shadow-sm"
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <div>
                <div className="font-extrabold text-rose-900 dark:text-rose-200 leading-tight">Account already registered</div>
                <div className="text-[10px] font-normal text-rose-700 dark:text-rose-300 leading-tight">
                  Redirecting to Log In page...
                </div>
              </div>
            </div>
            <div className="w-7 h-7 rounded-xl bg-rose-600 dark:bg-rose-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md">
              {redirectCountdown}s
            </div>
          </motion.div>
        ) : error ? (
          step === 7 ? (
            <motion.div
              key={errorKey}
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full p-3.5 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shadow-sm"
            >
              <div className="flex items-center gap-2.5 overflow-hidden pr-1">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-bold">Registration failed</span>
              </div>
              <button
                type="button"
                onClick={handleFinishProfile}
                disabled={uploadingPhotos}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 rounded-xl font-extrabold transition-colors cursor-pointer shrink-0 ml-2 disabled:opacity-50"
              >
                {uploadingPhotos ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={errorKey}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [0, -12, 12, -9, 9, -5, 5, -2, 2, 0],
              }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: 0.35,
                ease: 'easeInOut',
              }}
              className="w-full flex items-start gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-sm"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )
        ) : null}
      </AnimatePresence>
    </div>
  );

  return (
    <div
      className={`w-full max-w-xl mx-auto h-[580px] bg-white dark:bg-[#0F172A] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between text-slate-900 dark:text-white ${
        step === 5 ? 'overflow-visible' : 'overflow-hidden'
      }`}
    >
      {/* Progress Bar Header */}
      <div className="space-y-3 shrink-0 mb-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span className="text-[#00AAFF] dark:text-[#B8E7FF]">
            Soloberty Onboarding
          </span>
          <span>Step {step} of 7</span>
        </div>

        <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative border border-slate-200/50 dark:border-slate-700/50">
          {/* Flowing shimmer wave on empty track portion */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.0,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(0,170,255,0.65)_50%,transparent_100%)] pointer-events-none"
          />

          {/* Active filled progress bar */}
          <motion.div
            className="h-full bg-[#00AAFF] dark:bg-[#00AAFF] rounded-full relative z-10 shadow-sm"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 7) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <Step1Credentials
            formData={formData}
            setFormData={setFormData}
            handleStep1Submit={handleStep1Submit}
            renderErrorAlert={renderErrorAlert}
            loading={loading}
            authLoading={authLoading}
            emailExists={emailExists || redirectCountdown !== null}
            onEmailChange={() => {
              setEmailExists(false);
              setRedirectCountdown(null);
              setError(null);
            }}
          />
        )}

        {step === 2 && (
          <Step2BasicInfo
            formData={formData}
            setFormData={setFormData}
            handleStep2Next={handleStep2Next}
            renderErrorAlert={renderErrorAlert}
            setStep={setStep}
          />
        )}

        {step === 3 && (
          <Step3Interests
            interests={formData.interests}
            toggleInterest={toggleInterest}
            handleStep3Next={handleStep3Next}
            setStep={setStep}
          />
        )}

        {step === 4 && (
          <Step4BioScout
            bio={formData.bio}
            setBio={(bioText) => setFormData((prev) => ({ ...prev, bio: bioText }))}
            generatingBio={generatingBio}
            handleGenerateBio={handleGenerateBio}
            handleStep4Next={handleStep4Next}
            renderErrorAlert={renderErrorAlert}
            setStep={setStep}
          />
        )}

        {step === 5 && (
          <Step5Location
            formData={formData}
            setFormData={setFormData}
            selectedLocationData={selectedLocationData}
            setSelectedLocationData={setSelectedLocationData}
            isCityValid={isCityValid}
            setIsCityValid={setIsCityValid}
            citySuggestions={citySuggestions}
            setCitySuggestions={setCitySuggestions}
            showCityDropdown={showCityDropdown}
            setShowCityDropdown={setShowCityDropdown}
            detectingGps={detectingGps}
            isGpsDetected={isGpsDetected}
            setIsGpsDetected={setIsGpsDetected}
            handleDetectGpsLocation={handleDetectGpsLocation}
            handleStep5Next={handleStep5Next}
            renderErrorAlert={renderErrorAlert}
            setStep={setStep}
          />
        )}

        {step === 6 && (
          <Step6PhotoUpload
            profilePhotoPreview={profilePhotoPreview}
            handleProfilePhotoFile={handleProfilePhotoFile}
            handleProfilePhotoChange={handleProfilePhotoChange}
            handleRemoveProfilePhoto={handleRemoveProfilePhoto}
            renderErrorAlert={renderErrorAlert}
            setStep={setStep}
          />
        )}

        {step === 7 && (
          <Step7InterestPhotos
            interestPreviews={interestPreviews}
            handleInterestImagesChange={handleInterestImagesChange}
            removeInterestImage={removeInterestImage}
            handleFinishProfile={handleFinishProfile}
            uploadingPhotos={uploadingPhotos}
            renderErrorAlert={renderErrorAlert}
            setStep={setStep}
          />
        )}
      </AnimatePresence>

      {/* Centered Popup Modals with Tinted Background */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            key="successModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-sm w-full text-center space-y-4"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm">
                <Check className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white">
                  Welcome to Soloberty!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                  {successMessage}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#00AAFF]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Navigating to feed...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignupWizard;
