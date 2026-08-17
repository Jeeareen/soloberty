'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/hooks/useAuth';
import { db } from '../../lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PREDEFINED_INTERESTS, type UserProfile } from '../../types/user';
import { uploadToCloudinary, deleteFromCloudinary } from '../../lib/cloudinary';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Save,
  X,
  Upload,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Navigation,
  MessageSquare,
} from 'lucide-react';

// Gender Icon Symbol helper component (Female pink, Male blue, Other gray)
const GenderSymbol: React.FC<{ gender: string; className?: string }> = ({
  gender,
  className = 'w-8 h-8 sm:w-9 sm:h-9',
}) => {
  const g = (gender || 'male').toLowerCase();
  if (g === 'female') {
    return (
      <svg
        className={`${className} text-pink-500 dark:text-pink-400 shrink-0 inline-block`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-label="Female"
      >
        <circle cx="12" cy="9" r="6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v7m-3-3h6" />
      </svg>
    );
  }
  if (g === 'male') {
    return (
      <svg
        className={`${className} text-blue-500 dark:text-[#00AAFF] shrink-0 inline-block`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        viewBox="0 0 24 24"
        aria-label="Male"
      >
        <circle cx="10" cy="14" r="6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 9.5L20 4m0 0h-5m5 0v5" />
      </svg>
    );
  }
  return (
    <svg
      className={`${className} text-gray-400 dark:text-slate-400 shrink-0 inline-block`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      aria-label="Other"
    >
      <circle cx="12" cy="12" r="6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v4m-2-2h4M12 6V2m-2 2h4" />
    </svg>
  );
};

interface ProfileDraftState {
  name: string;
  age: number | string;
  gender: string;
  email: string;
  bio: string;
  locationType: 'exact' | 'approximate';
  city: string;
  interests: string[];
  profilePhotoUrl: string;
  avatarPublicId?: string;
  interestImageUrls: string[];
  interestImagesList?: Array<{ slot?: number; url: string; publicId?: string; uploadedAt?: any }>;
}

// Interactive 3D MatchCard Preview component for the user's profile page (right column)
// Exactly matches feed active MatchCard size (420px x 600px), hold spring scale (1.05x), and 3D flip animation
const ProfileMatchCardPreview: React.FC<{
  name: string;
  age: number | string;
  gender: string;
  bio: string;
  photoUrl?: string | null;
  city?: string;
  interests?: string[];
  interestPhotos?: string[];
}> = ({ name, age, gender, bio, photoUrl, city, interests = [], interestPhotos = [] }) => {
  const router = useRouter();
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHeld, setIsHeld] = useState(false);

  const selectedInterests = interests.map(
    (id) => PREDEFINED_INTERESTS.find((i) => i.id === id) || { id, name: id, icon: '✨' }
  );

  return (
    <div className="flex flex-col items-center justify-center w-full sticky top-4 sm:top-6 [perspective:1000px]">
      <div className="flex items-center justify-between w-full max-w-[420px] mb-3 px-1">
        <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Your Live MatchCard
        </span>
      </div>

      {/* Active Card Container (Matches feed active card geometry: w-[420px] h-[600px]) */}
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`${name}, ${bio}. Tap to flip card`}
        onClick={() => setIsFlipped((prev) => !prev)}
        onPointerDown={() => setIsHeld(true)}
        onPointerUp={() => setIsHeld(false)}
        onPointerCancel={() => setIsHeld(false)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ rotateY: { duration: 0.4, ease: 'easeInOut' } }}
        className="relative flex h-[600px] w-[420px] max-w-full cursor-pointer flex-col rounded-xl bg-white dark:bg-[#0F172A] shadow-xl border border-gray-100 dark:border-slate-800 [transform-style:preserve-3d] focus:outline-none"
      >
        {/* Inner Tap/Hold Scale Container */}
        <motion.div
          animate={{ scale: isHeld ? 1.05 : 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative h-full w-full [transform-style:preserve-3d]"
        >
          {/* Front Face */}
          <div className="absolute inset-0 flex flex-col bg-white dark:bg-[#0F172A] rounded-xl overflow-hidden [backface-visibility:hidden]">
            {/* Rectangular PP taking top ~35% with Name, Gender Symbol & Age overlay */}
            <div className="relative w-full h-52 sm:h-56 shrink-0 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#B8E7FF] dark:bg-slate-800 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center">
                  <User className="w-20 h-20" />
                </div>
              )}

              {/* Gradient Overlay on lower part of PP with Name only (1.25x font size) */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 text-white">
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold tracking-tight truncate drop-shadow-md">
                  {name || 'Soloberty Member'}
                </h2>
              </div>
            </div>

            {/* Content Below PP */}
            <div className="flex-1 flex flex-col p-5 space-y-3.5">
              {/* Location Tag right below PP (1.25x font size) */}
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-[#00AAFF] dark:text-[#B8E7FF]">
                <MapPin className="w-4 h-4 shrink-0 text-[#00AAFF]" />
                <span>{city || 'Vienna, AT'}</span>
              </div>

              {/* 3 Interests as Bulletpoints (1.25x font size) */}
              <div className="space-y-1.5 flex-1">
                <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Interests
                </span>
                <ul className="space-y-2.5 pt-0.5">
                  {selectedInterests.length > 0 ? (
                    selectedInterests.slice(0, 3).map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100"
                      >
                        <span className="text-[#00AAFF] font-black text-base">•</span>
                        <span className="text-lg sm:text-xl shrink-0">{item.icon || '✨'}</span>
                        <span className="truncate">{item.name}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-slate-400 italic">No interests selected yet</li>
                  )}
                </ul>
              </div>

              {/* Footer Hint */}
              <div className="mt-auto pt-2.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 italic border-t border-gray-100 dark:border-slate-800">
                <span>Tap card to view bio & photos</span>
                <span>🔄</span>
              </div>
            </div>
          </div>

          {/* Back Face (Name, Age, Gender / Bio / Interest Images / Chat Button) */}
          <div className="absolute inset-0 flex flex-col p-6 bg-white dark:bg-[#0F172A] rounded-xl [transform:rotateY(180deg)] [backface-visibility:hidden]">
            {/* Top: Name, Age, Gender (1.25x font size) */}
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
              <GenderSymbol gender={gender} className="w-6 h-6 shrink-0" />
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-gray-900 dark:text-white truncate">
                {name || 'Soloberty Member'}{age ? `, ${age}` : ''}
              </h2>
            </div>

            {/* Middle: Bio (1x font size, auto-wrapping without horizontal scrolling) */}
            <div className="mt-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed overflow-y-auto flex-1 space-y-1 pr-1">
              <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                Bio
              </span>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{bio || 'No bio provided yet.'}</p>
            </div>

            {/* Bottom Section: Interest Photos & Chat Button Aligned to Bottom */}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2.5 shrink-0">
              <div className="space-y-1">
                <span className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Interest Photos
                </span>
                {interestPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {interestPhotos.slice(0, 3).map((url, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100"
                      >
                        <img src={url} alt={`Interest ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No interest photos uploaded</p>
                )}
              </div>

              {/* Chat Button (1.25x font size) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/chat');
                }}
                className="w-full py-3 px-4 bg-[#00AAFF] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#00AAFF]/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with {name?.split(' ')[0] || 'User'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export const ProfileEditor: React.FC = () => {
  const { user, refreshProfileStatus } = useAuth();
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // User Profile Form State
  const [profileData, setProfileData] = useState<ProfileDraftState>({
    name: '',
    age: '',
    gender: 'male',
    email: '',
    bio: '',
    locationType: 'approximate',
    city: '',
    interests: [],
    profilePhotoUrl: '',
    avatarPublicId: '',
    interestImageUrls: [],
    interestImagesList: [],
  });

  // Saved Benchmark State for Cancel Revert
  const [savedProfileData, setSavedProfileData] = useState<ProfileDraftState | null>(null);

  // Edit Mode Temp States
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [interestFiles, setInterestFiles] = useState<File[]>([]);
  const [interestPreviews, setInterestPreviews] = useState<string[]>([]);

  // Step 5 Location Autocomplete & GPS States
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
  const [isCityValid, setIsCityValid] = useState<boolean>(true);
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);
  const [isGpsDetected, setIsGpsDetected] = useState<boolean>(false);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  // WebRTC Camera Modal State
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch live UserProfile from Firestore
  useEffect(() => {
    async function fetchUserProfile() {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userDocRef);

        if (snapshot.exists()) {
          const data = snapshot.data() as UserProfile;
          const loadedState: ProfileDraftState = {
            name: data.name || 'Soloberty Explorer',
            age: data.age || 24,
            gender: data.gender || 'male',
            email: data.email || user.email || '',
            bio: data.bio || '',
            locationType: data.location?.type || 'approximate',
            city: data.location?.city || 'Vienna, AT',
            interests: data.interests || [],
            profilePhotoUrl: data.profilePhoto?.url || data.avatarUrl || '',
            avatarPublicId: data.avatarPublicId || data.profilePhoto?.publicId || '',
            interestImageUrls: (data.interestImages || []).map((img) => img.url),
            interestImagesList: data.interestImages || [],
          };
          setProfileData(loadedState);
          setSavedProfileData(loadedState);

          setProfilePhotoPreview(loadedState.profilePhotoUrl || null);
          setInterestPreviews([...loadedState.interestImageUrls]);
          if (data.location?.coordinates) {
            setSelectedLocationData({
              city: data.location.city,
              country: '',
              code: '',
              lat: data.location.coordinates.lat,
              lng: data.location.coordinates.lng,
            });
          }
        } else {
          setProfileData((prev) => ({
            ...prev,
            email: user.email || '',
            name: user.displayName || 'Soloberty Explorer',
          }));
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [user]);

  // Autocomplete Location Search
  useEffect(() => {
    const query = profileData.city.trim();
    if (!isEditMode || !query || query.length < 2 || profileData.locationType !== 'approximate' || query.includes(',')) {
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
        // Silently ignore aborts
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [profileData.city, profileData.locationType, isEditMode]);

  // Handle Photo Changes
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
    if (file) handleProfilePhotoFile(file);
  };

  const handleRemoveProfilePhoto = () => {
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

  // Detect GPS Location
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
          setProfileData((prev) => ({ ...prev, city: fullCityStr }));
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
          setProfileData((prev) => ({ ...prev, city: fullCityStr }));
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

  // WebRTC Camera Modal Controls
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
        setCameraError('Camera access denied or unavailable.');
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

  // Interest Selection Handler (Max 3)
  const toggleInterest = (id: string) => {
    setError(null);
    setProfileData((prev) => {
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

  // Cancel Edit Handler: Reverts working draft to saved state without Cloudinary/Firestore mutations
  const handleCancelEdit = () => {
    if (savedProfileData) {
      setProfileData({ ...savedProfileData });
      setProfilePhotoPreview(savedProfileData.profilePhotoUrl || null);
      setInterestPreviews([...savedProfileData.interestImageUrls]);
    }
    setProfilePhotoFile(null);
    setInterestFiles([]);
    setError(null);
    setIsEditMode(false);
  };

  // Save Changes to Firestore
  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setError(null);

    // Validation
    const bioTrimmed = profileData.bio.trim();
    if (!bioTrimmed || bioTrimmed.length < 30) {
      setError('Bio must be at least 30 characters long.');
      return;
    }
    if (bioTrimmed.length > 300) {
      setError('Bio must be at most 300 characters long.');
      return;
    }
    if (profileData.interests.length === 0 || profileData.interests.length > 3) {
      setError('Please select at least 1 interest (up to 3).');
      return;
    }
    if (profileData.locationType === 'exact' && !isGpsDetected && !selectedLocationData?.lat) {
      setError('Please detect your current GPS location before saving.');
      return;
    }
    if (profileData.locationType === 'approximate' && (!isCityValid || !profileData.city.trim())) {
      setError('Please select a valid city from the autocomplete suggestions.');
      return;
    }

    setSaving(true);

    try {
      // Track publicIds for current avatar and interest photos
      let currentAvatarPublicId = profileData.avatarPublicId || '';
      let finalAvatarUrl = profileData.profilePhotoUrl;
      let finalAvatarPublicId = currentAvatarPublicId;

      // Handle Avatar Upload / Replacement / Deletion
      if (profilePhotoFile) {
        // Upload new avatar to scoped folder users/<userId>/avatar
        const res = await uploadToCloudinary(profilePhotoFile, `users/${user.uid}/avatar`);
        finalAvatarUrl = res.secure_url;
        finalAvatarPublicId = res.public_id;

        // Delete old avatar if present
        if (currentAvatarPublicId && currentAvatarPublicId !== finalAvatarPublicId) {
          await deleteFromCloudinary(currentAvatarPublicId, user.uid);
        }
      } else if (!profilePhotoPreview) {
        // Avatar was removed by user clicking red X button
        if (currentAvatarPublicId) {
          await deleteFromCloudinary(currentAvatarPublicId, user.uid);
        }
        finalAvatarUrl = '';
        finalAvatarPublicId = '';
      }

      // Handle Interest Images Upload / Replacement / Deletion with Slotted Model
      const existingInterestItems = profileData.interestImagesList || [];
      const updatedInterestItems: Array<{ slot: number; url: string; publicId: string; uploadedAt?: string }> = [];

      let fileIdx = 0;
      for (let i = 0; i < interestPreviews.length; i++) {
        const previewUrl = interestPreviews[i];
        const slotNum = i + 1;

        if (previewUrl.startsWith('blob:')) {
          // Newly selected file
          const fileToUpload = interestFiles[fileIdx];
          fileIdx++;
          if (fileToUpload) {
            const uploadRes = await uploadToCloudinary(fileToUpload, `users/${user.uid}/interests`);
            
            // If replacing an existing slot that had a publicId, delete old asset
            const oldItem = existingInterestItems.find((item) => item.slot === slotNum);
            if (oldItem?.publicId) {
              await deleteFromCloudinary(oldItem.publicId, user.uid);
            }

            updatedInterestItems.push({
              slot: slotNum,
              url: uploadRes.secure_url,
              publicId: uploadRes.public_id,
              uploadedAt: new Date().toISOString(),
            });
          }
        } else {
          // Existing saved image URL
          const match = existingInterestItems.find((item) => item.url === previewUrl || item.slot === slotNum);
          updatedInterestItems.push({
            slot: slotNum,
            url: previewUrl,
            publicId: match?.publicId || '',
            uploadedAt: match?.uploadedAt ? (typeof match.uploadedAt === 'string' ? match.uploadedAt : new Date().toISOString()) : new Date().toISOString(),
          });
        }
      }

      // Find any removed interest image slots and delete their Cloudinary assets
      for (const oldItem of existingInterestItems) {
        const isStillPresent = updatedInterestItems.some(
          (newItem) => newItem.url === oldItem.url || (newItem.publicId && newItem.publicId === oldItem.publicId)
        );
        if (!isStillPresent && oldItem.publicId) {
          await deleteFromCloudinary(oldItem.publicId, user.uid);
        }
      }

      // Update Firestore user document
      const fullProfile: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email || profileData.email,
        profileCompleted: true,
        name: profileData.name,
        age: typeof profileData.age === 'number' ? profileData.age : 24,
        gender: profileData.gender as any,
        bio: profileData.bio,
        interests: profileData.interests,
        location: {
          type: profileData.locationType,
          city: profileData.city,
          coordinates: {
            lat: selectedLocationData?.lat || (profileData.locationType === 'exact' ? 48.2082 : 0),
            lng: selectedLocationData?.lng || (profileData.locationType === 'exact' ? 16.3738 : 0),
          },
        },
        avatarUrl: finalAvatarUrl,
        avatarPublicId: finalAvatarPublicId,
        profilePhoto: {
          url: finalAvatarUrl,
          publicId: finalAvatarPublicId,
          uploadedAt: new Date().toISOString(),
        },
        interestImages: updatedInterestItems,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), fullProfile, { merge: true });

      const committedState: ProfileDraftState = {
        ...profileData,
        avatarPublicId: finalAvatarPublicId,
        profilePhotoUrl: finalAvatarUrl,
        interestImageUrls: updatedInterestItems.map((item) => item.url),
        interestImagesList: updatedInterestItems,
      };

      setProfileData(committedState);
      setSavedProfileData(committedState);
      setProfilePhotoPreview(finalAvatarUrl || null);
      setInterestPreviews(updatedInterestItems.map((item) => item.url));
      setProfilePhotoFile(null);
      setInterestFiles([]);

      if (refreshProfileStatus) {
        await refreshProfileStatus();
      }

      setSaveSuccess(true);
      setIsEditMode(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-8 my-12 p-12 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-[#00AAFF] animate-spin" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 mt-2 sm:mt-4 mb-4 sm:mb-8 space-y-6">
      {/* Top Header & Edit Mode Toggle Button */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl sm:text-4xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white">
            My Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isEditMode
              ? 'Edit your location, bio, interests, and profile pictures'
              : 'Your public Soloberty member profile and card preview'}
          </p>
        </div>

        {isEditMode ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-4 py-2.5 bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2.5 bg-[#00AAFF] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#00AAFF]/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditMode(true)}
            className="px-5 py-2.5 bg-[#00AAFF] hover:bg-[#0088CC] text-white dark:bg-[#B8E7FF] dark:hover:bg-[#99D8FF] dark:text-slate-900 text-xs sm:text-sm font-extrabold rounded-xl shadow-md shadow-[#00AAFF]/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Your profile has been updated successfully!</span>
        </motion.div>
      )}

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 rounded-2xl flex items-center gap-3 text-xs sm:text-sm shadow-sm"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Unboxed 2-Column Responsive Layout Grid (70% Left / 30% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 sm:gap-12 w-full">
        {/* Left Column: 70% Width (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-8">
          {!isEditMode ? (
            /* Static View Mode */
            <div className="space-y-8">
              {/* Header Identity Row: Profile picture 1.5x, Gender symbol left to Name, comma Age, aligned location pin */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
                {profilePhotoPreview || profileData.profilePhotoUrl ? (
                  <img
                    src={profilePhotoPreview || profileData.profilePhotoUrl}
                    alt={profileData.name}
                    className="w-28 h-28 object-cover rounded-full border-4 border-white dark:border-slate-800 ring-4 ring-[#00AAFF]/20 dark:ring-[#B8E7FF]/20 shadow-xl shrink-0"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-[#B8E7FF] dark:bg-slate-800 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center border-4 border-white dark:border-slate-800 ring-4 ring-[#00AAFF]/20 dark:ring-[#B8E7FF]/20 shadow-xl shrink-0">
                    <User className="w-12 h-12" />
                  </div>
                )}

                <div className="space-y-3 text-center sm:text-left flex-1 pt-2">
                  {/* Gender Icon Left to Name, Age separated by comma */}
                  <div className="flex items-center justify-center sm:justify-start gap-2.5">
                    <div className="w-8 sm:w-9 flex items-center justify-start shrink-0">
                      <GenderSymbol gender={profileData.gender} className="w-8 h-8 sm:w-9 sm:h-9" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-heading font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                      {profileData.name}{profileData.age ? `, ${profileData.age}` : ''}
                    </h2>
                  </div>

                  {/* Location Pin & City: Left side 100% aligned with Gender Icon */}
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    <div className="w-8 sm:w-9 flex items-center justify-start shrink-0">
                      <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-[#00AAFF]" />
                    </div>
                    <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                      {profileData.city || 'Vienna, AT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* About Me Section */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  About Me
                </h3>
                <p className="text-base sm:text-lg text-slate-700 dark:text-slate-200 leading-relaxed bg-white/70 dark:bg-slate-800/50 p-5 sm:p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {profileData.bio || 'No bio provided yet.'}
                </p>
              </div>

              {/* Interests Section: 3:1 Aspect Ratio Rectangle Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Interests
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {profileData.interests.length > 0 ? (
                    profileData.interests.map((id) => {
                      const interest = PREDEFINED_INTERESTS.find((i) => i.id === id);
                      return (
                        <div
                          key={id}
                          className="aspect-[3/1] flex items-center justify-center gap-2.5 px-3.5 py-2 text-center bg-[#B8E7FF]/40 dark:bg-[#B8E7FF]/15 text-[#0088CC] dark:text-[#B8E7FF] rounded-2xl border border-[#B8E7FF]/60 dark:border-[#B8E7FF]/30 shadow-sm transition-all hover:scale-[1.02]"
                        >
                          <span className="text-xl sm:text-2xl shrink-0">{interest?.icon || '✨'}</span>
                          <span className="text-xs sm:text-sm font-bold truncate">
                            {interest ? interest.name : id}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic col-span-full">No interests selected yet.</span>
                  )}
                </div>
              </div>

              {/* Interest Photos Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Interest Photos
                </h3>
                {interestPreviews.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3.5">
                    {interestPreviews.map((url, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-100 dark:bg-slate-800"
                      >
                        <img
                          src={url}
                          alt={`Interest ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No interest photos uploaded yet.</p>
                )}
              </div>
            </div>
          ) : (
            /* Edit Mode Inputs */
            <div className="space-y-6 bg-white/70 dark:bg-slate-800/40 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-lg text-slate-900 dark:text-white">
              {/* Profile Photo Editor */}
              <div className="space-y-3">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Profile Photo
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60">
                  {profilePhotoPreview ? (
                    <div className="relative group shrink-0">
                      <img
                        src={profilePhotoPreview}
                        alt="Profile Preview"
                        className="w-28 h-28 object-cover rounded-full border-4 border-white dark:border-slate-700 ring-2 ring-[#00AAFF]/30 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveProfilePhoto}
                        className="absolute top-0 right-0 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-transform active:scale-90 shadow-md cursor-pointer"
                        title="Remove profile photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-[#B8E7FF] dark:bg-slate-700 text-[#00AAFF] dark:text-[#B8E7FF] flex items-center justify-center border-4 border-white dark:border-slate-700 shrink-0">
                      <User className="w-12 h-12" />
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 w-full max-w-xs">
                    <label
                      htmlFor="profilePhotoInputProfile"
                      className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
                    >
                      <Upload className="w-4 h-4 text-[#00AAFF]" />
                      Upload File
                    </label>
                    <button
                      type="button"
                      onClick={openCamera}
                      disabled={isCameraStarting}
                      className="flex-1 py-2.5 px-3 bg-[#00AAFF] hover:bg-[#0088CC] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00AAFF]/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 text-center cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Shoot Cam
                    </button>
                  </div>

                  <input
                    id="profilePhotoInputProfile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleProfilePhotoChange}
                    className="hidden"
                  />
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

              {/* Location Editor */}
              <div className="space-y-3 relative">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Location Privacy & Coordinates
                </label>

                {/* Location Type Tab Switcher */}
                <div className="grid grid-cols-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl relative mb-3 border border-slate-200/50 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileData((prev) => ({ ...prev, locationType: 'approximate' }));
                      setIsGpsDetected(false);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all relative z-10 ${
                      profileData.locationType === 'approximate'
                        ? 'text-[#00AAFF] shadow-sm bg-white dark:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Approximate City
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileData((prev) => ({ ...prev, locationType: 'exact' }));
                      setIsGpsDetected(false);
                    }}
                    className={`py-2 text-xs font-bold rounded-xl transition-all relative z-10 ${
                      profileData.locationType === 'exact'
                        ? 'text-[#00AAFF] shadow-sm bg-white dark:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Exact GPS
                  </button>
                </div>

                {profileData.locationType === 'approximate' ? (
                  <div className="relative">
                    {/* Autocomplete Dropdown */}
                    {showCityDropdown && citySuggestions.length > 0 && (
                      <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto p-1.5 space-y-1">
                        {citySuggestions.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              const fullStr = `${item.city}, ${item.code}`;
                              setProfileData((prev) => ({ ...prev, city: fullStr }));
                              setSelectedLocationData(item);
                              setIsCityValid(true);
                              setShowCityDropdown(false);
                            }}
                            className="w-full text-left p-2.5 hover:bg-[#B8E7FF]/40 dark:hover:bg-slate-700/80 rounded-xl transition-colors flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-[#00AAFF] shrink-0" />
                              <span>{item.city}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300">
                              {item.code}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <input
                      type="text"
                      value={profileData.city}
                      onChange={(e) => {
                        setProfileData((prev) => ({ ...prev, city: e.target.value }));
                        setIsCityValid(false);
                      }}
                      placeholder="Search city e.g. Vienna, AT"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#00AAFF] transition-colors"
                    />
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={handleDetectGpsLocation}
                      disabled={detectingGps}
                      className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                        isGpsDetected || selectedLocationData?.lat
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 cursor-default'
                          : 'bg-[#00AAFF] hover:bg-[#0088CC] text-white active:scale-95 cursor-pointer'
                      }`}
                    >
                      {detectingGps ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Detecting GPS Location...
                        </>
                      ) : isGpsDetected || selectedLocationData?.lat ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          Location Detected: {profileData.city}
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4" />
                          Detect Current Location via GPS
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Bio Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Bio
                  </label>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    {profileData.bio.length} / 300
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={profileData.bio}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, bio: e.target.value.slice(0, 300) }))
                  }
                  placeholder="Share your hobbies, favorite spots, and what you love doing..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[#00AAFF] transition-colors resize-none"
                />
              </div>

              {/* Interests Editor: 3:1 Aspect Ratio Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Interests (Select 1 to 3)
                  </label>
                  <span className="text-xs font-bold text-[#00AAFF] dark:text-[#B8E7FF]">
                    {profileData.interests.length} / 3
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {PREDEFINED_INTERESTS.map((interest) => {
                    const selected = profileData.interests.includes(interest.id);
                    return (
                      <button
                        key={interest.id}
                        type="button"
                        onClick={() => toggleInterest(interest.id)}
                        className={`aspect-[3/1] flex items-center justify-center gap-2 px-3 py-2 text-center rounded-2xl transition-all cursor-pointer ${
                          selected
                            ? 'bg-[#00AAFF] text-white shadow-md shadow-[#00AAFF]/20 border border-[#00AAFF] scale-[1.02]'
                            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                        }`}
                      >
                        <span className="text-xl sm:text-2xl shrink-0">{interest.icon}</span>
                        <span className="text-xs font-bold truncate">{interest.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interest Photos Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Interest Photos (Max 3)
                  </label>
                  <span className="text-xs font-bold text-[#00AAFF] dark:text-[#B8E7FF]">
                    {interestPreviews.length} / 3
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3.5">
                  {interestPreviews.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <img src={url} alt={`Interest ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeInterestImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-transform active:scale-90 shadow-md cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {interestPreviews.length < 3 && (
                    <label
                      htmlFor="interestPhotosInputEdit"
                      className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#00AAFF] dark:hover:border-[#00AAFF] bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center justify-center cursor-pointer transition-all p-2 text-center"
                    >
                      <Upload className="w-5 h-5 text-[#00AAFF] mb-1" />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Add Photo</span>
                    </label>
                  )}
                </div>

                <input
                  id="interestPhotosInputEdit"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleInterestImagesChange}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: 30% Width (lg:col-span-3) - Live Interactive User MatchCard */}
        <div className="lg:col-span-3 flex justify-end sticky top-2 sm:top-3 h-fit">
          <ProfileMatchCardPreview
            name={profileData.name}
            age={profileData.age}
            gender={profileData.gender}
            bio={profileData.bio}
            city={profileData.city}
            interests={profileData.interests}
            interestPhotos={interestPreviews}
            photoUrl={profilePhotoPreview}
          />
        </div>
      </div>

      {/* WebRTC Live Camera Stream Modal Overlay */}
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
                  <Camera className="w-4 h-4 text-[#00AAFF]" />
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
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-[#00AAFF]/40 bg-slate-900 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              )}

              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={capturePhotoFromCamera}
                  className="w-full py-3 bg-[#00AAFF] hover:bg-[#0088CC] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-[#00AAFF]/20 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileEditor;
