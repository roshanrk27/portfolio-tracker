import { z } from 'zod'

// Goal form validation schema
export const goalFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Goal name is required')
    .max(100, 'Goal name must be less than 100 characters')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform(val => val?.trim() || ''),
  targetAmount: z
    .string()
    .min(1, 'Target amount is required')
    .transform((val, ctx) => {
      const num = parseFloat(val)
      if (isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target amount must be a valid number'
        })
        return z.NEVER
      }
      if (num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target amount must be greater than 0'
        })
        return z.NEVER
      }
      if (num > 1000000000) { // 1 billion limit
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target amount must be less than ₹1,000,000,000'
        })
        return z.NEVER
      }
      return num
    }),
  targetDate: z
    .string()
    .min(1, 'Target date is required')
    .transform((val, ctx) => {
      const date = new Date(val)
      if (isNaN(date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid date format'
        })
        return z.NEVER
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (date <= today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Target date must be in the future'
        })
        return z.NEVER
      }
      return val
    })
})

export type GoalFormData = z.infer<typeof goalFormSchema>

// Goal edit validation schema (for editing existing goals)
export const goalEditSchema = z.object({
  targetAmount: z
    .number()
    .positive('Target amount must be positive')
    .max(1000000000, 'Target amount must be less than ₹1,000,000,000'),
  targetDate: z
    .string()
    .min(1, 'Target date is required')
    .refine((val) => {
      const date = new Date(val)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date > today
    }, 'Target date must be in the future')
})

export type GoalEditData = z.infer<typeof goalEditSchema>

// File upload validation schema
export const fileUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, 'File cannot be empty')
    .refine((file) => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine((file) => {
      const allowedTypes = ['text/csv', 'application/csv', 'application/pdf']
      return allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.pdf')
    }, 'File must be a CSV or PDF file')
})

export type FileUploadData = z.infer<typeof fileUploadSchema>

// Stock form validation schema
export const stockFormSchema = z.object({
  stockCode: z
    .string()
    .min(1, 'Stock code is required')
    .max(20, 'Stock code must be less than 20 characters')
    .trim()
    .toUpperCase(),
  quantity: z
    .string()
    .min(1, 'Quantity is required')
    .transform((val, ctx) => {
      const num = parseFloat(val)
      if (isNaN(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Quantity must be a valid number'
        })
        return z.NEVER
      }
      if (num <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Quantity must be greater than 0'
        })
        return z.NEVER
      }
      if (num > 1000000) { // 1 million shares limit
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Quantity must be less than 1,000,000'
        })
        return z.NEVER
      }
      // Check for more than 3 decimal places
      const decimalPlaces = val.includes('.') ? val.split('.')[1].length : 0
      if (decimalPlaces > 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Quantity can have maximum 3 decimal places'
        })
        return z.NEVER
      }
      return num
    }),
  purchaseDate: z
    .string()
    .min(1, 'Purchase date is required')
    .transform((val, ctx) => {
      const date = new Date(val)
      if (isNaN(date.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid date format'
        })
        return z.NEVER
      }
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (date > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Purchase date cannot be in the future'
        })
        return z.NEVER
      }
      return val
    })
})

export type StockFormData = z.infer<typeof stockFormSchema>

// Helper function to format validation errors
export const formatValidationErrors = (errors: z.ZodError) => {
  return errors.errors.map(error => error.message).join(', ')
} 