'use client'

import React, { useState } from 'react';
import { 
    ComposableMap, 
    Geographies, 
    Geography,
    Marker
} from 'react-simple-maps';

// Interface para os dados de distribuição geográfica
interface GeoDistribution {
    postal_code: string;
    city: string;
    latitude: number;
    longitude: number;
    count: number;
}

interface MapChartProps {
    geoData: GeoDistribution[];
}

export default function MapChart({ geoData }: MapChartProps) {
    // Encontrar o valor máximo para escala de tamanho dos marcadores
    const maxCount = Math.max(...geoData.map(d => d.count || 1));
    
    // Transformar os dados para o formato dos marcadores
    const markers = geoData
        .filter(d => d.latitude !== 0 && d.longitude !== 0) // Filtrar localizações inválidas
        .map(d => ({
            name: d.city,
            coordinates: [d.longitude, d.latitude],
            count: d.count || 1,
            size: 4 + (d.count / Math.max(maxCount, 1)) * 15 // Tamanho relativo baseado na contagem
        }));
    
    // Se não tivermos dados suficientes, adicionar alguns marcadores demonstrativos
    const demoMarkers = markers.length < 3 ? [
        { name: "Lisboa", coordinates: [-9.1393, 38.7223], count: 5, size: 10 },
        { name: "Porto", coordinates: [-8.6291, 41.1579], count: 3, size: 8 },
        { name: "Braga", coordinates: [-8.4265, 41.5454], count: 2, size: 6 }
    ] : [];
    
    const displayMarkers = markers.length > 0 ? markers : demoMarkers;
    
    return (
        <div className="h-full w-full">
            {/* Mapa de Portugal */}
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    center: [-8.2, 39.5], // Centrado em Portugal
                    scale: 3000
                }}
                style={{
                    width: "100%",
                    height: "100%"
                }}
            >
                {/* Tentativa de carregar o mapa de Portugal */}
                <Geographies geography="/portugal.json">
                    {({ geographies }) =>
                        geographies.map(geo => (
                            <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill="#e2e8f0"
                                stroke="#cbd5e1"
                                strokeWidth={0.5}
                                style={{
                                    default: { outline: "none" },
                                    hover: { outline: "none", fill: "#f1f5f9" },
                                    pressed: { outline: "none" }
                                }}
                            />
                        ))
                    }
                </Geographies>
                
                {/* Marcadores para cada cidade */}
                {displayMarkers.map(({ name, coordinates, count, size }, i) => (
                    <Marker key={i} coordinates={coordinates as [number, number]}>
                        <circle
                            r={size}
                            fill="#0ea5e9"
                            stroke="#0284c7"
                            strokeWidth={1}
                            opacity={0.8}
                        />
                        {/* Tooltip visual no hover */}
                        <title>{`${name}: ${count} convidados`}</title>
                    </Marker>
                ))}
            </ComposableMap>
        </div>
    );
} 