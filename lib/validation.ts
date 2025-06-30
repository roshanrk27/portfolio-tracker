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
      const allowedTypes = ['text/csv', 'application/csv']
      return allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.csv')
    }, 'File must be a CSV file')
})

export type FileUploadData = z.infer<typeof fileUploadSchema>

// Helper function to format validation errors
export const formatValidationErrors = (errors: z.ZodError) => {
  return errors.errors.map(error => error.message).join(', ')
} 