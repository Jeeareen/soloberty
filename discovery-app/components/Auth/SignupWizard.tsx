'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/hooks/useAuth';
import { PREDEFINED_INTERESTS, type UserProfile } from '../../types/user';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase/config';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Heart,
  Upload,
  Image as ImageIcon,
  X,
  Check,
} from 'lucide-react';

export const SignupWizard: React.FC = () => {
  const router = useRouter();
  const { signup, loading: authLoading, refreshProfileStatus } = useAuth();
  const [step, setStep] = useState<number>(1);
  const [error, setErrorState] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

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

  // Step 1 Submission: Validate email/password locally (account is created on step 7 finish)
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password || !formData.confirmPassword) {
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
    setStep(2);
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

    const fallbackBios = [
      `Hey, I'm ${formData.name || 'Alex'}! I'm really passionate about ${selectedInterestNames || 'exploring new things'}. Always excited to meet new people and share great experiences on Soloberty!`,
      `Passionate about ${selectedInterestNames || 'great vibes'}. Looking to connect with awesome people who share the same energy and love for good conversations!`,
      `Living life to the fullest with a deep love for ${selectedInterestNames || 'adventures'}. Excited to meet friendly faces and build genuine connections here on Soloberty.`,
      `Hi there! Big fan of ${selectedInterestNames || 'good vibes'}. Let's connect, share awesome stories, and explore new hobbies together!`,
      `Exploring the world through ${selectedInterestNames || 'fun activities'}. Can't wait to meet people who bring great energy and positive vibes!`,
    ];

    try {
      const promptText = `Write a single creative, warm, authentic bio (between 60 and 260 characters, no quotes or meta commentary) for ${formData.name || 'a member'}, a ${formData.age || 25}-year-old who loves ${selectedInterestNames}. The bio MUST explicitly include their interests (${selectedInterestNames}).`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: promptText,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate bio with Scout');
      }

      const text = await response.text();
      const cleanedText = text.replace(/^"|"$/g, '').trim().slice(0, 300);

      if (cleanedText.length >= 30) {
        setFormData((prev) => ({ ...prev, bio: cleanedText }));
      } else {
        const randomFallback = fallbackBios[Math.floor(Math.random() * fallbackBios.length)];
        setFormData((prev) => ({ ...prev, bio: randomFallback }));
      }
    } catch (err: any) {
      console.warn('Bio auto-generation fallback:', err);
      const randomFallback = fallbackBios[Math.floor(Math.random() * fallbackBios.length)];
      setFormData((prev) => ({ ...prev, bio: randomFallback }));
    } finally {
      setGeneratingBio(false);
    }
  };

  const handleStep4Next = () => {
    const bioTrimmed = formData.bio.trim();
    if (!bioTrimmed || bioTrimmed.length < 30) {
      setError('Bio must be at least 30 characters long.');
      return;
    }
    if (bioTrimmed.length > 300) {
      setError('Bio must be at most 300 characters long.');
      return;
    }
    setError(null);
    setStep(5);
  };

  // Step 5: Location Selection
  const handleStep5Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.city.trim()) {
      setError('Please enter your city or select a location.');
      return;
    }
    setStep(6);
  };

  // Step 6 & 7: Photo upload states
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [interestFiles, setInterestFiles] = useState<File[]>([]);
  const [interestPreviews, setInterestPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState<boolean>(false);

  // Profile photo file picker handler
  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

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

  // Interest images file picker handler (up to 3)
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

  // Remove interest image thumbnail
  const removeInterestImage = (index: number) => {
    setInterestFiles((prev) => prev.filter((_, i) => i !== index));
    setInterestPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Final Submission: Save full UserProfile to Firestore
  const handleFinishProfile = async () => {
    setError(null);
    setUploadingPhotos(true);

    try {
      // 1. Create account in Firebase Auth only when user completes registration
      let currentUid = auth.currentUser?.uid;
      if (!currentUid) {
        const newUser = await signup(formData.email.trim(), formData.password);
        currentUid = newUser.uid;
      }

      let profilePhotoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
      let interestPhotoUrls = [
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&auto=format&fit=crop&q=80',
      ];

      // Attempt live Firebase Storage upload if files selected
      if (profilePhotoFile) {
        try {
          const { uploadProfilePhoto } = await import('../../lib/firebase/storage');
          profilePhotoUrl = await uploadProfilePhoto(currentUid, profilePhotoFile);
        } catch (stErr) {
          console.warn('Storage profile photo upload fallback:', stErr);
        }
      }

      if (interestFiles.length > 0) {
        try {
          const { uploadInterestImages } = await import('../../lib/firebase/storage');
          interestPhotoUrls = await uploadInterestImages(currentUid, interestFiles);
        } catch (stErr) {
          console.warn('Storage interest images upload fallback:', stErr);
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
          city: formData.city || 'San Francisco, CA',
          coordinates: {
            lat: 37.7749,
            lng: -122.4194,
          },
        },
        profilePhoto: {
          url: profilePhotoUrl,
          uploadedAt: new Date().toISOString(),
        },
        interestImages: interestPhotoUrls.map((url) => ({
          url,
          uploadedAt: new Date().toISOString(),
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', currentUid), fullProfile, { merge: true });

      // Refresh auth context profile completion status
      if (refreshProfileStatus) {
        await refreshProfileStatus();
      }

      // Redirect to discover page
      router.push('/discover');
    } catch (err: any) {
      console.error('Final profile save error:', err);
      let errMsg = err?.message || 'Failed to complete profile registration. Please try again.';
      if (errMsg.includes('email-already-in-use')) {
        errMsg = 'This email address is already registered. Please log in or use a different email.';
        setStep(1);
      }
      setError(errMsg);
    } finally {
      setUploadingPhotos(false);
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
    <>
      {error && (
        <motion.div
          key={errorKey}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: [0, -12, 12, -9, 9, -5, 5, -2, 2, 0],
          }}
          transition={{
            duration: 0.35,
            ease: 'easeInOut',
          }}
          className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs sm:text-sm shadow-sm my-1"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}
    </>
  );

  return (
    <div className="w-full max-w-xl mx-auto h-[580px] bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between text-slate-900 overflow-hidden">
      {/* Progress Bar Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1.5 text-blue-600">
            <Sparkles className="w-4 h-4" />
            Soloberty Onboarding
          </span>
          <span>Step {step} of 7</span>
        </div>

        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-600 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 7) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* STEP 1: Registration */}
        {step === 1 && (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onSubmit={handleStep1Submit}
            className="space-y-5"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Create your account</h2>
              <p className="text-xs sm:text-sm text-slate-500">Step 1: Enter your email and choose a secure password</p>
            </div>

            {renderErrorAlert()}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Password (min 8 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading || authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering account...
                </>
              ) : (
                <>
                  Continue to Basic Info
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* STEP 2: Basic Info */}
        {step === 2 && (
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleStep2Next}
            className="space-y-5"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Tell us about yourself</h2>
              <p className="text-xs sm:text-sm text-slate-500">Step 2: Enter your name, age, and gender</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value.replace(/[^a-zA-Z\s\u00C0-\u024F]/g, ''),
                      })
                    }
                    placeholder="Alex Morgan"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Age (18 - 130)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    required
                    min={18}
                    max={130}
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        age: e.target.value ? parseInt(e.target.value, 10) : '',
                      })
                    }
                    placeholder="25"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Gender Identity
                </label>
                <div className="relative p-1 bg-slate-100/90 rounded-2xl flex items-center border border-slate-200/80 shadow-inner">
                  {[
                    { id: 'male', label: 'Male' },
                    { id: 'female', label: 'Female' },
                    { id: 'other', label: 'Other' },
                  ].map((g) => {
                    const isActive = formData.gender === g.id;
                    return (
                      <motion.button
                        key={g.id}
                        type="button"
                        initial="rest"
                        whileHover="hover"
                        animate="rest"
                        onClick={() => setFormData({ ...formData, gender: g.id })}
                        className="relative flex-1 py-2.5 text-xs font-extrabold text-center transition-colors duration-200 z-10 flex items-center justify-center"
                      >
                        {isActive && (
                          <motion.div
                            layoutId="genderSwitchPill"
                            className="absolute inset-0 bg-blue-600 rounded-xl shadow-md"
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                              mass: 0.7,
                            }}
                          />
                        )}
                        <motion.span
                          variants={{
                            rest: { scale: 1 },
                            hover: { scale: 1.1 },
                          }}
                          transition={{ type: 'tween', ease: 'easeOut', duration: 0.15 }}
                          className={`relative z-10 inline-block origin-center transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          {g.label}
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                Continue to Interests
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.form>
        )}

        {/* STEP 3: Interests Selection */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Select your interests</h2>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {formData.interests.length} / 3 selected
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Step 3: Choose <span className="text-slate-900 font-bold">at most 3</span> hobbies or passions
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              {PREDEFINED_INTERESTS.map((item) => {
                const isSelected = formData.interests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${isSelected
                        ? 'bg-blue-50 border-slate-200 text-blue-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-2xl">{item.icon}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 absolute top-2.5 right-2.5" />
                      )}
                    </div>
                    <span className="text-xs font-bold line-clamp-1">{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleStep3Next}
                disabled={formData.interests.length === 0 || formData.interests.length > 3}
                className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                Continue to Bio
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Bio & Scout AI Auto-Generation */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Create your bio</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Step 4: Write a short bio or let <span className="text-blue-600 font-bold">Soloberty Scout</span> draft one for you!
              </p>
            </div>

            {renderErrorAlert()}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Your Bio (30 - 300 characters)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBio}
                  disabled={generatingBio}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {generatingBio ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Scout is drafting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                      Auto-generate with Scout
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  minLength={30}
                  maxLength={300}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Share a little bit about what you love, your vibe, or what kind of connections you're hoping to make..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed"
                />
                <div
                  className={`absolute bottom-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${formData.bio.trim().length >= 30 && formData.bio.trim().length <= 300
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-slate-500 bg-white/90 border-slate-200'
                    }`}
                >
                  {formData.bio.length} / 300 (min 30)
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleStep4Next}
                disabled={formData.bio.trim().length < 30 || formData.bio.trim().length > 300}
                className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                Continue to Location
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 5: Location Selection */}
        {step === 5 && (
          <motion.form
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleStep5Next}
            className="space-y-5"
          >
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Your location</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Step 5: Choose how you'd like to share your location with potential matches
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Location Sharing Privacy
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, locationType: 'approximate' })}
                    className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${formData.locationType === 'approximate'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <div className="font-bold text-sm">Approximate</div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Displays city center only. Keeps your exact neighborhood private.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, locationType: 'exact' })}
                    className={`p-4 rounded-2xl border text-left space-y-1 transition-all ${formData.locationType === 'exact'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <div className="font-bold text-sm">Exact Location</div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Allows precise distance matching and pin mapping.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  City Name / Location
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. San Francisco, CA or London, UK"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                Continue to Photos
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.form>
        )}

        {/* STEP 6: Profile Photo Upload */}
        {step === 6 && (
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
        )}

        {/* STEP 7: Interest Images & Complete Profile */}
        {step === 7 && (
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

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {interestPreviews.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group shadow-sm">
                    <img src={url} alt={`Interest ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeInterestImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-transform active:scale-90 shadow-md"
                      title="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {interestPreviews.length < 3 && (
                  <label
                    htmlFor="interestImagesInput"
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-all p-2 text-center"
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
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInterestImagesChange}
                className="hidden"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(6)}
                className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleFinishProfile}
                disabled={uploadingPhotos}
                className="flex-1 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploadingPhotos ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving profile...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Finish & Launch Soloberty
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignupWizard;
