'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X, Calendar, MapPin, Loader2, Sparkles, ImagePlus, Trash2 } from 'lucide-react';
import { EVENT_CATEGORIES, type AppEvent, type EventCategory } from '../../types/event';
import { createCommunityEvent, updateCommunityEvent } from '../../lib/events/firestoreEvents';
import { uploadToCloudinary, getOptimizedCloudinaryUrl } from '../../lib/cloudinary';
import { DateTimePicker } from './DateTimePicker';

const LocationPickerMap = dynamic(
  () => import('./LocationPickerMap').then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading map picker...
      </div>
    ),
  }
);

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (event: AppEvent) => void;
  onUpdated?: (event: AppEvent) => void;
  editingEvent?: AppEvent | null;
  defaultCoords: { lat: number; lng: number };
  user: { uid: string; displayName?: string | null; email?: string | null } | null;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  editingEvent = null,
  defaultCoords,
  user,
}) => {
  const isEditing = Boolean(editingEvent);

  const toLocalDateTimeInput = (iso: string) => {
    try {
      const d = new Date(iso);
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch {
      return defaultDate();
    }
  };

  const defaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('Social');
  const [dateTime, setDateTime] = useState(defaultDate);
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('Vienna, AT');
  const [citySuggestions, setCitySuggestions] = useState<
    { city: string; country: string; code: string; lat: number; lng: number }[]
  >([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [panTrigger, setPanTrigger] = useState(0);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [coordinates, setCoordinates] = useState(defaultCoords);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form fields whenever modal opens for create vs edit
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setCitySuggestions([]);
    setShowCityDropdown(false);

    if (editingEvent) {
      setTitle(editingEvent.title);
      setCategory(editingEvent.category);
      setDateTime(toLocalDateTimeInput(editingEvent.date));
      setVenue(editingEvent.venue);
      setCity(editingEvent.city);
      setDescription(editingEvent.description);
      setImageUrl(editingEvent.imageUrl || '');
      setCoordinates(editingEvent.coordinates);
      setPanTrigger((n) => n + 1);
    } else {
      setTitle('');
      setCategory('Social');
      setDateTime(defaultDate());
      setVenue('');
      setCity('Vienna, AT');
      setDescription('');
      setImageUrl('');
      setCoordinates(defaultCoords);
      setPanTrigger((n) => n + 1);
    }
  }, [isOpen, editingEvent]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user?.uid) {
      setError('Please sign in to upload an event cover image.');
      return;
    }

    setError(null);
    setUploadingImage(true);
    try {
      const uploaded = await uploadToCloudinary(file, `events/${user.uid}`);
      setImageUrl(getOptimizedCloudinaryUrl(uploaded.secure_url));
    } catch (err: any) {
      console.error('Event image upload failed:', err);
      setError(err?.message || 'Could not upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Live city autocomplete matching SignupWizard & ProfileEditor
  useEffect(() => {
    const query = city.trim();
    if (!query || query.length < 2 || query.includes(',')) {
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
      } catch {
        // Silently ignore aborts or network timeouts
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [city]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Please sign in to create a community event.');
      return;
    }

    if (!title.trim() || !venue.trim() || !dateTime) {
      setError('Please fill in the event title, venue, and date.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingEvent) {
        const updated = await updateCommunityEvent({
          eventId: editingEvent.id,
          hostId: user.uid,
          title: title.trim(),
          description:
            description.trim() || `Community ${category.toLowerCase()} meetup at ${venue.trim()}.`,
          date: new Date(dateTime).toISOString(),
          venue: venue.trim(),
          city: city.trim() || 'Nearby',
          coordinates,
          category,
          imageUrl: imageUrl || undefined,
        });
        onUpdated?.(updated);
      } else {
        const created = await createCommunityEvent({
          title: title.trim(),
          description:
            description.trim() || `Community ${category.toLowerCase()} meetup at ${venue.trim()}.`,
          date: new Date(dateTime).toISOString(),
          venue: venue.trim(),
          city: city.trim() || 'Nearby',
          coordinates,
          category,
          imageUrl: imageUrl || undefined,
          hostId: user.uid,
          hostName: user.displayName || user.email?.split('@')[0] || 'Community Host',
        });
        onCreated(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Save event error:', err);
      setError(err?.message || 'Could not save event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#CC5500]/10 dark:bg-[#FF8533]/15 flex items-center justify-center text-[#CC5500] dark:text-[#FF8533]">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold font-heading text-slate-900 dark:text-white">
              {isEditing ? 'Edit Community Event' : 'Create Community Event'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Cover Image (optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={handleImageFileChange}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative h-36 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                <img
                  src={imageUrl}
                  alt="Event cover preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-extrabold shadow cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    aria-label="Remove cover image"
                    className="p-1.5 rounded-xl bg-rose-600 text-white shadow cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#007ABB] dark:hover:border-[#66C2FF] bg-slate-50/70 dark:bg-slate-800/50 text-xs font-bold text-slate-600 dark:text-slate-300 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#007ABB]" />
                    <span>Uploading cover photo...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5 text-[#007ABB] dark:text-[#B8E7FF]" />
                    <span>Click to upload an event cover photo</span>
                    <span className="text-[10px] font-medium text-slate-400">
                      JPG, PNG, WEBP up to 10MB
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sunset Coffee & Sketching"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB]"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                Date &amp; Time *
              </label>
              <DateTimePicker value={dateTime} onChange={setDateTime} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Venue / Spot Name *
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g., MuseumsQuartier Courtyard"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB]"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                City
              </label>
              <input
                type="text"
                maxLength={60}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onFocus={() => {
                  if (citySuggestions.length > 0) setShowCityDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowCityDropdown(false), 180);
                }}
                placeholder="Start typing a city..."
                autoComplete="off"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB]"
              />

              {showCityDropdown && citySuggestions.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-[2100] divide-y divide-slate-100 dark:divide-slate-700/60">
                  {citySuggestions.map((s, idx) => (
                    <li key={`${s.city}-${s.code}-${s.lat}-${idx}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const label = s.code ? `${s.city}, ${s.code}` : s.city;
                          setCity(label);
                          setCoordinates({
                            lat: Number(s.lat.toFixed(5)),
                            lng: Number(s.lng.toFixed(5)),
                          });
                          setPanTrigger((n) => n + 1);
                          setCitySuggestions([]);
                          setShowCityDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700/80 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {s.city}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                          {s.country || s.code}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-[#CC5500]" />
              Pin Exact Location on Map
            </label>
            <LocationPickerMap
              value={coordinates}
              onChange={setCoordinates}
              panTrigger={panTrigger}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              maxLength={350}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's the vibe? Who should come?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#007ABB] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="px-5 py-2.5 rounded-xl bg-[#007ABB] hover:bg-[#00669E] text-white text-xs font-extrabold shadow-md shadow-[#007ABB]/20 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {submitting
                  ? isEditing
                    ? 'Saving...'
                    : 'Creating...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Publish Event'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

