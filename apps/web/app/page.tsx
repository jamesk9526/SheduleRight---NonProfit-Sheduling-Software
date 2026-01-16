export default function Home() {
  return (
    <div className="container mt-12">
      <h1 className="text-4xl font-bold text-primary-600">Welcome to SheduleRight</h1>
      <p className="mt-4 text-lg text-neutral-600">
        Offline-first scheduling for non-profit pregnancy care centers
      </p>
      <div className="mt-8 space-y-4">
        <p>This is the MVP app shell. Features coming:</p>
        <ul className="list-inside list-disc space-y-2 text-neutral-700">
          <li>Client scheduling and intake forms</li>
          <li>Staff and volunteer management</li>
          <li>SMS reminders and messaging via Twilio</li>
          <li>Offline-first data sync</li>
          <li>Admin dashboard for customization</li>
        </ul>
      </div>
    </div>
  )
}
