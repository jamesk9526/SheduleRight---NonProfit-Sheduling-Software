'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { useClientMessages, useSendClientMessage } from '@/lib/hooks/useData'

export default function BookingMessagesPage() {
  const params = useParams()
  const bookingId = params.bookingId as string
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')

  const { data: messages, isLoading, error } = useClientMessages(bookingId)
  const { mutate: sendMessage, isPending } = useSendClientMessage(bookingId)

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault()
    if (!phoneNumber.trim() || !message.trim()) return

    sendMessage(
      { phoneNumber, message },
      {
        onSuccess: () => {
          setMessage('')
        },
      }
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Messages</h1>
          <p className="mt-2 text-gray-600">Booking ID: {bookingId}</p>
        </div>
        <Link href={`/bookings/${bookingId}`} className="text-indigo-600 hover:text-indigo-700 font-medium">
          ← Back to Booking
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Message</h2>
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+15551234567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={160}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Write a short message (160 characters max)."
            />
            <div className="text-xs text-gray-500 mt-1">{message.length}/160</div>
          </div>
          <button
            type="submit"
            disabled={isPending || !phoneNumber.trim() || !message.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Message History</h2>

        {isLoading && (
          <div className="text-gray-600">Loading messages...</div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Failed to load messages.
          </div>
        )}

        {!isLoading && (!messages || messages.length === 0) && (
          <div className="text-gray-600">No messages yet.</div>
        )}

        <div className="space-y-4">
          {messages?.map((item) => (
            <div key={item._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-900">{item.phoneNumber}</div>
                <div className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
              <p className="mt-2 text-gray-800 whitespace-pre-wrap">{item.message}</p>
              <div className="mt-2 text-xs text-gray-500">Status: {item.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
