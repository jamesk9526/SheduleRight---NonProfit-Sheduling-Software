# Client Management System - UI Navigation Flow

## Page Routes & Navigation Map

```
Dashboard
├─ Client Profiles Card (👥) → /clients
│  └─ "New Client" Button → /clients/new
│     └─ Creates → View Created Client → /clients/[id]
│
├─ Client Custom Fields Card (📋) → /admin/client-fields [Admin Only]
│  └─ "New Field" Button → Create Field
│
└─ Clients List View
   └─ /clients
      ├─ Search Bar
      ├─ Status Filters (All/Active/Inactive/Archived)
      ├─ Sort Options
      ├─ Export CSV
      ├─ "+ New Client" Button
      └─ Table Rows
         └─ "View Profile →" Links → /clients/[id]
            ├─ Profile Tab
            │  └─ "Edit Profile" Button → /clients/[id]/edit
            │     └─ Save → Back to /clients/[id]
            │
            ├─ Notes Tab
            │  ├─ Add Note Form
            │  │  ├─ Note Type (general, follow_up, medical, communication, appointment)
            │  │  ├─ Content Input
            │  │  └─ Add Note Button
            │  └─ Notes Timeline (sorted newest first)
            │     └─ Note Type Badge
            │        └─ Content & Metadata
            │
            └─ Files Tab
               ├─ File Upload (Coming Soon)
               └─ Files List
                  └─ File Metadata (name, type, size, date)
```

---

## User Journey Examples

### Staff Member Creating & Managing a Client

```
1. Login to Dashboard
2. Click "Client Profiles" Card
3. Navigate to /clients (Client List)
4. Click "+ New Client" Button
5. Fill Client Form:
   - Name, Email, Phone
   - Address, Emergency Contact
   - Medical History, Notes
   - Custom Fields (if defined)
6. Submit → Redirects to /clients/[id] (Detail View)
7. View Profile Details
8. Click "Add Note" Button
   - Select Note Type
   - Enter Content
   - Submit Note
9. Note appears in timeline immediately
10. Click "Edit Profile" Button
11. Update Information
12. Save Changes → Returns to /clients/[id]
13. View Updated Profile
```

### Admin Creating Custom Fields

```
1. Login to Dashboard (Admin)
2. Click "Client Custom Fields" Card
3. Navigate to /admin/client-fields
4. Click "+ New Field" Button
5. Fill Field Form:
   - Field Name: "Insurance Provider"
   - Field Type: "Select/Dropdown"
   - Add Options: ["Blue Cross", "Aetna", "United"]
   - Set Required: Yes
6. Submit → Field appears in list
7. Navigate back to create client
8. New field appears in "Custom Fields" section
9. Can now fill this field when creating/editing clients
```

### Searching & Filtering Clients

```
1. Navigate to /clients
2. Type in search box: "John"
   → Filters list by name containing "John"
3. Click "Inactive" status filter
   → Shows only inactive clients
4. Click "Sort by Email" header
   → Sorts clients by email (ascending)
5. Click again
   → Sorts descending
6. Click "Export CSV" button
   → Downloads filtered list as CSV file
7. Click "Active" status filter
   → Back to showing active clients
8. Click client name in table
   → Opens detail page: /clients/[id]
```

### Editing Client Information

```
1. From Client List (/clients)
2. Click "View Profile →" link
3. Land on Client Detail Page (/clients/[id])
4. Click "Edit Profile" Button
5. Navigate to /clients/[id]/edit
6. Form shows all current information:
   - Basic info (first name, last name, etc.)
   - Contact info (address, emergency contact)
   - Health info (medical history, notes)
   - Custom fields (dynamically loaded)
7. Update desired fields
8. Click "Save Changes" Button
9. Shows loading state
10. Returns to /clients/[id]
11. See updated information in profile
```

---

## Component Hierarchy & Data Flow

### Client List Page
```
ClientListPage
├─ Header
│  ├─ Title "Client Profiles"
│  └─ "+ New Client" Button
│
├─ Filters Section
│  ├─ Search Input
│  │  └─ Updates: state → filteredClients
│  │
│  ├─ Status Filters
│  │  ├─ "All" Button
│  │  ├─ "Active" Button
│  │  ├─ "Inactive" Button
│  │  └─ "Archived" Button
│  │     └─ Updates: query param → refetch clients
│  │
│  └─ Export CSV Button
│     └─ Downloads: CSV file
│
├─ Results Counter
│  └─ Shows: {filtered count} of {total count}
│
└─ Client Table
   ├─ Sortable Headers
   │  ├─ "Name" with sort indicator
   │  ├─ "Email" with sort indicator
   │  ├─ "Status" with sort indicator
   │  └─ "Created" with sort indicator
   │
   └─ Table Rows
      └─ Each Row: Client record with
         ├─ Name (sortable, clickable)
         ├─ Email
         ├─ Phone
         ├─ Status Badge (color-coded)
         ├─ Created Date
         └─ "View Profile →" Link
```

### Client Detail Page
```
ClientDetailPage
├─ Header
│  ├─ Client Name + Status Badge
│  ├─ Email
│  ├─ "Edit Profile" Button
│  └─ "← Back" Button
│
├─ Tab Navigation
│  ├─ "📋 Profile" Tab
│  ├─ "💬 Notes (n)" Tab
│  └─ "📁 Files (n)" Tab
│
├─ Tab Content: Profile
│  ├─ Section: Contact Information
│  │  ├─ Email
│  │  ├─ Phone
│  │  ├─ Date of Birth
│  │  └─ Status
│  │
│  ├─ Section: Address & Emergency
│  │  ├─ Address
│  │  └─ Emergency Contact
│  │
│  ├─ Section: Health Information
│  │  ├─ Medical History
│  │  └─ Notes
│  │
│  └─ Section: Custom Fields
│     └─ Dynamic fields from definitions
│
├─ Tab Content: Notes
│  ├─ Add Note Form
│  │  ├─ Note Type Dropdown
│  │  ├─ Content Textarea
│  │  ├─ Cancel Button
│  │  └─ "Add Note" Button
│  │
│  └─ Notes Timeline
│     └─ For each note:
│        ├─ Type Badge (color-coded)
│        ├─ Timestamp
│        ├─ Privacy Indicator
│        ├─ Note Content
│        └─ Tags (if any)
│
└─ Tab Content: Files
   ├─ Upload Placeholder (Coming Soon)
   └─ Files List
      └─ For each file:
         ├─ File Icon
         ├─ File Name
         ├─ Category Badge
         ├─ File Type
         ├─ File Size
         └─ Upload Date
```

### Client Edit Page
```
ClientEditPage
├─ Header
│  ├─ "Edit Client" Title
│  ├─ Client Email (subtitle)
│  └─ "← Cancel" Button
│
└─ Form Sections
   ├─ Section: Basic Information
   │  ├─ First Name Input *
   │  ├─ Last Name Input *
   │  ├─ Email Input (disabled, read-only)
   │  ├─ Phone Input
   │  ├─ Date of Birth Input
   │  └─ Status Dropdown
   │
   ├─ Section: Contact Information
   │  ├─ Address Input
   │  └─ Emergency Contact Input
   │
   ├─ Section: Health Information
   │  ├─ Medical History Textarea
   │  └─ Notes Textarea
   │
   ├─ Section: Custom Fields
   │  └─ Dynamic fields per type:
   │     ├─ Text: Input
   │     ├─ Number: Number Input
   │     ├─ Date: Date Input
   │     ├─ Select: Dropdown
   │     ├─ Checkbox: Checkbox
   │     └─ Textarea: Textarea
   │
   └─ Actions
      ├─ "Save Changes" Button (with loading state)
      └─ "Cancel" Link Button
```

### Create Client Page
```
CreateClientPage
├─ Header
│  ├─ "Create New Client" Title
│  ├─ "Add a new client" Subtitle
│  └─ "← Cancel" Button
│
└─ Form (Same structure as Edit Page)
   ├─ Basic Information Section
   ├─ Contact Information Section
   ├─ Health Information Section
   ├─ Custom Fields Section (if defined)
   │
   └─ Actions
      ├─ "Create Client" Button (with loading state)
      └─ "Cancel" Link Button

Note: All fields match edit form
      Email field is NOT disabled (required for creation)
```

### Custom Fields Admin Page
```
CustomFieldsPage
├─ Header
│  ├─ "Custom Client Fields" Title
│  ├─ "Manage custom fields" Subtitle
│  └─ "+ New Field" Toggle Button
│
├─ Conditional: Show New Field Form
│  │ (when "+ New Field" is clicked)
│  │
│  ├─ Section: Create New Custom Field
│  │  ├─ Field Name Input *
│  │  ├─ Field Type Selector * (text, number, date, select, checkbox, textarea)
│  │  ├─ Options Section (shows only for select type)
│  │  │  ├─ Option Input
│  │  │  ├─ "Add" Button
│  │  │  └─ Options List with Remove buttons
│  │  ├─ "Required field" Checkbox
│  │  │
│  │  └─ Actions
│  │     ├─ "Create Field" Button
│  │     └─ "Cancel" Button
│  │
│  └─ (Form closes after submit or cancel)
│
├─ Fields List Table
│  └─ Columns:
│     ├─ Field Name
│     ├─ Type Badge (color-coded)
│     ├─ Required Indicator (Yes/No)
│     └─ Details (options for select fields)
│
└─ Info Box: Custom Fields Guide
   ├─ Bullet points about field types
   ├─ Information about organization scope
   └─ Tips for field usage
```

---

## Data State Management

### useQuery (Server State)
```
Client List Page:
- client-profiles → GET /api/v1/client-profiles?status=...

Client Detail Page:
- client-profile → GET /api/v1/client-profiles/:id
- client-notes → GET /api/v1/client-profiles/:id/notes
- client-files → GET /api/v1/client-profiles/:id/files

Client Edit Page:
- client-profile → GET /api/v1/client-profiles/:id
- client-field-definitions → GET /api/v1/orgs/:orgId/client-fields

Create Client Page:
- client-field-definitions → GET /api/v1/orgs/:orgId/client-fields

Custom Fields Admin:
- client-field-definitions → GET /api/v1/orgs/:orgId/client-fields
```

### useState (Local State)
```
Client List Page:
- search → string
- sortBy → 'name' | 'email' | 'created' | 'status'
- sortOrder → 'asc' | 'desc'
- statusFilter → 'all' | 'active' | 'inactive' | 'archived'

Client Detail Page:
- activeTab → 'profile' | 'notes' | 'files'
- newNoteContent → string
- newNoteType → note type string
- isAddingNote → boolean

Client Edit Page:
- formData → ClientProfile object
- isSaving → boolean

Create Client Page:
- formData → ClientProfile object
- isCreating → boolean

Custom Fields Admin:
- showNewField → boolean
- newField → CustomField definition object
- optionInput → string
- isCreating → boolean
```

---

## API Call Sequences

### Create New Client Flow
```
1. User fills form on /clients/new
2. Submit button → handleCreate()
3. POST /api/v1/client-profiles
   - Body: { firstName, lastName, clientEmail, ... }
   - Header: Authorization Bearer {token}
4. Response: { data: { id, ... } }
5. useRouter.push(`/clients/${id}`) → Navigate to detail
6. Client Detail page loads:
   - GET /api/v1/client-profiles/:id
   - GET /api/v1/client-profiles/:id/notes
   - GET /api/v1/client-profiles/:id/files
7. Display created client profile
```

### Edit Client Flow
```
1. User on /clients/[id]
2. Click "Edit Profile" → Go to /clients/[id]/edit
3. Page loads client data:
   - GET /api/v1/client-profiles/:id
   - GET /api/v1/orgs/:orgId/client-fields
4. User modifies form fields
5. Click "Save Changes" → handleSave()
6. PUT /api/v1/client-profiles/:id
   - Body: { firstName, lastName, ... , customFields }
   - Header: Authorization Bearer {token}
7. Response: { data: { success: true } }
8. useRouter.push(`/clients/${id}`) → Back to detail
9. Detail page refetches and shows updated data
```

### Add Note Flow
```
1. User on /clients/[id] → Notes tab
2. Fill note form:
   - Type: selected
   - Content: entered
3. Click "Add Note" → handleAddNote()
4. POST /api/v1/client-profiles/:id/notes
   - Body: { type, content, isPrivate }
   - Header: Authorization Bearer {token}
5. Response: { data: { success: true } }
6. Note appears in timeline
7. (Typically would refetch notes list)
```

### Create Custom Field Flow
```
1. Admin on /admin/client-fields
2. Click "+ New Field"
3. Fill field form:
   - Name: entered
   - Type: selected
   - Options: added (if select)
   - Required: checked
4. Click "Create Field" → handleCreateField()
5. POST /api/v1/orgs/:orgId/client-fields
   - Body: { fieldName, fieldType, options, required, displayOrder }
   - Header: Authorization Bearer {token}
6. Response: { data: { id, ... } }
7. Field appears in table
8. Refetch client field definitions for all pages
9. New field shows in create/edit forms
```

---

## Loading & Error States

### Loading States
```
List Page:
- useQuery isLoading → "Loading clients..."

Detail Page:
- useQuery isLoading → "Loading client profile..."

Forms:
- isCreating/isSaving true → Button disabled + loading text

Add Note:
- isAddingNote true → Button disabled + "Adding..." text
```

### Error States
```
List/Detail Page:
- useQuery isError → "Error loading... Please try again"

Not Found:
- !client && !profileLoading → "Client Not Found" message

Access Denied:
- !isStaff → "Access Denied" message for all staff-only pages
- !isAdmin → "Access Denied" message for admin-only pages

Form Errors:
- Missing required fields → alert("... required")
- Select field without options → alert("... add at least one option")
- API errors → alert("Failed to ... Please try again.")
```

### Empty States
```
List Page:
- clients.length === 0 → "No clients found" with create link

Notes Tab:
- notes.length === 0 → "No notes yet" message

Files Tab:
- files.length === 0 → "No files yet" message

Custom Fields:
- fields.length === 0 → "No custom fields yet" with info
```

---

## Complete Navigation Tree

```
Dashboard
│
├─→ /profile
│   └─ View/Edit Profile
│
├─→ /notifications
│   └─ Manage Preferences
│
├─→ /bookings
│   └─ View/Manage Bookings
│
├─→ /clients ⭐ [NEW]
│   ├─ List all clients
│   ├─ Search, filter, sort
│   ├─ Export CSV
│   │
│   ├─→ /clients/new ⭐ [NEW]
│   │   └─ Create new client form
│   │       └─ Save → /clients/[id]
│   │
│   └─→ /clients/[id] ⭐ [NEW]
│       ├─ Profile Tab
│       │  └─→ /clients/[id]/edit ⭐ [NEW]
│       │      └─ Edit client form
│       │          └─ Save → /clients/[id]
│       │
│       ├─ Notes Tab
│       │  ├─ Add note form
│       │  └─ Notes timeline
│       │
│       └─ Files Tab
│           ├─ File upload (coming soon)
│           └─ Files list
│
├─→ /volunteers
│   └─ Manage Volunteers
│
├─→ /reminders
│   └─ Configure SMS Reminders
│
├─→ /properties
│   └─ Manage Field Library
│
├─→ /admin/client-fields ⭐ [NEW]
│   ├─ Create custom field form
│   └─ View all custom fields
│
├─→ /orgs
│   └─ Manage Organizations
│
├─→ /orgs/:id
│   └─ View Organization
│
└─→ /availability
    └─ Manage Availability

⭐ = Newly created for client management
```

---

## Summary

The client management UI provides:
- **5 Main Pages** for complete CRUD operations
- **3 Tab Interface** for organized information
- **Dynamic Forms** with custom field support
- **Advanced Filtering** with search and status filter
- **Data Export** to CSV
- **Full RBAC** enforcement
- **Intuitive Navigation** between pages
- **Loading & Error States** for better UX
- **Responsive Design** for all devices

**All connected to production-ready backend API!** 🚀
