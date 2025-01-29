# ZenZen CRM

A modern CRM platform focused on ticket-based customer support, built with Next.js and Supabase.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker (for local Supabase instance)
- Supabase CLI
- AWS account (for S3 file storage)

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in the required values:
   ```bash
   cp .env.example .env.local
   ```

   The environment file includes configurations for both development and production:
   - Supabase configuration (URLs, keys)
   - Database URLs
   - S3 configuration (buckets, credentials)
   - API configuration (rate limits, keys)
   - File upload settings

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local Supabase instance:
   ```bash
   supabase start
   ```

3. Run database migrations:
   ```bash
   supabase db reset
   ```

### Seeding the Database

The project includes a seed script that will populate your development database with test data including:
- Users (Admin, Workers, and Customers)
- Teams
- Sample tickets
- Test messages
- Coverage schedules
- Response templates

To run the seed script:
```bash
NODE_ENV=development npm run seed
```

### Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

Run Cypress tests:
```bash
# Run tests in headless mode
npm test

# Open Cypress test runner
npm run test:open
```

## Project Structure

```
├── scripts/           # Scripts for database operations
│   └── seed.ts       # Database seeding script
├── src/
│   ├── app/          # Next.js app directory
│   └── types/        # TypeScript type definitions
├── supabase/
│   └── migrations/   # Database migrations
└── types/
    └── supabase.ts   # Generated Supabase types
```

## Database Schema

The database includes the following main tables:
- `users`: Stores all user accounts (administrators, workers, customers)
- `teams`: Groups of workers
- `tickets`: Central object representing customer inquiries
- `messages`: Conversation stream for tickets
- `notes`: Internal annotations on tickets
- `feedback`: Customer ratings and comments
- `files`: References to uploaded files
- `templates`: Reusable response templates
- `coverage_schedules`: Team coverage schedules
- `coverage_shifts`: Individual worker shifts

## Features

- Role-based access control (Administrator, Worker, Customer)
- Real-time updates using Supabase's real-time functionality
- File upload support
- Team management and coverage scheduling
- Response templates
- Performance monitoring
- Comprehensive test coverage

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## License

This project is private and confidential. 