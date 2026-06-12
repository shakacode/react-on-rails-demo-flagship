# Deterministic seed data for the flagship demo.
#
# Idempotent: running `bin/rails db:seed` repeatedly always converges to the
# same six tasks. The Docker smoke check greps the server-rendered HTML for
# "Render the first screen on the server", so keep that title stable.

SEED_TASKS = [
  {
    title: 'Render the first screen on the server',
    notes: 'This very list arrived as HTML from Rails. View source: the markup is there before any JavaScript runs.',
    status: 'done',
    position: 1
  },
  {
    title: 'Hydrate with Redux Toolkit',
    notes: 'The same props that fed SSR seed the Redux store, so the client picks up exactly where the server left off.',
    status: 'done',
    position: 2
  },
  {
    title: 'Add a task with optimistic UI',
    notes: 'Use the form above. The thunk POSTs to /api/tasks and the slice reconciles the server response.',
    status: 'doing',
    position: 3
  },
  {
    title: 'Drag a task to Done',
    notes: 'Status changes PATCH /api/tasks/:id. Errors roll back and surface in the banner.',
    status: 'doing',
    position: 4
  },
  {
    title: 'Break something on purpose',
    notes: 'Stop the Rails server and try to add a task: the UI shows the error state instead of failing silently.',
    status: 'todo',
    position: 5
  },
  {
    title: 'Read the React on Rails docs',
    notes: 'https://reactonrails.com - SSR, auto-registration, and the full configuration reference.',
    status: 'todo',
    position: 6
  }
].freeze

SEED_TASKS.each do |attrs|
  task = Task.find_or_initialize_by(position: attrs[:position])
  task.update!(attrs)
end

# Remove any extra rows so container boots are deterministic.
Task.where.not(position: SEED_TASKS.map { |t| t[:position] }).destroy_all

puts "Seeded #{Task.count} tasks."
