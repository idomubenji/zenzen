import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import * as dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Initialize Supabase client using development environment variables
const isDev = process.env.NODE_ENV !== 'production'
const supabaseUrl = isDev 
  ? process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!
  : process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!
const supabaseServiceKey = isDev
  ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV!
  : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables. Please check your .env.local file.')
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

type Tables = Database['public']['Tables']
type UserRow = Tables['users']['Row']
type TeamRow = Tables['teams']['Row']
type TicketRow = Tables['tickets']['Row']

async function seedUsers() {
  // Create admin user
  const { data: admin, error: adminError } = await supabase.from('users').insert({
    email: 'admin@example.com',
    role: 'Administrator',
    name: 'Admin User'
  }).select().single()
  
  if (adminError) throw adminError

  // Create workers
  const workers = [
    { email: 'worker1@example.com', name: 'Worker One' },
    { email: 'worker2@example.com', name: 'Worker Two' },
    { email: 'worker3@example.com', name: 'Worker Three' }
  ]

  const { data: createdWorkers, error: workersError } = await supabase
    .from('users')
    .insert(workers.map(w => ({ ...w, role: 'Worker' as const })))
    .select()

  if (workersError) throw workersError

  // Create customers
  const customers = [
    { email: 'customer1@example.com', name: 'Customer One' },
    { email: 'customer2@example.com', name: 'Customer Two' },
    { email: 'customer3@example.com', name: 'Customer Three' },
    { email: 'customer4@example.com', name: 'Customer Four' },
    { email: 'customer5@example.com', name: 'Customer Five' }
  ]

  const { data: createdCustomers, error: customersError } = await supabase
    .from('users')
    .insert(customers.map(customer => ({ ...customer, role: 'Customer' as const })))
    .select()

  if (customersError) throw customersError

  return {
    admin,
    workers: createdWorkers,
    customers: createdCustomers
  }
}

async function seedTeams(admin: UserRow) {
  const teams = [
    { name: 'Technical Support', focus_area: 'Technical Issues' },
    { name: 'Customer Service', focus_area: 'General Support' },
    { name: 'Billing Support', focus_area: 'Billing and Payments' }
  ]

  const { data: createdTeams, error: teamsError } = await supabase
    .from('teams')
    .insert(teams)
    .select()

  if (teamsError) throw teamsError

  return createdTeams
}

async function assignWorkersToTeams(teams: TeamRow[], workers: UserRow[]) {
  const assignments: { user_id: string; team_id: string }[] = []
  
  // Assign each worker to 1-2 teams randomly
  for (const worker of workers) {
    const numTeams = Math.floor(Math.random() * 2) + 1
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5)
    
    for (let i = 0; i < numTeams; i++) {
      assignments.push({
        user_id: worker.id,
        team_id: shuffledTeams[i].id
      })
    }
  }

  const { error: assignError } = await supabase
    .from('user_teams')
    .insert(assignments)

  if (assignError) throw assignError
}

async function seedTickets(customers: UserRow[], teams: TeamRow[]) {
  const tickets: Tables['tickets']['Insert'][] = []
  const statuses = ['UNOPENED', 'IN PROGRESS', 'RESOLVED', 'UNRESOLVED'] as const
  const priorities = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

  for (const customer of customers) {
    // Create 2-4 tickets per customer
    const numTickets = Math.floor(Math.random() * 3) + 2
    
    for (let i = 0; i < numTickets; i++) {
      tickets.push({
        customer_id: customer.id,
        title: `Sample Ticket ${i + 1} from ${customer.name}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        assigned_team: teams[Math.floor(Math.random() * teams.length)].id,
        tags: ['sample', 'test-data'],
        custom_fields: { source: 'seed-script' }
      })
    }
  }

  const { data: createdTickets, error: ticketsError } = await supabase
    .from('tickets')
    .insert(tickets)
    .select()

  if (ticketsError) throw ticketsError

  return createdTickets
}

async function seedMessages(tickets: TicketRow[], users: { 
  admin: UserRow; 
  workers: UserRow[]; 
  customers: UserRow[] 
}) {
  const messages: Tables['messages']['Insert'][] = []

  for (const ticket of tickets) {
    // Add 2-5 messages per ticket
    const numMessages = Math.floor(Math.random() * 4) + 2
    
    for (let i = 0; i < numMessages; i++) {
      // Randomly select a user that can message on this ticket
      const isCustomerMessage = Math.random() < 0.5
      let user: UserRow
      
      if (isCustomerMessage) {
        const customer = users.customers.find(c => c.id === ticket.customer_id)
        if (!customer) continue
        user = customer
      } else {
        // Randomly select admin or worker
        const staffUsers = [users.admin, ...users.workers]
        user = staffUsers[Math.floor(Math.random() * staffUsers.length)]
      }

      messages.push({
        ticket_id: ticket.id,
        user_id: user.id,
        content: `Sample message ${i + 1} from ${user.name} on ticket ${ticket.title}`
      })
    }
  }

  const { error: messagesError } = await supabase
    .from('messages')
    .insert(messages)

  if (messagesError) throw messagesError
}

async function seedTemplates(worker: UserRow) {
  const templates: Tables['templates']['Insert'][] = [
    {
      title: 'Technical Issue Response',
      content: 'Thank you for reporting this technical issue. Could you please provide more details about the error you\'re experiencing?',
      created_by: worker.id
    },
    {
      title: 'Billing Question Response',
      content: 'I understand you have a question about billing. I\'ll be happy to help clarify any charges on your account.',
      created_by: worker.id
    },
    {
      title: 'General Thank You',
      content: 'Thank you for reaching out to our support team. We appreciate your patience.',
      created_by: worker.id
    }
  ]

  const { error: templatesError } = await supabase
    .from('templates')
    .insert(templates)

  if (templatesError) throw templatesError
}

async function seedCoverageSchedules(teams: TeamRow[], workers: UserRow[]) {
  console.log('Creating schedules with teams:', teams)
  console.log('And workers:', workers)
  
  // Create schedules for next 2 weeks
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 14)

  const schedules: Tables['coverage_schedules']['Insert'][] = teams.map(team => ({
    team_id: team.id,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    created_by: workers[0].id,
    timezone: 'America/New_York'
  }))

  console.log('Inserting schedules:', schedules)
  const { data: createdSchedules, error: schedulesError } = await supabase
    .from('coverage_schedules')
    .insert(schedules)
    .select()

  if (schedulesError) throw schedulesError
  if (!createdSchedules) throw new Error('No schedules were created')
  
  console.log('Created schedules:', createdSchedules)

  // Create shifts for each schedule
  const shifts: Tables['coverage_shifts']['Insert'][] = []
  let dayCount = 0 // Keep track of days since start
  
  for (const schedule of createdSchedules) {
    console.log('Creating shifts for schedule:', schedule)
    const currentDate = new Date(schedule.start_date)
    const scheduleEndDate = new Date(schedule.end_date)

    while (currentDate <= scheduleEndDate) {
      // Assign one worker per shift, rotating through workers
      const workerIndex = dayCount % workers.length
      const worker = workers[workerIndex]
      console.log('Selected worker for shift:', worker)
      
      // Create one 8-hour shift per day, with different start times for each team
      const teamIndex = teams.findIndex(t => t.id === schedule.team_id)
      console.log('Team index for shift:', teamIndex)
      const shiftStart = new Date(currentDate)
      shiftStart.setHours(8 + (teamIndex * 8), 0, 0, 0) // Team 1: 8 AM, Team 2: 4 PM, Team 3: 12 AM
      
      const shiftEnd = new Date(shiftStart)
      shiftEnd.setHours(shiftStart.getHours() + 8) // 8-hour shift

      const shift = {
        schedule_id: schedule.id,
        worker_id: worker.id,
        start_time: shiftStart.toISOString(),
        end_time: shiftEnd.toISOString()
      }
      console.log('Created shift:', shift)
      shifts.push(shift)

      currentDate.setDate(currentDate.getDate() + 1)
      dayCount++
    }
  }

  console.log('Inserting shifts:', shifts)
  const { error: shiftsError } = await supabase
    .from('coverage_shifts')
    .insert(shifts)

  if (shiftsError) throw shiftsError
}

async function clearExistingData() {
  const tables: (keyof Database['public']['Tables'])[] = [
    'worker_chat_messages',
    'coverage_shifts',
    'coverage_schedules',
    'messages',
    'notes',
    'tickets',
    'feedback',
    'files',
    'help_articles',
    'teams',
    'users'
  ]
  
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error && error.code !== '42P01') { // Ignore "relation does not exist" errors
      console.warn(`Warning: Error clearing ${table}:`, error)
    }
  }
}

async function main() {
  try {
    console.log('🌱 Starting seed process...')
    
    await clearExistingData()
    
    console.log('Creating users...')
    const users = await seedUsers()
    
    console.log('Creating teams...')
    const teams = await seedTeams(users.admin)
    
    console.log('Assigning workers to teams...')
    await assignWorkersToTeams(teams, users.workers)
    
    console.log('Creating tickets...')
    const tickets = await seedTickets(users.customers, teams)
    
    console.log('Creating messages for tickets...')
    await seedMessages(tickets, users)
    
    console.log('Creating response templates...')
    await seedTemplates(users.workers[0])
    
    console.log('Creating coverage schedules...')
    await seedCoverageSchedules(teams, users.workers)
    
    console.log('✅ Seed completed successfully!')
  } catch (error) {
    console.error('❌ Error during seed:', error)
    process.exit(1)
  }
}

main() 