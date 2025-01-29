-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM users
    WHERE id = (SELECT auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is an administrator
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT get_user_role()) = 'Administrator';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a worker
CREATE OR REPLACE FUNCTION is_worker()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT get_user_role()) = 'Worker';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- USERS table policies
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY "Admins have full access to users"
  ON users FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view all users"
  ON users FOR SELECT
  TO authenticated
  USING ((SELECT is_worker()));

CREATE POLICY "Customers can view worker profiles"
  ON users FOR SELECT
  TO authenticated
  USING (role = 'Worker');

-- Allow initial user creation during signup
CREATE POLICY "Allow initial user creation"
  ON users FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- TEAMS table policies
CREATE POLICY "Service role has full access to teams"
  ON teams FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to teams"
  ON teams FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view all teams"
  ON teams FOR SELECT
  TO authenticated
  USING ((SELECT is_worker()));

-- USER_TEAMS table policies
CREATE POLICY "Service role has full access to user_teams"
  ON user_teams FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to user_teams"
  ON user_teams FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view all user_teams"
  ON user_teams FOR SELECT
  TO authenticated
  USING ((SELECT is_worker()));

CREATE POLICY "Users can view their own team associations"
  ON user_teams FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- TICKETS table policies
CREATE POLICY "Service role has full access to tickets"
  ON tickets FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to tickets"
  ON tickets FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view and update all tickets"
  ON tickets FOR ALL
  TO authenticated
  USING ((SELECT is_worker()));

CREATE POLICY "Customers can view their own tickets"
  ON tickets FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = customer_id);

CREATE POLICY "Customers can create tickets"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = customer_id);

CREATE POLICY "Customers can update their own tickets"
  ON tickets FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = customer_id)
  WITH CHECK ((SELECT auth.uid()) = customer_id);

-- MESSAGES table policies
CREATE POLICY "Service role has full access to messages"
  ON messages FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to messages"
  ON messages FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view and create messages for all tickets"
  ON messages FOR ALL
  TO authenticated
  USING ((SELECT is_worker()));

CREATE POLICY "Customers can view messages on their tickets"
  ON messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = messages.ticket_id
    AND tickets.customer_id = (SELECT auth.uid())
  ));

CREATE POLICY "Customers can create messages on their tickets"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = messages.ticket_id
    AND tickets.customer_id = (SELECT auth.uid())
  ));

-- NOTES table policies (internal only)
CREATE POLICY "Service role has full access to notes"
  ON notes FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to notes"
  ON notes FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view and create notes"
  ON notes FOR ALL
  TO authenticated
  USING ((SELECT is_worker()));

-- FEEDBACK table policies
CREATE POLICY "Service role has full access to feedback"
  ON feedback FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to feedback"
  ON feedback FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view all feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING ((SELECT is_worker()));

CREATE POLICY "Customers can view and create feedback on their tickets"
  ON feedback FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = feedback.ticket_id
    AND tickets.customer_id = (SELECT auth.uid())
  ));

-- FILES table policies
CREATE POLICY "Service role has full access to files"
  ON files FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to files"
  ON files FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view and upload files"
  ON files FOR ALL
  TO authenticated
  USING ((SELECT is_worker()));

CREATE POLICY "Customers can view files on their tickets"
  ON files FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = files.ticket_id
    AND tickets.customer_id = (SELECT auth.uid())
  ));

CREATE POLICY "Customers can upload files to their tickets"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = files.ticket_id
    AND tickets.customer_id = (SELECT auth.uid())
  ));

-- TEMPLATES table policies (internal only)
CREATE POLICY "Service role has full access to templates"
  ON templates FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to templates"
  ON templates FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view all templates and create their own"
  ON templates FOR ALL
  TO authenticated
  USING ((SELECT is_worker()));

-- WORKER_CHAT table policies (internal only)
CREATE POLICY "Service role has full access to worker_chat"
  ON worker_chat FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to worker_chat"
  ON worker_chat FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view and create worker chats"
  ON worker_chat FOR ALL
  TO authenticated
  USING ((SELECT is_worker()));

-- WORKER_CHAT_MESSAGES table policies (internal only)
CREATE POLICY "Service role has full access to worker_chat_messages"
  ON worker_chat_messages FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins have full access to worker_chat_messages"
  ON worker_chat_messages FOR ALL
  TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "Workers can view and create worker chat messages"
  ON worker_chat_messages FOR ALL
  TO authenticated
  USING ((SELECT is_worker())); 