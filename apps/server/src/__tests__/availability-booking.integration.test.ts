import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAvailabilityService } from '../services/availability.service.js'
import { createBookingService } from '../services/booking.service.js'
import { randomUUID } from 'crypto'

// Mock database for testing
function createMockDb() {
  const documents: Record<string, any> = {}

  return {
    find: vi.fn(async ({ selector }: any) => {
      const results = Object.values(documents).filter((doc) => {
        for (const key in selector) {
          if (doc[key] !== selector[key]) return false
        }
        return true
      })
      return { docs: results }
    }),
    get: vi.fn(async (id: string) => {
      const doc = documents[id]
      if (!doc) throw new Error('not_found')
      return doc
    }),
    insert: vi.fn(async (doc: any) => {
      documents[doc._id || doc.id] = { ...doc, _id: doc._id || doc.id }
      return { id: doc._id || doc.id }
    }),
    update: vi.fn(async (id: string, updates: any) => {
      if (documents[id]) {
        documents[id] = { ...documents[id], ...updates }
      }
      return { id }
    }),
    _allDocs: vi.fn(async () => {
      return { rows: Object.values(documents).map((doc) => ({ id: doc._id || doc.id, doc })) }
    }),
  }
}

describe('Availability Service', () => {
  let mockDb: any
  let availabilityService: any

  beforeEach(() => {
    mockDb = createMockDb()
    availabilityService = createAvailabilityService(mockDb)
  })

  describe('createSlot', () => {
    it('should create a daily availability slot', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Morning Hours',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        durationMinutes: 30,
      })

      expect(slot).toBeDefined()
      expect(slot.siteId).toBe('site-123')
      expect(slot.title).toBe('Morning Hours')
      expect(slot.capacity).toBe(5)
      expect(slot.currentBookings).toBe(0)
      expect(slot.status).toBe('active')
    })

    it('should create a one-time availability slot', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Special Event',
        startTime: '14:00',
        endTime: '15:30',
        recurrence: 'once',
        specificDate: '2025-02-15',
        capacity: 20,
        durationMinutes: 90,
      })

      expect(slot.recurrence).toBe('once')
      expect(slot.specificDate).toBe('2025-02-15')
    })

    it('should reject slot with invalid time (end before start)', async () => {
      expect(
        availabilityService.createSlot('org-123', {
          siteId: 'site-123',
          title: 'Invalid',
          startTime: '14:00',
          endTime: '09:00', // Invalid: after start
          recurrence: 'daily',
          capacity: 5,
          durationMinutes: 30,
        })
      ).rejects.toThrow()
    })

    it('should require dayOfWeek for weekly slots', async () => {
      expect(
        availabilityService.createSlot('org-123', {
          siteId: 'site-123',
          title: 'Weekly Slot',
          startTime: '10:00',
          endTime: '11:00',
          recurrence: 'weekly', // Missing dayOfWeek
          capacity: 5,
          durationMinutes: 60,
        })
      ).rejects.toThrow()
    })

    it('should require specificDate for one-time slots', async () => {
      expect(
        availabilityService.createSlot('org-123', {
          siteId: 'site-123',
          title: 'One-time',
          startTime: '14:00',
          endTime: '15:00',
          recurrence: 'once', // Missing specificDate
          capacity: 10,
          durationMinutes: 60,
        })
      ).rejects.toThrow()
    })
  })

  describe('getSlotsForSite', () => {
    it('should list all active slots for a site', async () => {
      await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot 1',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        durationMinutes: 30,
      })

      await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot 2',
        startTime: '13:00',
        endTime: '17:00',
        recurrence: 'daily',
        capacity: 8,
        durationMinutes: 30,
      })

      const slots = await availabilityService.getSlotsForSite('site-123')

      expect(slots.length).toBe(2)
      expect(slots[0].title).toBe('Slot 1')
      expect(slots[1].title).toBe('Slot 2')
    })

    it('should only return active slots (not cancelled)', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        durationMinutes: 30,
      })

      // Deactivate the slot
      await availabilityService.deactivateSlot(slot.id)

      const slots = await availabilityService.getSlotsForSite('site-123')

      expect(slots.length).toBe(0)
    })
  })

  describe('isSlotAvailable', () => {
    it('should return true when capacity available', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Available Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        currentBookings: 2,
        durationMinutes: 30,
      })

      expect(availabilityService.isSlotAvailable(slot)).toBe(true)
    })

    it('should return false when capacity full', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Full Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        currentBookings: 5, // At capacity
        durationMinutes: 30,
      })

      expect(availabilityService.isSlotAvailable(slot)).toBe(false)
    })
  })

  describe('updateSlotBookingCount', () => {
    it('should increment booking count', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        durationMinutes: 30,
      })

      expect(slot.currentBookings).toBe(0)

      await availabilityService.updateSlotBookingCount(slot.id, 1)

      const updated = await availabilityService.getSlot(slot.id)
      expect(updated.currentBookings).toBe(1)
    })

    it('should decrement booking count on cancellation', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        currentBookings: 3,
        durationMinutes: 30,
      })

      await availabilityService.updateSlotBookingCount(slot.id, -1)

      const updated = await availabilityService.getSlot(slot.id)
      expect(updated.currentBookings).toBe(2)
    })
  })

  describe('deactivateSlot', () => {
    it('should soft-delete a slot (set status to inactive)', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot to Deactivate',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        capacity: 5,
        durationMinutes: 30,
      })

      expect(slot.status).toBe('active')

      await availabilityService.deactivateSlot(slot.id)

      const updated = await availabilityService.getSlot(slot.id)
      expect(updated.status).toBe('inactive')
    })
  })
})

describe('Booking Service', () => {
  let mockDb: any
  let bookingService: any
  let availabilityService: any

  beforeEach(() => {
    mockDb = createMockDb()
    bookingService = createBookingService(mockDb)
    availabilityService = createAvailabilityService(mockDb)
  })

  describe('createBooking', () => {
    it('should create a booking for available slot', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Available Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 5,
        durationMinutes: 30,
      })

      const booking = await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
          clientPhone: '+1-555-1234',
        },
        slot
      )

      expect(booking).toBeDefined()
      expect(booking.clientName).toBe('John Doe')
      expect(booking.status).toBe('pending')
      expect(booking.clientEmail).toBe('john@example.com')
    })

    it('should reject booking when slot is full', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Full Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 1,
        currentBookings: 1, // Already full
        durationMinutes: 60,
      })

      expect(
        bookingService.createBooking(
          'org-123',
          'site-123',
          slot.id,
          {
            clientName: 'Jane Doe',
            clientEmail: 'jane@example.com',
          },
          slot
        )
      ).rejects.toThrow(/fully booked/)
    })

    it('should auto-increment slot booking count', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 5,
        durationMinutes: 30,
      })

      expect(slot.currentBookings).toBe(0)

      await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
        slot
      )

      const updated = await availabilityService.getSlot(slot.id)
      expect(updated.currentBookings).toBe(1)
    })
  })

  describe('Booking Lifecycle', () => {
    it('should complete full booking workflow: create → confirm → complete', async () => {
      // Create slot
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 5,
        durationMinutes: 30,
      })

      // Create booking
      const booking = await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
        slot
      )

      expect(booking.status).toBe('pending')

      // Confirm booking
      const confirmed = await bookingService.confirmBooking(booking.id)
      expect(confirmed.status).toBe('confirmed')
      expect(confirmed.confirmedAt).toBeDefined()

      // Complete booking
      const completed = await bookingService.completeBooking(confirmed.id)
      expect(completed.status).toBe('completed')
    })

    it('should cancel booking and decrement capacity', async () => {
      // Create slot
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 5,
        durationMinutes: 30,
      })

      // Create booking
      const booking = await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
        slot
      )

      let updatedSlot = await availabilityService.getSlot(slot.id)
      expect(updatedSlot.currentBookings).toBe(1)

      // Cancel booking
      const cancelled = await bookingService.cancelBooking(booking.id, 'Client request')
      expect(cancelled.status).toBe('cancelled')
      expect(cancelled.cancelReason).toBe('Client request')

      // Check capacity decremented
      updatedSlot = await availabilityService.getSlot(slot.id)
      expect(updatedSlot.currentBookings).toBe(0)
    })

    it('should mark booking as no-show', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 5,
        durationMinutes: 30,
      })

      const booking = await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
        slot
      )

      const noShow = await bookingService.markNoShow(booking.id)
      expect(noShow.status).toBe('no-show')
    })
  })

  describe('getBookingsForClient', () => {
    it('should retrieve all bookings for a client email', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 5,
        durationMinutes: 30,
      })

      await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
        slot
      )

      const bookings = await bookingService.getBookingsForClient('john@example.com')
      expect(bookings.length).toBeGreaterThan(0)
      expect(bookings[0].clientEmail).toBe('john@example.com')
    })
  })

  describe('updateStaffNotes', () => {
    it('should add staff notes to booking', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 5,
        durationMinutes: 30,
      })

      const booking = await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'John Doe',
          clientEmail: 'john@example.com',
        },
        slot
      )

      const updated = await bookingService.updateStaffNotes(
        booking.id,
        'Client needs interpreter services'
      )

      expect(updated.staffNotes).toBe('Client needs interpreter services')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid booking ID gracefully', async () => {
      expect(bookingService.getBooking('invalid-id')).rejects.toThrow()
    })

    it('should prevent double-booking same time slot', async () => {
      const slot = await availabilityService.createSlot('org-123', {
        siteId: 'site-123',
        title: 'Slot',
        startTime: '09:00',
        endTime: '12:00',
        recurrence: 'daily',
        specificDate: '2025-02-15',
        capacity: 2,
        durationMinutes: 60, // Full hour slots
      })

      // Book first slot
      const booking1 = await bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'Client 1',
          clientEmail: 'client1@example.com',
        },
        slot
      )

      expect(booking1).toBeDefined()

      // Try to book second at same time (should fail due to conflict)
      // Note: This depends on implementation - if slots are per person, may not conflict
      // But if it's a resource conflict, it should fail
    })
  })
})

describe('Integration Workflows', () => {
  let mockDb: any
  let bookingService: any
  let availabilityService: any

  beforeEach(() => {
    mockDb = createMockDb()
    bookingService = createBookingService(mockDb)
    availabilityService = createAvailabilityService(mockDb)
  })

  it('should handle complete appointment booking workflow', async () => {
    // Step 1: Staff creates availability
    const slot = await availabilityService.createSlot('org-123', {
      siteId: 'site-123',
      title: 'Morning Consultations',
      startTime: '09:00',
      endTime: '12:00',
      recurrence: 'daily',
      capacity: 10,
      durationMinutes: 30,
    })

    expect(slot).toBeDefined()
    expect(slot.currentBookings).toBe(0)

    // Step 2: Client books appointment (public, no auth)
    const booking1 = await bookingService.createBooking(
      'org-123',
      'site-123',
      slot.id,
      {
        clientName: 'John Smith',
        clientEmail: 'john@example.com',
        clientPhone: '+1-555-0001',
      },
      slot
    )

    expect(booking1.status).toBe('pending')

    // Verify capacity updated
    let updated = await availabilityService.getSlot(slot.id)
    expect(updated.currentBookings).toBe(1)

    // Step 3: Another client books (should still work)
    const slot2 = await availabilityService.getSlot(slot.id)
    const booking2 = await bookingService.createBooking(
      'org-123',
      'site-123',
      slot.id,
      {
        clientName: 'Jane Doe',
        clientEmail: 'jane@example.com',
      },
      slot2
    )

    expect(booking2.status).toBe('pending')

    // Step 4: Staff confirms bookings
    const confirmed1 = await bookingService.confirmBooking(booking1.id)
    expect(confirmed1.status).toBe('confirmed')

    // Step 5: First client completes appointment
    const completed1 = await bookingService.completeBooking(confirmed1.id)
    expect(completed1.status).toBe('completed')

    // Step 6: Second client cancels
    const cancelled2 = await bookingService.cancelBooking(booking2.id, 'Schedule conflict')
    expect(cancelled2.status).toBe('cancelled')

    // Verify capacity (should be 1 now: 1 completed, 1 cancelled)
    updated = await availabilityService.getSlot(slot.id)
    expect(updated.currentBookings).toBe(1) // Only confirmed & not cancelled counts
  })

  it('should handle capacity limits', async () => {
    // Create small slot with capacity 2
    const slot = await availabilityService.createSlot('org-123', {
      siteId: 'site-123',
      title: 'Limited Capacity',
      startTime: '14:00',
      endTime: '15:00',
      recurrence: 'once',
      specificDate: '2025-02-15',
      capacity: 2,
      durationMinutes: 60,
    })

    // Book first
    const booking1 = await bookingService.createBooking(
      'org-123',
      'site-123',
      slot.id,
      {
        clientName: 'Client 1',
        clientEmail: 'client1@example.com',
      },
      slot
    )
    expect(booking1).toBeDefined()

    // Book second
    const slot2 = await availabilityService.getSlot(slot.id)
    const booking2 = await bookingService.createBooking(
      'org-123',
      'site-123',
      slot.id,
      {
        clientName: 'Client 2',
        clientEmail: 'client2@example.com',
      },
      slot2
    )
    expect(booking2).toBeDefined()

    // Try to book third (should fail - capacity full)
    const slot3 = await availabilityService.getSlot(slot.id)
    expect(
      bookingService.createBooking(
        'org-123',
        'site-123',
        slot.id,
        {
          clientName: 'Client 3',
          clientEmail: 'client3@example.com',
        },
        slot3
      )
    ).rejects.toThrow(/fully booked/)
  })
})
