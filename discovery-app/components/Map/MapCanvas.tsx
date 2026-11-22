'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { UserProfile } from '../../types/user';
import type { AppEvent } from '../../types/event';
import { ViewportBounds } from '../../hooks/useUserMarkers';
import { DistanceOption } from './DistanceFilter';
import {
  calculateDistanceKm,
  COUNTRY_CENTERS,
  extractCountryCode,
  CONTINENT_CENTERS,
  getContinentFromCountry,
} from '../../lib/mapUtils';

interface MapCanvasProps {
  initialCenter: { lat: number; lng: number };
  initialZoom: number;
  targetLocation?: { lat: number; lng: number; zoom: number } | null;
  users: UserProfile[];
  events?: AppEvent[];
  mode?: 'people' | 'events';
  currentUserLocation?: { lat: number; lng: number } | null;
  distanceFilter: DistanceOption;
  onBoundsChange: (bounds: ViewportBounds) => void;
  onSelectClusterOrUser: (users: UserProfile[], title: string) => void;
  onSelectEvents?: (events: AppEvent[], title: string) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  initialCenter,
  initialZoom,
  targetLocation,
  users,
  events = [],
  mode = 'people',
  currentUserLocation,
  distanceFilter,
  onBoundsChange,
  onSelectClusterOrUser,
  onSelectEvents,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusLayerRef = useRef<L.LayerGroup | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(initialZoom);

  // 1. Filter users by Distance Radius if active
  const distanceFilteredUsers = useMemo(() => {
    if (distanceFilter === 'any' || !currentUserLocation) {
      return users;
    }
    return users.filter((u) => {
      const coords = u.location?.coordinates;
      if (!coords) return false;
      const dist = calculateDistanceKm(currentUserLocation, coords);
      return dist <= distanceFilter;
    });
  }, [users, currentUserLocation, distanceFilter]);

  // 1B. Filter events by Distance Radius if active
  const distanceFilteredEvents = useMemo(() => {
    if (distanceFilter === 'any' || !currentUserLocation) {
      return events;
    }
    return events.filter((ev) => {
      const coords = ev.coordinates;
      if (!coords) return false;
      const dist = calculateDistanceKm(currentUserLocation, coords);
      return dist <= distanceFilter;
    });
  }, [events, currentUserLocation, distanceFilter]);

  // Handle distance filter change: zoom/move map & draw transparent light-blue circle
  useEffect(() => {
    const map = mapRef.current;
    const radiusLayer = radiusLayerRef.current;
    if (!map || !radiusLayer) return;

    radiusLayer.clearLayers();

    if (!currentUserLocation || currentUserLocation.lat === 0 || currentUserLocation.lng === 0) {
      return;
    }

    if (distanceFilter === 'any') {
      // Smoothly zoom out to standard overview if desired
      return;
    }

    // Radius in meters
    const radiusMeters = distanceFilter * 1000;

    // Draw transparent light-blue circle with #007ABB border
    const circle = L.circle([currentUserLocation.lat, currentUserLocation.lng], {
      radius: radiusMeters,
      color: '#007ABB',
      weight: 2,
      opacity: 0.85,
      fillColor: '#007ABB',
      fillOpacity: 0.12,
      dashArray: '4, 4',
    }).addTo(radiusLayer);

    // Smoothly fly/fit map bounds to encompass the radius circle
    const bounds = circle.getBounds();
    map.flyToBounds(bounds, {
      padding: [40, 40],
      duration: 0.8,
      easeLinearity: 0.25,
    });
  }, [distanceFilter, currentUserLocation]);

  // 2. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Bounding box of earth (-85 to 85 latitude for Web Mercator, -180 to 180 longitude)
    const southWest = L.latLng(-85.0511, -180);
    const northEast = L.latLng(85.0511, 180);
    const earthBounds = L.latLngBounds(southWest, northEast);

    // Create Map with minZoom = 2 and locked earth bounds so users can't pan into gray borders
    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
      zoomControl: true,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: earthBounds,
      maxBoundsViscosity: 1.0, // 1.0 prevents dragging outside bounds completely
      bounceAtZoomLimits: false,
    });

    // Dark-mode aware / clean OpenStreetMap standard tile layer
    // Use single HTTP/2 host (tile.openstreetmap.org) instead of {s} sharding to avoid 3x TLS handshakes on mobile
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      keepBuffer: 0,
      updateWhenIdle: true,
      updateWhenZooming: false,
      noWrap: false, // let tiles repeat horizontally if needed, while vertical bounds stay strictly locked
      bounds: earthBounds,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" tabindex="-1">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Keep Leaflet / OpenStreetMap attribution visible but skip it during Tab navigation
    containerRef.current.tabIndex = -1;
    containerRef.current
      .querySelectorAll<HTMLAnchorElement>('.leaflet-control-attribution a')
      .forEach((link) => {
        link.tabIndex = -1;
      });

    const radiusLayer = L.layerGroup().addTo(map);
    radiusLayerRef.current = radiusLayer;

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapRef.current = map;

    // Viewport bounds extractor helper with debouncing
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleViewportUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        setCurrentZoom(zoom);

        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          zoom,
        });
      }, 150);
    };

    map.on('moveend', handleViewportUpdate);
    map.on('zoomend', handleViewportUpdate);

    // Initial bounds dispatch
    handleViewportUpdate();

    // If target location is provided on mount, fly from initial active location to target location
    let flyTimer: ReturnType<typeof setTimeout> | null = null;
    if (targetLocation) {
      map.whenReady(() => {
        if (mapRef.current !== map || !map.getContainer()) return;
        flyTimer = setTimeout(() => {
          if (mapRef.current !== map || !map.getContainer()) return;
          map.flyTo([targetLocation.lat, targetLocation.lng], targetLocation.zoom ?? 12, {
            duration: 2.4,
            easeLinearity: 0.25,
          });
        }, 250);
      });
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (flyTimer) clearTimeout(flyTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [onBoundsChange]);

  // 2B. Fly to targetLocation whenever it updates after initial mount (e.g. after Allow Location click)
  const initialTargetRef = useRef<string | null>(
    targetLocation ? `${targetLocation.lat},${targetLocation.lng},${targetLocation.zoom}` : null
  );
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !targetLocation) return;

    const key = `${targetLocation.lat},${targetLocation.lng},${targetLocation.zoom}`;
    if (initialTargetRef.current === key) {
      initialTargetRef.current = null;
      return;
    }

    map.whenReady(() => {
      if (!map.getContainer()) return;
      map.flyTo([targetLocation.lat, targetLocation.lng], targetLocation.zoom ?? 12, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    });
  }, [targetLocation?.lat, targetLocation?.lng, targetLocation?.zoom]);

  // 3. Render Zoom-Based Clustering & Markers
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const bindMarkerActivation = (marker: L.Marker, label: string, onActivate: () => void) => {
      marker.on('click', onActivate);
      const el = marker.getElement();
      if (el) {
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', label);
        el.setAttribute('tabindex', '0');
        el.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onActivate();
          }
        });
      }
    };

    // Plot Current User marker if location is available (blinking blue circle)
    if (currentUserLocation && currentUserLocation.lat !== 0 && currentUserLocation.lng !== 0) {
      const userMarkerHtml = `
        <div class="relative flex items-center justify-center w-6 h-6 cursor-pointer">
          <div class="absolute w-6 h-6 rounded-full bg-[#007ABB]/40 animate-ping"></div>
          <div class="absolute w-4 h-4 rounded-full bg-[#007ABB]/60 animate-pulse"></div>
          <div class="relative w-3.5 h-3.5 rounded-full bg-[#007ABB] border-2 border-white dark:border-slate-900 shadow-md"></div>
        </div>
      `;
      const meIcon = L.divIcon({
        html: userMarkerHtml,
        className: 'custom-user-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([currentUserLocation.lat, currentUserLocation.lng], { icon: meIcon })
        .addTo(markersLayer)
        .bindTooltip('Your Location', { direction: 'top', offset: [0, -12] });
    }

    // Events Mode: mirror the exact 4-tier zoom clustering & bubble/pin logic of People mode in #CC5500
    if (mode === 'events') {
      // A. Zoom <= 2: Continents
      if (currentZoom <= 2) {
        const continentBuckets = new Map<string, AppEvent[]>();
        distanceFilteredEvents.forEach((ev) => {
          const countryCode = extractCountryCode(ev.city);
          const continentCode = getContinentFromCountry(countryCode);
          const existing = continentBuckets.get(continentCode) || [];
          existing.push(ev);
          continentBuckets.set(continentCode, existing);
        });

        continentBuckets.forEach((bucketEvents, continentCode) => {
          const continentInfo = CONTINENT_CENTERS[continentCode] || {
            name: continentCode,
            lat: bucketEvents[0].coordinates.lat,
            lng: bucketEvents[0].coordinates.lng,
          };

          const clusterHtml = `
            <div class="relative flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer">
              <div class="relative flex items-center justify-center min-w-11 h-11 px-2.5 rounded-full bg-[#CC5500] text-white font-heading font-black text-xs shadow-2xl ring-4 ring-[#CC5500]/35 border-2 border-white dark:border-slate-800">
                <span class="text-xs leading-none">${bucketEvents.length}</span>
              </div>
              <span class="mt-1 px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-[10px] font-heading font-extrabold text-slate-800 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                ${continentInfo.name}
              </span>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'custom-cluster-marker',
            iconSize: [44, 52],
            iconAnchor: [22, 26],
          });

          const marker = L.marker([continentInfo.lat, continentInfo.lng], {
            icon: clusterIcon,
          }).addTo(markersLayer);

          bindMarkerActivation(marker, `${continentInfo.name} (${bucketEvents.length} events)`, () => {
            map.flyTo([continentInfo.lat, continentInfo.lng], 4, { duration: 1.0 });
          });
        });
        return;
      }

      // B. Zoom 3–5: Countries
      if (currentZoom >= 3 && currentZoom <= 5) {
        const countryBuckets = new Map<string, AppEvent[]>();
        distanceFilteredEvents.forEach((ev) => {
          const countryCode = extractCountryCode(ev.city);
          const existing = countryBuckets.get(countryCode) || [];
          existing.push(ev);
          countryBuckets.set(countryCode, existing);
        });

        countryBuckets.forEach((bucketEvents, countryCode) => {
          const countryInfo = COUNTRY_CENTERS[countryCode] || {
            name: countryCode,
            lat: bucketEvents[0].coordinates.lat,
            lng: bucketEvents[0].coordinates.lng,
          };

          const clusterHtml = `
            <div class="relative flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer">
              <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#CC5500] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#CC5500]/35 border-2 border-white dark:border-slate-800">
                <span class="text-xs leading-none">${bucketEvents.length}</span>
              </div>
              <span class="mt-1 px-2 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-[10px] font-heading font-extrabold text-slate-800 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                ${countryInfo.name}
              </span>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'custom-cluster-marker',
            iconSize: [44, 52],
            iconAnchor: [22, 26],
          });

          const marker = L.marker([countryInfo.lat, countryInfo.lng], {
            icon: clusterIcon,
          }).addTo(markersLayer);

          bindMarkerActivation(marker, `${countryInfo.name} (${bucketEvents.length} events)`, () => {
            map.flyTo([countryInfo.lat, countryInfo.lng], 7, { duration: 1.0 });
          });
        });
        return;
      }

      // C. Zoom 6–9: Cities
      if (currentZoom >= 6 && currentZoom <= 9) {
        const cityBuckets = new Map<string, AppEvent[]>();
        distanceFilteredEvents.forEach((ev) => {
          const cityName = ev.city || 'Nearby';
          const existing = cityBuckets.get(cityName) || [];
          existing.push(ev);
          cityBuckets.set(cityName, existing);
        });

        cityBuckets.forEach((bucketEvents, cityName) => {
          const avgLat =
            bucketEvents.reduce((sum, ev) => sum + ev.coordinates.lat, 0) / bucketEvents.length;
          const avgLng =
            bucketEvents.reduce((sum, ev) => sum + ev.coordinates.lng, 0) / bucketEvents.length;
          const displayName = cityName.split(',')[0];

          const clusterHtml = `
            <div class="relative flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer">
              <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#CC5500] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#CC5500]/35 border-2 border-white dark:border-slate-800">
                <span class="text-xs leading-none">${bucketEvents.length}</span>
              </div>
              <span class="mt-1 px-2 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-[10px] font-heading font-extrabold text-slate-800 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                ${displayName}
              </span>
            </div>
          `;

          const clusterIcon = L.divIcon({
            html: clusterHtml,
            className: 'custom-cluster-marker',
            iconSize: [44, 52],
            iconAnchor: [22, 26],
          });

          const marker = L.marker([avgLat, avgLng], { icon: clusterIcon }).addTo(markersLayer);
          bindMarkerActivation(marker, `${displayName} (${bucketEvents.length} events)`, () => {
            map.flyTo([avgLat, avgLng], 12, { duration: 1.0 });
          });
        });
        return;
      }

      // D. Zoom 10–18: Detailed View -> Pin for 1 event; cluster bubble with count for 2+ events within 1km
      const processedIds = new Set<string>();
      const eventClusters: AppEvent[][] = [];

      distanceFilteredEvents.forEach((ev) => {
        if (processedIds.has(ev.id)) return;
        const group = [ev];
        processedIds.add(ev.id);

        distanceFilteredEvents.forEach((other) => {
          if (processedIds.has(other.id)) return;
          const d = calculateDistanceKm(ev.coordinates, other.coordinates);
          if (d <= 1.0) {
            group.push(other);
            processedIds.add(other.id);
          }
        });

        eventClusters.push(group);
      });

      eventClusters.forEach((group) => {
        const isMulti = group.length > 1;
        const firstEvent = group[0];

        if (!isMulti) {
          const pinColorClass =
            firstEvent.source === 'community' ? 'text-[#CC5500]' : 'text-indigo-600';
          const safeTitle = firstEvent.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const safeVenue = firstEvent.venue.replace(/</g, '&lt;').replace(/>/g, '&gt;');

          const markerHtml = `
            <div class="relative flex items-center justify-center w-10 h-10 transition-transform active:scale-95 cursor-pointer">
              <svg class="w-10 h-10 ${pinColorClass} drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3.5" fill="white" />
              </svg>
            </div>
          `;

          const icon = L.divIcon({
            html: markerHtml,
            className: 'custom-event-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 36],
          });

          const marker = L.marker([firstEvent.coordinates.lat, firstEvent.coordinates.lng], {
            icon,
          })
            .addTo(markersLayer)
            .bindTooltip(`${safeTitle} · ${safeVenue}`, { direction: 'top', offset: [0, -28] });

          bindMarkerActivation(marker, `Event: ${firstEvent.title} at ${firstEvent.venue}`, () => {
            onSelectEvents?.([firstEvent], firstEvent.title);
          });
        } else {
          const avgLat =
            group.reduce((sum, ev) => sum + ev.coordinates.lat, 0) / group.length;
          const avgLng =
            group.reduce((sum, ev) => sum + ev.coordinates.lng, 0) / group.length;

          const markerHtml = `
            <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#CC5500] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#CC5500]/35 border-2 border-white dark:border-slate-800 transition-transform active:scale-95 cursor-pointer">
              <span class="text-xs leading-none">${group.length}</span>
            </div>
          `;

          const icon = L.divIcon({
            html: markerHtml,
            className: 'custom-cluster-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });

          const marker = L.marker([avgLat, avgLng], { icon }).addTo(markersLayer);
          bindMarkerActivation(marker, `${group.length} Events Nearby`, () => {
            onSelectEvents?.(group, `${group.length} Events Nearby`);
          });
        }
      });
      return;
    }

    // A. Zoom 2: Continents -> Circles with # of users that represent continents
    if (currentZoom <= 2) {
      const continentBuckets = new Map<string, UserProfile[]>();
      distanceFilteredUsers.forEach((u) => {
        const countryCode = extractCountryCode(u.location?.city);
        const continentCode = getContinentFromCountry(countryCode);
        const existing = continentBuckets.get(continentCode) || [];
        existing.push(u);
        continentBuckets.set(continentCode, existing);
      });

      continentBuckets.forEach((bucketUsers, continentCode) => {
        const continentInfo = CONTINENT_CENTERS[continentCode] || {
          name: continentCode,
          lat: bucketUsers[0].location.coordinates.lat,
          lng: bucketUsers[0].location.coordinates.lng,
        };

        const clusterHtml = `
          <div class="relative flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer">
            <div class="relative flex items-center justify-center min-w-11 h-11 px-2.5 rounded-full bg-[#047857] text-white font-heading font-black text-xs shadow-2xl ring-4 ring-[#047857]/35 border-2 border-white dark:border-slate-800">
              <span class="text-xs leading-none">${bucketUsers.length}</span>
            </div>
            <span class="mt-1 px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-[10px] font-heading font-extrabold text-slate-800 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
              ${continentInfo.name}
            </span>
          </div>
        `;

        const clusterIcon = L.divIcon({
          html: clusterHtml,
          className: 'custom-cluster-marker',
          iconSize: [44, 52],
          iconAnchor: [22, 26],
        });

        const marker = L.marker([continentInfo.lat, continentInfo.lng], { icon: clusterIcon }).addTo(
          markersLayer
        );

        bindMarkerActivation(marker, `${continentInfo.name} (${bucketUsers.length} users)`, () => {
          onSelectClusterOrUser(bucketUsers, `${continentInfo.name} (${bucketUsers.length})`);
        });
      });

      return;
    }

    // B. Zoom 3–5: Countries -> Circles with # of users that represent countries
    if (currentZoom >= 3 && currentZoom <= 5) {
      const countryBuckets = new Map<string, UserProfile[]>();
      distanceFilteredUsers.forEach((u) => {
        const countryCode = extractCountryCode(u.location?.city);
        const existing = countryBuckets.get(countryCode) || [];
        existing.push(u);
        countryBuckets.set(countryCode, existing);
      });

      countryBuckets.forEach((bucketUsers, countryCode) => {
        const countryInfo = COUNTRY_CENTERS[countryCode] || {
          name: countryCode,
          lat: bucketUsers[0].location.coordinates.lat,
          lng: bucketUsers[0].location.coordinates.lng,
        };

        const clusterHtml = `
          <div class="relative flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer">
            <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#047857] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#047857]/35 border-2 border-white dark:border-slate-800">
              <span class="text-xs leading-none">${bucketUsers.length}</span>
            </div>
            <span class="mt-1 px-2 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-[10px] font-heading font-extrabold text-slate-800 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
              ${countryInfo.name}
            </span>
          </div>
        `;

        const clusterIcon = L.divIcon({
          html: clusterHtml,
          className: 'custom-cluster-marker',
          iconSize: [44, 52],
          iconAnchor: [22, 26],
        });

        const marker = L.marker([countryInfo.lat, countryInfo.lng], { icon: clusterIcon }).addTo(
          markersLayer
        );

        bindMarkerActivation(marker, `${countryInfo.name} (${bucketUsers.length} users)`, () => {
          onSelectClusterOrUser(bucketUsers, `${countryInfo.name} (${bucketUsers.length})`);
        });
      });

      return;
    }

    // C. Zoom 6–9: Cities -> Circles with number
    if (currentZoom >= 6 && currentZoom <= 9) {
      const cityBuckets = new Map<string, UserProfile[]>();
      distanceFilteredUsers.forEach((u) => {
        const cityName = u.location?.city || 'Unknown City';
        const existing = cityBuckets.get(cityName) || [];
        existing.push(u);
        cityBuckets.set(cityName, existing);
      });

      cityBuckets.forEach((bucketUsers, cityName) => {
        const avgLat =
          bucketUsers.reduce((sum, u) => sum + u.location.coordinates.lat, 0) / bucketUsers.length;
        const avgLng =
          bucketUsers.reduce((sum, u) => sum + u.location.coordinates.lng, 0) / bucketUsers.length;

        const displayName = cityName.split(',')[0];
        const count = bucketUsers.length;
        const clusterHtml = `
          <div class="relative flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer">
            <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#047857] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#047857]/35 border-2 border-white dark:border-slate-800">
              <span class="text-xs leading-none">${count}</span>
            </div>
            <span class="mt-1 px-2 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-[10px] font-heading font-extrabold text-slate-800 dark:text-slate-100 shadow-md border border-slate-200 dark:border-slate-700 whitespace-nowrap">
              ${displayName}
            </span>
          </div>
        `;

        const clusterIcon = L.divIcon({
          html: clusterHtml,
          className: 'custom-cluster-marker',
          iconSize: [44, 52],
          iconAnchor: [22, 26],
        });

        const marker = L.marker([avgLat, avgLng], { icon: clusterIcon }).addTo(markersLayer);
        bindMarkerActivation(marker, `${displayName} (${bucketUsers.length} users)`, () => {
          onSelectClusterOrUser(bucketUsers, `${displayName} (${bucketUsers.length})`);
        });
      });

      return;
    }

    // D. Zoom 10–18: Detailed View -> Location pin if only 1 user; if multiple users (2, 3, 4...), circle with number
    const processedUids = new Set<string>();
    const clusters: UserProfile[][] = [];

    distanceFilteredUsers.forEach((user) => {
      if (processedUids.has(user.uid)) return;

      const group = [user];
      processedUids.add(user.uid);

      distanceFilteredUsers.forEach((other) => {
        if (processedUids.has(other.uid)) return;
        const d = calculateDistanceKm(user.location.coordinates, other.location.coordinates);
        if (d <= 1.0) {
          group.push(other);
          processedUids.add(other.uid);
        }
      });

      clusters.push(group);
    });

    clusters.forEach((group) => {
      const isMulti = group.length > 1;
      const count = group.length;
      const firstUser = group[0];
      const isApproximate = firstUser.location?.type === 'approximate';
      const opacityClass = isApproximate ? 'opacity-80' : 'opacity-100';

      let markerHtml = '';

      if (!isMulti) {
        // EXACTLY ONE USER AT THIS LOCATION: Show with emerald green location pin
        markerHtml = `
          <div class="relative flex items-center justify-center w-10 h-10 transition-transform active:scale-95 ${opacityClass}">
            <svg class="w-10 h-10 text-[#047857] drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3.5" fill="white" />
            </svg>
          </div>
        `;
      } else {
        // MULTIPLE USERS AT THIS LOCATION (2, 3, 4...): Show emerald green circle with number
        markerHtml = `
          <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#047857] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#047857]/35 border-2 border-white dark:border-slate-800 transition-transform active:scale-95 cursor-pointer ${opacityClass}">
            <span class="text-xs leading-none">${count}</span>
          </div>
        `;
      }

      const icon = L.divIcon({
        html: markerHtml,
        className: isMulti ? 'custom-cluster-marker' : 'custom-user-marker',
        iconSize: [40, 40],
        iconAnchor: isMulti ? [20, 20] : [20, 36],
      });

      const marker = L.marker([firstUser.location.coordinates.lat, firstUser.location.coordinates.lng], {
        icon,
      }).addTo(markersLayer);

      const title = isMulti
        ? `${group.length} People Nearby`
        : `${firstUser.name}${firstUser.age ? `, ${firstUser.age}` : ''}`;
      bindMarkerActivation(marker, title, () => {
        onSelectClusterOrUser(group, title);
      });
    });
  }, [
    currentZoom,
    distanceFilteredUsers,
    distanceFilteredEvents,
    mode,
    currentUserLocation,
    onSelectClusterOrUser,
    onSelectEvents,
  ]);

  return <div ref={containerRef} className="w-full h-full min-h-[300px]" />;
};
