"use client"

import { Card } from '@/components/ui/card'
import { Instagram, Facebook, Twitter, Globe, Youtube, Music, Building } from 'lucide-react'

// Accept individual props, including URL strings or File objects
interface OrganizationPreviewProps {
  name?: string
  address?: string
  email?: string // Added email for completeness
  logo?: File | string // Accept File or URL string
  banner?: File | string // Accept File or URL string
  instagram?: string
  facebook?: string
  youtube?: string
  tiktok?: string
  twitter?: string
  website?: string
}

// Destructure props directly
export function OrganizationPreview({
  name = "Nome Organização", // Default values
  address,
  logo,
  banner,
  instagram,
  facebook,
  youtube,
  tiktok,
  twitter,
  website
}: OrganizationPreviewProps) {
  
  // Updated function to handle File or URL string
  const getImagePreviewUrl = (fileOrUrl?: File | string) => {
    if (!fileOrUrl) return ''
    if (typeof fileOrUrl === 'string') {
      return fileOrUrl // It's already a URL
    }
    return URL.createObjectURL(fileOrUrl) // It's a File object
  }

  // Função para renderizar ícone de rede social
  const renderSocialIcon = (type: string, url?: string) => {
    if (!url) return null

    const icons = {
      instagram: <Instagram className="h-5 w-5" />,
      facebook: <Facebook className="h-5 w-5" />,
      youtube: <Youtube className="h-5 w-5" />,
      tiktok: <Music className="h-5 w-5" />,
      twitter: <Twitter className="h-5 w-5" />,
      website: <Globe className="h-5 w-5" />
    }

    // Simplified: Assume URL is already full
    const getFullUrl = (url: string) => {
      // Basic check if it looks like a URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      } 
      // If not, attempt to make it https (might not always be correct, but better than nothing)
      console.warn(`[Preview] Received potentially incomplete URL: ${url}. Assuming https.`);
      return `https://${url}`; 
    }

    return (
      <a 
        href={getFullUrl(url)}
        target="_blank" 
        rel="noopener noreferrer"
        className="text-gray-600 hover:text-gray-900"
      >
        {icons[type as keyof typeof icons]}
      </a>
    )
  }

  return (
    <Card className="overflow-hidden shadow-lg font-sans">
      {/* Banner Container - Ensure it's relative */}
      <div className="relative h-36 w-full bg-gray-200">
        {/* Use the updated function for banner */}
        {banner && (
          <img
            src={getImagePreviewUrl(banner)}
            alt="Banner"
            className="h-full w-full object-cover"
          />
        )}
        
        {/* Frosted Glass Effect Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent backdrop-blur-sm"></div>

        {/* Logo Centered Over Banner - Ensure higher z-index */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-10">
          <div className="h-24 w-24 rounded-full border-4 border-white bg-gray-100 overflow-hidden flex items-center justify-center shadow-md">
            {/* Use the updated function for logo */}
            {logo ? (
              <img
                src={getImagePreviewUrl(logo)}
                alt="Logo"
                className="h-full w-full object-contain"
              />
            ) : (
              <Building className="h-12 w-12 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Informações - Added mt-16 for spacing below logo */}
      <div className="p-6 pt-16 text-center">
        <h2 className="text-2xl font-bold">{name}</h2>
        
        {address && (
          <p className="mt-2 text-sm text-gray-500">{address}</p>
        )}

        {/* Redes Sociais - Centered */}
        <div className="mt-5 flex gap-4 flex-wrap justify-center">
          {renderSocialIcon('instagram', instagram)}
          {renderSocialIcon('facebook', facebook)}
          {renderSocialIcon('youtube', youtube)}
          {renderSocialIcon('tiktok', tiktok)}
          {renderSocialIcon('twitter', twitter)}
          {renderSocialIcon('website', website)}
        </div>
      </div>
    </Card>
  )
} 