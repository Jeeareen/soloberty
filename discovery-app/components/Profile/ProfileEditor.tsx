'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/hooks/useAuth';
import { db } from '../../lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PREDEFINED_INTERESTS, type UserProfile } from '../../types/user';
import { uploadToCloudinary, deleteFromCloudinary } from '../../lib/cloudinary';
import {
  Pencil,
  Save,
  X,
  Upload,
  Camera,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Navigation,
} from 'lucide-react';

export const ProfileEditor: React.FC = () => {
  const { user, refreshProfileStatus } = useAuth();
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // User Profile Form State
  const [profileData, setProfileData] = useState<{
    name: string;
    age: number | '';
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
  }>({
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
          setProfileData({
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
          });

          setProfilePhotoPreview(data.profilePhoto?.url || data.avatarUrl || null);
          setInterestPreviews((data.interestImages || []).map((img) => img.url));
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

      setProfileData((prev) => ({
        ...prev,
        avatarPublicId: finalAvatarPublicId,
        profilePhotoUrl: finalAvatarUrl,
        interestImageUrls: updatedInterestItems.map((item) => item.url),
        interestImagesList: updatedInterestItems,
      }));

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
      <div className="w-full max-w-2xl mx-auto my-10 p-12 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-bold text-slate-500">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-6 sm:my-10 space-y-6">
      {/* Top Header & Edit Mode Toggle Button */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {isEditMode
              ? 'Edit your location, bio, interests, and profile pictures'
              : 'Your public Soloberty member card and preferences'}
          </p>
        </div>

        {isEditMode ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false);
                setError(null);
              }}
              disabled={saving}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2.5 bg-[#00AAFF] hover:bg-[#0088CC] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00AAFF]/20 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
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
            className="px-4 py-2.5 bg-[#00AAFF] hover:bg-[#0088CC] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-[#00AAFF]/20 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
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
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Your profile has been updated successfully!</span>
        </motion.div>
      )}

      {/* Error Alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 text-xs sm:text-sm shadow-sm"
        >
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Main Profile Card Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 text-slate-900">
        {/* Static View Mode vs Edit Mode */}
        {!isEditMode ? (
          /* Static View Mode */
          <div className="space-y-6">
            {/* Header Identity Row */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
              {profilePhotoPreview || profileData.profilePhotoUrl ? (
                <img
                  src={profilePhotoPreview || profileData.profilePhotoUrl}
                  alt={profileData.name}
                  className="w-28 h-28 object-cover rounded-full border-4 border-slate-100 shrink-0"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-[#B8E7FF] text-[#00AAFF] flex items-center justify-center border-4 border-slate-100 shrink-0">
                  <User className="w-12 h-12" />
                </div>
              )}
              <div className="space-y-2 text-center sm:text-left flex-1">
                {/* Non-interactive static Name, Age, Gender */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl font-heading font-extrabold tracking-tight text-slate-900">{profileData.name}</h2>
                  <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {profileData.age} yrs
                  </span>
                  <span className="text-xs font-bold text-slate-500 capitalize bg-slate-100 px-3 py-1 rounded-full">
                    {profileData.gender}
                  </span>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-slate-600">
                  <MapPin className="w-4 h-4 text-[#00AAFF]" />
                  <span>{profileData.city || 'Vienna, AT'}</span>
                </div>
              </div>
            </div>

            {/* Static Bio Card */}
            <div className="space-y-2">
              <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400">About Me</h3>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {profileData.bio || 'No bio provided yet.'}
              </p>
            </div>

            {/* Static Interests */}
            <div className="space-y-2">
              <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.interests.length > 0 ? (
                  profileData.interests.map((id) => {
                    const interest = PREDEFINED_INTERESTS.find((i) => i.id === id);
                    return (
                      <span
                        key={id}
                        className="px-3.5 py-1.5 bg-[#B8E7FF] text-[#0088CC] font-bold text-xs rounded-xl border border-[#B8E7FF] flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#00AAFF]" />
                        {interest ? interest.name : id}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-400 italic">No interests selected yet.</span>
                )}
              </div>
            </div>

            {/* Static Interest Photos Grid */}
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-heading font-extrabold uppercase tracking-wider text-slate-400">Interest Photos</h3>
              {interestPreviews.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {interestPreviews.map((url, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
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
          /* Edit Mode */
          <div className="space-y-6">
            {/* Non-Interactive Read-Only Information Display */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Personal Identity (Cannot Be Changed)
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-800">
                <div>
                  <span className="text-xs font-normal text-slate-500 mr-1.5">Name:</span>
                  {profileData.name}
                </div>
                <div className="text-slate-300">•</div>
                <div>
                  <span className="text-xs font-normal text-slate-500 mr-1.5">Age:</span>
                  {profileData.age}
                </div>
                <div className="text-slate-300">•</div>
                <div>
                  <span className="text-xs font-normal text-slate-500 mr-1.5">Gender:</span>
                  <span className="capitalize">{profileData.gender}</span>
                </div>
              </div>
            </div>

            {/* Profile Photo Editor */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Profile Photo
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-slate-200 rounded-2xl bg-slate-50">
                {profilePhotoPreview ? (
                  <div className="relative group shrink-0">
                    <img
                      src={profilePhotoPreview}
                      alt="Profile Preview"
                      className="w-24 h-24 object-cover rounded-full border-4 border-slate-100"
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
                  <div className="w-24 h-24 rounded-full bg-[#B8E7FF] text-[#00AAFF] flex items-center justify-center border border-[#B8E7FF] shrink-0">
                    <User className="w-10 h-10" />
                  </div>
                )}

                <div className="flex items-center gap-2 w-full max-w-xs">
                  <label
                    htmlFor="profilePhotoInputProfile"
                    className="flex-1 py-2.5 px-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-sm flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <Upload className="w-4 h-4 text-[#00AAFF]" />
                    Upload File
                  </label>
                  <button
                    type="button"
                    onClick={openCamera}
                    disabled={isCameraStarting}
                    className="flex-1 py-2.5 px-3 bg-[#00AAFF] hover:bg-[#0088CC] text-white text-xs font-bold rounded-xl shadow-md shadow-[#00AAFF]/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 text-center"
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
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Location Privacy & Coordinates
              </label>

              {/* Location Type Tab Switcher */}
              <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl relative mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setProfileData((prev) => ({ ...prev, locationType: 'approximate' }));
                    setIsGpsDetected(false);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all relative z-10 ${
                    profileData.locationType === 'approximate'
                      ? 'text-[#00AAFF] shadow-sm bg-white'
                      : 'text-slate-500 hover:text-slate-800'
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
                      ? 'text-[#00AAFF] shadow-sm bg-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Exact GPS
                </button>
              </div>

              {profileData.locationType === 'approximate' ? (
                <div className="relative">
                  {/* Upward Autocomplete Dropdown */}
                  {showCityDropdown && citySuggestions.length > 0 && (
                    <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto p-1.5 space-y-1">
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
                          className="w-full text-left p-2.5 hover:bg-[#B8E7FF] rounded-xl transition-colors flex items-center justify-between text-xs font-semibold text-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#00AAFF] shrink-0" />
                            <span>{item.city}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">
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
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#00AAFF] transition-colors"
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
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 cursor-default'
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
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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

            {/* Bio Editor (Manual Only) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Bio
                </label>
                <span className="text-[11px] font-bold text-slate-400">
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
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#00AAFF] transition-colors resize-none"
              />
            </div>

            {/* Interests Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Interests (Select 1 to 3)
                </label>
                <span className="text-xs font-bold text-[#00AAFF]">
                  {profileData.interests.length} / 3
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PREDEFINED_INTERESTS.map((interest) => {
                  const selected = profileData.interests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => toggleInterest(interest.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        selected
                          ? 'bg-[#00AAFF] text-white shadow-sm scale-[1.02]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${selected ? 'text-white' : 'text-slate-400'}`} />
                      {interest.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interest Photos Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Interest Photos (Max 3)
                </label>
                <span className="text-xs font-bold text-blue-600">
                  {interestPreviews.length} / 3
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {interestPreviews.map((url, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
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
                    htmlFor="interestPhotosInputEdit"
                    className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-all p-2 text-center"
                  >
                    <Upload className="w-5 h-5 text-blue-600 mb-1" />
                    <span className="text-[11px] font-bold text-slate-700">Add Photo</span>
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
