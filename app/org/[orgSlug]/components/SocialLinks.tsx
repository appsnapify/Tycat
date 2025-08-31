import { Instagram, Facebook, Youtube, Twitter, Globe, Music } from 'lucide-react'

interface SocialMedia {
  instagram?: string
  facebook?: string
  youtube?: string
  tiktok?: string
  twitter?: string
  website?: string
}

interface SocialLinksProps {
  socialMedia?: SocialMedia
}

const socialIcons = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: Music,
  twitter: Twitter,
  website: Globe
}

const ensureFullUrl = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

export default function SocialLinks({ socialMedia }: SocialLinksProps) {
  if (!socialMedia) return null

  const socialEntries = Object.entries(socialMedia).filter(([_, url]) => url)
  
  if (socialEntries.length === 0) return null

  return (
          <div className="flex justify-center space-x-3 sm:space-x-4 py-2 sm:py-3 mb-2 sm:mb-3">
      {socialEntries.map(([platform, url]) => {
        const Icon = socialIcons[platform as keyof typeof socialIcons]
        if (!Icon || !url) return null

        return (
          <a
            key={platform}
            href={ensureFullUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
                        className="group relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/80 backdrop-blur-sm border border-slate-200/40 
                       flex items-center justify-center text-slate-600 
                       hover:text-white hover:border-transparent hover:bg-gradient-to-br hover:from-emerald-500 hover:to-violet-500
                       transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
            aria-label={platform}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 group-hover:scale-110" />
          </a>
        )
      })}
    </div>
  )
}
