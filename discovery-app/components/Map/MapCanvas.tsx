'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { UserProfile } from '../../types/user';
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
  currentUserLocation?: { lat: number; lng: number } | null;
  distanceFilter: DistanceOption;
  onBoundsChange: (bounds: ViewportBounds) => void;
  onSelectClusterOrUser: (users: UserProfile[], title: string) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  initialCenter,
  initialZoom,
  targetLocation,
  users,
  currentUserLocation,
  distanceFilter,
  onBoundsChange,
  onSelectClusterOrUser,
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

    // Draw transparent light-blue circle with #00AAFF border
    const circle = L.circle([currentUserLocation.lat, currentUserLocation.lng], {
      radius: radiusMeters,
      color: '#00AAFF',
      weight: 2,
      opacity: 0.85,
      fillColor: '#00AAFF',
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
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      noWrap: false, // let tiles repeat horizontally if needed, while vertical bounds stay strictly locked
      bounds: earthBounds,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

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
    if (targetLocation) {
      map.whenReady(() => {
        if (!map.getContainer()) return;
        map.flyTo([targetLocation.lat, targetLocation.lng], 12, {
          duration: 2.4,
          easeLinearity: 0.25,
        });
      });
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [onBoundsChange]);

  // 3. Render Zoom-Based Clustering & Markers
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // Plot Current User marker if location is available (blinking blue circle)
    if (currentUserLocation && currentUserLocation.lat !== 0 && currentUserLocation.lng !== 0) {
      const userMarkerHtml = `
        <div class="relative flex items-center justify-center w-6 h-6 cursor-pointer">
          <div class="absolute w-6 h-6 rounded-full bg-[#00AAFF]/40 animate-ping"></div>
          <div class="absolute w-4 h-4 rounded-full bg-[#00AAFF]/60 animate-pulse"></div>
          <div class="relative w-3.5 h-3.5 rounded-full bg-[#00AAFF] border-2 border-white dark:border-slate-900 shadow-md"></div>
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
            <div class="relative flex items-center justify-center min-w-11 h-11 px-2.5 rounded-full bg-[#10B981] text-white font-heading font-black text-xs shadow-2xl ring-4 ring-[#10B981]/35 border-2 border-white dark:border-slate-800">
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

        marker.on('click', () => {
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
            <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#10B981] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#10B981]/35 border-2 border-white dark:border-slate-800">
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

        marker.on('click', () => {
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
            <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#10B981] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#10B981]/35 border-2 border-white dark:border-slate-800">
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
        marker.on('click', () => {
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
            <svg class="w-10 h-10 text-[#10B981] drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
              <circle cx="12" cy="10" r="3.5" fill="white" />
            </svg>
          </div>
        `;
      } else {
        // MULTIPLE USERS AT THIS LOCATION (2, 3, 4...): Show emerald green circle with number
        markerHtml = `
          <div class="relative flex items-center justify-center min-w-10 h-10 px-2 rounded-full bg-[#10B981] text-white font-heading font-black text-xs shadow-xl ring-4 ring-[#10B981]/35 border-2 border-white dark:border-slate-800 transition-transform active:scale-95 cursor-pointer ${opacityClass}">
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

      marker.on('click', () => {
        const title = isMulti
          ? `${group.length} People Nearby`
          : `${firstUser.name}${firstUser.age ? `, ${firstUser.age}` : ''}`;
        onSelectClusterOrUser(group, title);
      });
    });
  }, [currentZoom, distanceFilteredUsers, currentUserLocation, onSelectClusterOrUser]);

  return <div ref={containerRef} className="w-full h-full min-h-[300px]" />;
};
