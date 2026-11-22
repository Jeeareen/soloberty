'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LocationPickerMapProps {
  value: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }) => void;
  panTrigger?: number;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  value,
  onChange,
  panTrigger = 0,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = L.map(container, {
      center: [value.lat, value.lng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const pinIcon = L.divIcon({
      html: `
        <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
          <div style="width:28px;height:28px;border-radius:9999px;background:#CC5500;border:2.5px solid #ffffff;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:#ffffff;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      className: 'event-picker-pin',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([value.lat, value.lng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);

    const emitCoords = (lat: number, lng: number) => {
      onChangeRef.current({
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
      });
    };

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      emitCoords(pos.lat, pos.lng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      emitCoords(lat, lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    const invalidate = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    map.whenReady(() => {
      requestAnimationFrame(invalidate);
    });
    const timer = setTimeout(invalidate, 250);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(invalidate);
      resizeObserver.observe(container);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
  }, [value.lat, value.lng]);

  // Pan map smoothly when a city suggestion is selected in the modal
  useEffect(() => {
    if (panTrigger > 0 && mapRef.current) {
      mapRef.current.setView([value.lat, value.lng], 13, { animate: true });
    }
  }, [panTrigger]);

  return (
    <div
      className="space-y-1.5"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        ref={containerRef}
        style={{ height: '220px', width: '100%' }}
        className="relative isolate rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-crosshair"
      />
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Click anywhere on the map or drag the orange pin to set the exact location.
      </p>
    </div>
  );
};
