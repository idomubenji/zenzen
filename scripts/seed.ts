import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { ConversationSeed } from './seed-data/types'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_DEV!,
  process.env.SUPABASE_SERVICE_ROLE_KEY_DEV!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// User data from seed plan
const users = [
  // Administrator
  {
    id: 'f8618694-c1d6-4f21-95e6-a2f92fcd480d',
    name: 'Benji',
    email: 'benjamin.vizy@gauntletai.com',
    role: 'Administrator'
  },
  // Workers
  {
    name: 'Miyamoto',
    email: 'miyamoto@zenzen.dev',
    role: 'Worker'
  },
  {
    name: 'Ou',
    email: 'ou@zenzen.dev',
    role: 'Worker'
  },
  {
    name: 'Itami',
    email: 'itami@zenzen.dev',
    role: 'Worker'
  },
  // Customers
  {
    name: 'Mikiko',
    email: 'mikiko@customer.zenzen.dev',
    role: 'Customer'
  },
  {
    name: 'Antwon',
    email: 'antwon@customer.zenzen.dev',
    role: 'Customer'
  },
  {
    name: 'Himemori Luna',
    email: 'luna@customer.zenzen.dev',
    role: 'Customer'
  },
  {
    name: 'Kranky Kong',
    email: 'kranky@customer.zenzen.dev',
    role: 'Customer'
  },
  {
    name: 'Garbage Boy',
    email: 'garbage@customer.zenzen.dev',
    role: 'Customer'
  }
]

async function clearTables() {
  console.log('Clearing existing data...')
  
  // Delete in reverse order of dependencies using raw SQL
  await supabase.from('messages').delete()
  await supabase.from('tickets').delete()
  await supabase.from('user_teams').delete()
  await supabase.from('teams').delete()
  const { error } = await supabase.rpc('truncate_users')
  if (error) {
    console.error('Error truncating users table:', error)
    throw error
  }
  
  console.log('All tables cleared')
}

async function seedUsers() {
  console.log('Seeding users...')
  
  for (const user of users) {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
    
    if (error) {
      console.error(`Error seeding user ${user.name}:`, error)
      continue
    }
    
    console.log(`Seeded user: ${user.name} with id: ${data[0].id}`)
  }
}

async function seedConversation(conversation: ConversationSeed) {
  // First create the ticket
  const { data: ticketData, error: ticketError } = await supabase
    .from('tickets')
    .insert([{
      title: conversation.title,
      status: 'IN PROGRESS',
      customer_id: (await supabase
        .from('users')
        .select('id')
        .eq('email', conversation.customer)
        .single()).data?.id,
      assigned_to: (await supabase
        .from('users')
        .select('id')
        .eq('email', conversation.worker)
        .single()).data?.id,
      tags: conversation.tags
    }])
    .select()
    .single()

  if (ticketError) {
    console.error(`Error creating ticket for conversation ${conversation.title}:`, ticketError)
    return
  }

  // Then create all messages for this ticket
  for (const message of conversation.messages) {
    const { error: messageError } = await supabase
      .from('messages')
      .insert([{
        ticket_id: ticketData.id,
        content: message.content,
        user_id: (await supabase
          .from('users')
          .select('id')
          .eq('email', message.sender)
          .single()).data?.id,
        created_at: message.created_at
      }])

    if (messageError) {
      console.error(`Error creating message in ticket ${ticketData.id}:`, messageError)
    }
  }

  console.log(`Seeded conversation: ${conversation.title}`)
}

async function seedConversations() {
  console.log('Seeding conversations...')
  
  const conversationsDir = path.join(process.cwd(), 'scripts', 'seed-data', 'conversations')
  
  try {
    const files = await fs.readdir(conversationsDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        const conversationData = JSON.parse(
          await fs.readFile(path.join(conversationsDir, file), 'utf-8')
        ) as ConversationSeed
        
        await seedConversation(conversationData)
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log('No conversations to seed yet')
      return
    }
    throw error
  }
}

async function main() {
  try {
    await clearTables()
    await seedUsers()
    await seedConversations()
    console.log('Seed completed successfully')
  } catch (error) {
    console.error('Error during seeding:', error)
    process.exit(1)
  }
}

main() 