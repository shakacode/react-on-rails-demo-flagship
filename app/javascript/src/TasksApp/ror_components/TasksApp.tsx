import TasksApp from '../components/TasksApp';
import type { RailsProps } from '../store/tasksStore';

// This no-directive entrypoint is auto-registered as a React Server Component.
// Its client boundary owns the interactive Redux-backed task board.
export default function TasksAppServer(props: RailsProps) {
  return <TasksApp {...props} />;
}
