/**
 * Dashboard Theme - Define todas as configurações visuais para os dashboards do sistema
 */

export const dashboardTheme = {
  colors: {
    card: {
      bg: "bg-white",
      border: "border-gray-200",
      hoverBorder: "hover:border-gray-300"
    },
    text: {
      primary: "text-gray-900",
      secondary: "text-gray-500", 
      muted: "text-gray-400",
      accent: "text-lime-500",
      accentFuchsia: "text-fuchsia-500"
    },
    badge: {
      red: "bg-red-100 text-red-800",
      green: "bg-green-100 text-green-800",
      fuchsia: "bg-fuchsia-100 text-fuchsia-800",
      yellow: "bg-amber-100 text-amber-800",
      gray: "bg-gray-100 text-gray-800",
      purple: "bg-purple-100 text-purple-800"
    },
    button: {
      primary: "bg-lime-500 hover:bg-lime-600 text-white",
      secondary: "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700",
      accent: "bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
    },
    sidebar: {
      bg: "bg-gray-900",
      text: "text-gray-300",
      hover: "hover:bg-gray-800 hover:text-lime-400",
      active: "bg-gray-800 text-lime-400 border-l-2 border-lime-400",
      border: "border-gray-800"
    },
    main: {
      bg: "bg-gray-50",
      card: "bg-white"
    },
    gradient: {
      lime: "from-lime-50 to-lime-100 border-lime-200",
      fuchsia: "from-fuchsia-50 to-fuchsia-100 border-fuchsia-200",
      secondary: "from-fuchsia-50 to-fuchsia-100 border-fuchsia-200",
      amber: "from-amber-50 to-amber-100 border-amber-200"
    }
  },
  status: {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800", 
    completed: "bg-lime-100 text-lime-800",
    draft: "bg-purple-100 text-purple-800"
  },
  animation: {
    transition: "transition-all duration-200",
    fadeIn: "animate-fade-in",
    pulse: "animate-pulse"
  }
} 