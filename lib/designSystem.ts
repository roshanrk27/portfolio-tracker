// Design System - Portfolio Tracker App
// This file documents the consistent styling patterns used across the application

export const designSystem = {
  // Modal Styles
  modal: {
    overlay: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",
    container: "bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto",
    header: "flex justify-between items-center mb-8",
    title: "text-2xl font-bold text-gray-900",
    closeButton: "text-neutral-500 hover:text-neutral-800 p-2 rounded-full hover:bg-neutral-100 transition-colors"
  },

  // Form Styles
  form: {
    container: "space-y-6",
    field: "space-y-3",
    label: "block text-sm font-semibold text-gray-700 mb-3",
    input: "w-full h-12 px-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-400 transition-colors border-gray-300 hover:border-gray-400",
    inputError: "border-red-500 focus:ring-red-500 focus:border-red-500",
    textarea: "w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-400 resize-none transition-colors border-gray-300 hover:border-gray-400",
    error: "mt-2 text-sm text-red-600",
    errorContainer: "bg-red-50 border border-red-200 rounded-lg p-4"
  },

  // Button Styles
  button: {
    primary: "h-12 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium",
    secondary: "h-12 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium text-gray-700",
    group: "flex gap-4 pt-6"
  },

  // Card Styles
  card: {
    container: "bg-white rounded-2xl shadow-xl p-8 border border-gray-100",
    header: "mb-8",
    title: "text-3xl font-bold text-gray-900"
  },

  // Status Messages
  status: {
    success: "bg-green-50 text-green-700 border-green-200",
    error: "bg-red-50 text-red-700 border-red-200", 
    info: "bg-blue-50 text-blue-700 border-blue-200",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
    container: "p-4 rounded-lg border"
  },

  // Table Styles
  table: {
    container: "w-full border-collapse border border-gray-200 rounded-lg overflow-hidden",
    header: "bg-gray-50",
    headerCell: "px-4 py-3 text-left text-sm font-medium text-gray-700 border-b",
    cell: "px-4 py-3 text-sm text-gray-900 border-b border-gray-100",
    row: "hover:bg-gray-50 transition-colors"
  },

  // Navigation
  nav: {
    link: "text-gray-600 hover:text-gray-900 transition-colors",
    active: "text-blue-600 font-medium"
  },

  // Spacing
  spacing: {
    xs: "space-y-2",
    sm: "space-y-3", 
    md: "space-y-4",
    lg: "space-y-6",
    xl: "space-y-8"
  },

  // Typography
  typography: {
    h1: "text-3xl font-bold text-gray-900",
    h2: "text-2xl font-bold text-gray-900", 
    h3: "text-xl font-semibold text-gray-900",
    body: "text-sm text-gray-600",
    label: "text-sm font-semibold text-gray-700"
  }
}

// Helper function to get modal styles
export const getModalStyles = (size: 'sm' | 'md' | 'lg' = 'md') => {
  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg'
  }
  
  return {
    overlay: designSystem.modal.overlay,
    container: `${designSystem.modal.container} ${maxWidths[size]}`
  }
}

// Helper function to get form field styles
export const getFormFieldStyles = (hasError: boolean = false) => {
  return {
    input: `${designSystem.form.input} ${hasError ? designSystem.form.inputError : ''}`,
    error: hasError ? designSystem.form.error : ''
  }
} 