import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { AvailabilitySlot } from './availability.service.js'

type ServerScope = any

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

/**
 * Booking Service
 * Handles creating and managing bookings
 */
export function createBookingService(db: ServerScope) {
  return {
    /**
     * Create a new booking
     * Validates availability and updates slot counts
     */
    async createBooking(
      orgId: string,
      siteId: string,
      slotId: string,
      clientData: {
        clientName: string
        clientEmail: string
        clientPhone?: string
        clientId?: string
        notes?: string
      },
      slotInfo: AvailabilitySlot
    ): Promise<Booking> {
      try {
        // Check if slot has availability
        if (slotInfo.currentBookings >= slotInfo.capacity) {
          throw new Error('This slot is fully booked')
        }

        // Check for conflicts with existing bookings
        const conflicts = await this.getConflictingBookings(slotId, slotInfo.startTime)
        if (conflicts.length > 0) {
          throw new Error('This time slot is no longer available')
        }

        const bookingId = `booking:${randomUUID()}`
        const now = new Date().toISOString()

        // Calculate end time
        const startDate = new Date(slotInfo.startTime)
        const endDate = new Date(startDate.getTime() + slotInfo.durationMinutes * 60000)
        const endTime = endDate.toISOString()

        const booking: Booking = {
          _id: bookingId,
          type: 'booking',
          id: bookingId,
          siteId,
          orgId,
          slotId,
          clientId: clientData.clientId,
          clientName: clientData.clientName,
          clientEmail: clientData.clientEmail,
          clientPhone: clientData.clientPhone,
          startTime: slotInfo.startTime,
          endTime: endTime,
          durationMinutes: slotInfo.durationMinutes,
          status: 'pending',
          notes: clientData.notes,
          createdAt: now,
          updatedAt: now,
        }

        // Save booking
        const result = await db.insert(booking)
        
        // Update slot booking count
        try {
          const updatedSlot: AvailabilitySlot = {
            ...slotInfo,
            currentBookings: slotInfo.currentBookings + 1,
            updatedAt: now,
          }
          await db.insert(updatedSlot)
        } catch (error) {
          console.error('Error updating slot count:', error)
          // Don't fail - booking is created
        }

        return { ...booking, _id: result.id }
      } catch (error) {
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Failed to create booking')
      }
    },

    /**
     * Get all bookings for a slot
     */
    async getBookingsForSlot(slotId: string): Promise<Booking[]> {
      try {
        const result = await db.find({
          selector: {
            type: 'booking',
            slotId,
            status: { $ne: 'cancelled' },
          },
          limit: 1000,
        })

        return result.docs as Booking[]
      } catch (error) {
        console.error('Error getting bookings:', error)
        throw new Error('Failed to retrieve bookings')
      }
    },

    /**
     * Get conflicting bookings for a time slot
     */
    async getConflictingBookings(
      slotId: string,
      startTime: string
    ): Promise<Booking[]> {
      try {
        const result = await db.find({
          selector: {
            type: 'booking',
            slotId,
            status: { $in: ['confirmed', 'pending'] },
          },
          limit: 1000,
        })

        const bookings = result.docs as Booking[]
        
        // Filter for bookings that overlap with the requested time
        return bookings.filter(booking => {
          const bookingStart = new Date(booking.startTime).getTime()
          const bookingEnd = new Date(booking.endTime).getTime()
          const requestStart = new Date(startTime).getTime()
          
          // Check for overlap
          return requestStart < bookingEnd && requestStart >= bookingStart
        })
      } catch (error) {
        console.error('Error checking conflicts:', error)
        return []
      }
    },

    /**
     * Get a single booking
     */
    async getBooking(bookingId: string): Promise<Booking | null> {
      try {
        const result = await db.find({
          selector: {
            type: 'booking',
            id: bookingId,
          },
          limit: 1,
        })

        if (result.docs.length === 0) {
          return null
        }

        return result.docs[0] as Booking
      } catch (error) {
        console.error('Error getting booking:', error)
        return null
      }
    },

    /**
     * Get all bookings for a site
     */
    async getBookingsForSite(
      siteId: string,
      status?: string
    ): Promise<Booking[]> {
      try {
        const selector: any = {
          type: 'booking',
          siteId,
        }

        if (status) {
          selector.status = status
        }

        const result = await db.find({
          selector,
          limit: 10000,
        })

        return result.docs as Booking[]
      } catch (error) {
        console.error('Error getting bookings for site:', error)
        throw new Error('Failed to retrieve bookings')
      }
    },

    /**
     * Get bookings for a client
     */
    async getBookingsForClient(clientEmail: string): Promise<Booking[]> {
      try {
        const result = await db.find({
          selector: {
            type: 'booking',
            clientEmail,
            status: { $ne: 'cancelled' },
          },
          limit: 1000,
        })

        return result.docs as Booking[]
      } catch (error) {
        console.error('Error getting client bookings:', error)
        throw new Error('Failed to retrieve client bookings')
      }
    },

    /**
     * Confirm a booking (staff action)
     */
    async confirmBooking(bookingId: string): Promise<Booking | null> {
      try {
        const booking = await this.getBooking(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        const updated: Booking = {
          ...booking,
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await db.insert(updated)
        return updated
      } catch (error) {
        console.error('Error confirming booking:', error)
        throw new Error('Failed to confirm booking')
      }
    },

    /**
     * Cancel a booking
     */
    async cancelBooking(
      bookingId: string,
      reason?: string
    ): Promise<Booking | null> {
      try {
        const booking = await this.getBooking(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        // Only allow cancelling pending or confirmed bookings
        if (!['pending', 'confirmed'].includes(booking.status)) {
          throw new Error(`Cannot cancel a ${booking.status} booking`)
        }

        const updated: Booking = {
          ...booking,
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelReason: reason,
          updatedAt: new Date().toISOString(),
        }

        await db.insert(updated)

        // Decrement slot booking count
        try {
          // Get and update the slot
          const slotResult = await db.find({
            selector: {
              type: 'availability',
              id: booking.slotId,
            },
            limit: 1,
          })

          if (slotResult.docs.length > 0) {
            const slot = slotResult.docs[0]
            const updatedSlot = {
              ...slot,
              currentBookings: Math.max(0, slot.currentBookings - 1),
              updatedAt: new Date().toISOString(),
            }
            await db.insert(updatedSlot)
          }
        } catch (error) {
          console.error('Error updating slot on cancellation:', error)
          // Don't fail - booking is cancelled
        }

        return updated
      } catch (error) {
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Failed to cancel booking')
      }
    },

    /**
     * Mark booking as completed
     */
    async completeBooking(bookingId: string): Promise<Booking | null> {
      try {
        const booking = await this.getBooking(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        const updated: Booking = {
          ...booking,
          status: 'completed',
          updatedAt: new Date().toISOString(),
        }

        await db.insert(updated)
        return updated
      } catch (error) {
        console.error('Error completing booking:', error)
        throw new Error('Failed to complete booking')
      }
    },

    /**
     * Mark booking as no-show
     */
    async markNoShow(bookingId: string): Promise<Booking | null> {
      try {
        const booking = await this.getBooking(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        const updated: Booking = {
          ...booking,
          status: 'no-show',
          updatedAt: new Date().toISOString(),
        }

        await db.insert(updated)
        return updated
      } catch (error) {
        console.error('Error marking no-show:', error)
        throw new Error('Failed to mark booking as no-show')
      }
    },

    /**
     * Update staff notes on a booking
     */
    async updateStaffNotes(bookingId: string, notes: string): Promise<Booking | null> {
      try {
        const booking = await this.getBooking(bookingId)
        if (!booking) {
          throw new Error('Booking not found')
        }

        const updated: Booking = {
          ...booking,
          staffNotes: notes,
          updatedAt: new Date().toISOString(),
        }

        await db.insert(updated)
        return updated
      } catch (error) {
        console.error('Error updating staff notes:', error)
        throw new Error('Failed to update booking notes')
      }
    },
  }
}

export type BookingService = ReturnType<typeof createBookingService>
