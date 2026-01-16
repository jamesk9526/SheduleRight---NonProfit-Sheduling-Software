import { randomUUID } from 'crypto'
import { z } from 'zod'

type ServerScope = any

/**
 * Availability Slot - A time period when a service is available
 * Can be recurring (weekly) or one-time
 */
export interface AvailabilitySlot {
  _id: string
  _rev?: string
  type: 'availability'
  id: string
  siteId: string
  orgId: string
  
  // When the slot is available
  dayOfWeek: number // 0-6 (Sunday-Saturday) for recurring slots
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  
  // Recurrence pattern
  recurrence: 'daily' | 'weekly' | 'monthly' | 'once'
  recurrenceEndDate?: string // ISO date string
  specificDate?: string // ISO date string for 'once' slots
  
  // Capacity and limits
  capacity: number // How many bookings can be made
  currentBookings: number // How many are already booked
  durationMinutes: number // How long each booking is (30, 60, etc)
  buffer?: number // Buffer time between bookings in minutes
  
  // Metadata
  title?: string // e.g., "Walk-in Hours", "Appointment Slots"
  description?: string
  notesForClients?: string
  
  status: 'active' | 'inactive' | 'cancelled'
  createdAt: string
  updatedAt: string
}

/**
 * Booking - A client's reservation for an availability slot
 */
export interface Booking {
  _id: string
  _rev?: string
  type: 'booking'
  id: string
  siteId: string
  orgId: string
  slotId: string // Reference to AvailabilitySlot
  
  // Client information
  clientId?: string // Reference to user if registered
  clientName: string
  clientEmail: string
  clientPhone?: string
  
  // Booking details
  startTime: string // ISO datetime string
  endTime: string // ISO datetime string
  durationMinutes: number
  
  // Status
  status: 'confirmed' | 'pending' | 'cancelled' | 'no-show' | 'completed'
  
  // Notes
  notes?: string
  staffNotes?: string
  
  // Metadata
  confirmedAt?: string // When staff confirmed the booking
  cancelledAt?: string
  cancelReason?: string
  
  createdAt: string
  updatedAt: string
}

// Validation schemas
export const CreateAvailabilitySchema = z.object({
  siteId: z.string(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'once']),
  recurrenceEndDate: z.string().optional(),
  specificDate: z.string().optional(),
  capacity: z.number().min(1),
  durationMinutes: z.number().min(15),
  buffer: z.number().min(0).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  notesForClients: z.string().optional(),
})

export const CreateBookingSchema = z.object({
  slotId: z.string(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateAvailabilityInput = z.infer<typeof CreateAvailabilitySchema>
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>

/**
 * Availability Service
 * Handles creating availability slots and checking availability
 */
export function createAvailabilityService(db: ServerScope) {
  return {
    /**
     * Create a new availability slot
     */
    async createSlot(
      orgId: string,
      input: CreateAvailabilityInput
    ): Promise<AvailabilitySlot> {
      try {
        const slotId = `slot:${randomUUID()}`
        const now = new Date().toISOString()

        // Validate times
        const [startHour, startMin] = input.startTime.split(':').map(Number)
        const [endHour, endMin] = input.endTime.split(':').map(Number)
        const startMinutes = startHour * 60 + startMin
        const endMinutes = endHour * 60 + endMin

        if (endMinutes <= startMinutes) {
          throw new Error('End time must be after start time')
        }

        // Validate day of week for weekly slots
        if (input.recurrence === 'weekly' && input.dayOfWeek === undefined) {
          throw new Error('dayOfWeek is required for weekly slots')
        }

        // Validate specific date for one-time slots
        if (input.recurrence === 'once' && !input.specificDate) {
          throw new Error('specificDate is required for one-time slots')
        }

        const slot: AvailabilitySlot = {
          _id: slotId,
          type: 'availability',
          id: slotId,
          siteId: input.siteId,
          orgId,
          dayOfWeek: input.dayOfWeek ?? 0,
          startTime: input.startTime,
          endTime: input.endTime,
          recurrence: input.recurrence,
          recurrenceEndDate: input.recurrenceEndDate,
          specificDate: input.specificDate,
          capacity: input.capacity,
          currentBookings: 0,
          durationMinutes: input.durationMinutes,
          buffer: input.buffer ?? 0,
          title: input.title,
          description: input.description,
          notesForClients: input.notesForClients,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }

        const result = await db.insert(slot)
        return { ...slot, _id: result.id }
      } catch (error) {
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Failed to create availability slot')
      }
    },

    /**
     * Get slots for a site
     */
    async getSlotsForSite(siteId: string): Promise<AvailabilitySlot[]> {
      try {
        const result = await db.find({
          selector: {
            type: 'availability',
            siteId,
            status: 'active',
          },
          limit: 1000,
        })

        return result.docs as AvailabilitySlot[]
      } catch (error) {
        console.error('Error getting slots:', error)
        throw new Error('Failed to retrieve availability slots')
      }
    },

    /**
     * Get a single slot by ID
     */
    async getSlot(slotId: string): Promise<AvailabilitySlot | null> {
      try {
        const result = await db.find({
          selector: {
            type: 'availability',
            id: slotId,
          },
          limit: 1,
        })

        if (result.docs.length === 0) {
          return null
        }

        return result.docs[0] as AvailabilitySlot
      } catch (error) {
        console.error('Error getting slot:', error)
        return null
      }
    },

    /**
     * Check if a slot has availability
     */
    isSlotAvailable(slot: AvailabilitySlot): boolean {
      return slot.currentBookings < slot.capacity && slot.status === 'active'
    },

    /**
     * Update slot availability count
     */
    async updateSlotBookingCount(
      slotId: string,
      delta: number
    ): Promise<AvailabilitySlot | null> {
      try {
        const slot = await this.getSlot(slotId)
        if (!slot) {
          throw new Error('Slot not found')
        }

        const updated: AvailabilitySlot = {
          ...slot,
          currentBookings: Math.max(0, slot.currentBookings + delta),
          updatedAt: new Date().toISOString(),
        }

        await db.insert(updated)
        return updated
      } catch (error) {
        console.error('Error updating slot booking count:', error)
        throw new Error('Failed to update slot availability')
      }
    },

    /**
     * Deactivate a slot (soft delete)
     */
    async deactivateSlot(slotId: string): Promise<void> {
      try {
        const slot = await this.getSlot(slotId)
        if (!slot) {
          throw new Error('Slot not found')
        }

        const updated: AvailabilitySlot = {
          ...slot,
          status: 'inactive',
          updatedAt: new Date().toISOString(),
        }

        await db.insert(updated)
      } catch (error) {
        console.error('Error deactivating slot:', error)
        throw new Error('Failed to deactivate slot')
      }
    },

    /**
     * List slots for a date range
     */
    async getSlotsForDateRange(
      siteId: string,
      startDate: string,
      endDate: string
    ): Promise<AvailabilitySlot[]> {
      try {
        const result = await db.find({
          selector: {
            type: 'availability',
            siteId,
            status: 'active',
          },
          limit: 1000,
        })

        const slots = result.docs as AvailabilitySlot[]
        
        // Filter by date range for one-time slots
        return slots.filter(slot => {
          if (slot.recurrence === 'once' && slot.specificDate) {
            return slot.specificDate >= startDate && slot.specificDate <= endDate
          }
          // Include recurring slots (they apply to any date)
          return slot.recurrence !== 'once'
        })
      } catch (error) {
        console.error('Error getting slots for date range:', error)
        throw new Error('Failed to retrieve availability slots')
      }
    },
  }
}

export type AvailabilityService = ReturnType<typeof createAvailabilityService>
