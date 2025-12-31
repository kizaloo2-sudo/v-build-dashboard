'use client'

import { useEffect, useState } from 'react'

interface ZoneMarker {
  name: string
  lat: number
  lng: number
  total: number
  rebuild: number
  repair: number
}

const zoneMarkers: ZoneMarker[] = [
  { name: 'คลองแห', lat: 7.0280, lng: 100.4740, total: 156, rebuild: 45, repair: 111 },
  { name: 'คอหงส์', lat: 7.0070, lng: 100.5010, total: 98, rebuild: 28, repair: 70 },
  { name: 'ควนลัง', lat: 6.9850, lng: 100.4350, total: 87, rebuild: 22, repair: 65 },
  { name: 'บ้านพรุ', lat: 6.9420, lng: 100.4680, total: 82, rebuild: 35, repair: 47 },
  { name: 'ทุ่งใหญ่', lat: 7.0450, lng: 100.4280, total: 45, rebuild: 12, repair: 33 },
]

export default function Map() {
  const [mapId] = useState('map-' + Math.random().toString(36).substr(2, 9))

  useEffect(() => {
    let map: any = null

    const initMap = async () => {
      const L = (await import('leaflet')).default

      const container = document.getElementById(mapId)
      if (!container) return

      map = L.map(container, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: false,
      })

      // ใช้ URL แบบ array join เพื่อหลีกเลี่ยงปัญหา
      const tileUrl = ['https:/', '/{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'].join('')
      L.tileLayer(tileUrl).addTo(map)

      zoneMarkers.forEach((zone) => {
        const size = Math.min(Math.max(zone.total / 5, 10), 40)

        const popupHtml = [
          '<div style="padding: 8px;">',
          '<strong style="font-size: 14px; color: #fff;">' + zone.name + '</strong>',
          '<br/>',
          '<span style="color: #888;">Cases: </span>',
          '<span style="color: #60a5fa; font-weight: 600;">' + zone.total + '</span>',
          '</div>'
        ].join('')

        L.circleMarker([zone.lat, zone.lng], {
          radius: size,
          fillColor: '#60a5fa',
          color: '#3b82f6',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.6,
        })
          .addTo(map)
          .bindPopup(popupHtml)
      })

      const bounds = L.latLngBounds(zoneMarkers.map(z => [z.lat, z.lng]))
      map.fitBounds(bounds, { padding: [50, 50] })
    }

    const timer = setTimeout(initMap, 100)

    return () => {
      clearTimeout(timer)
      if (map) {
        map.remove()
        map = null
      }
    }
  }, [mapId])

  return <div id={mapId} className="map-container" />
}