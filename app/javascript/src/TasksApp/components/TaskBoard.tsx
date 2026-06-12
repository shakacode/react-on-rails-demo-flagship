import type { FC } from 'react';

import type { Task, TaskStatus } from '../store/tasksSlice';
import { useAppSelector } from '../store/tasksStore';
import ErrorBanner from './ErrorBanner';
import NewTaskForm from './NewTaskForm';
import TaskCard from './TaskCard';
import * as css from './TasksApp.module.css';

interface TaskBoardProps {
  statuses: TaskStatus[];
  serverRenderedAt: string;
}

const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
};

const byPosition = (a: Task, b: Task) => a.position - b.position || a.id - b.id;

const TaskBoard: FC<TaskBoardProps> = ({ statuses, serverRenderedAt }) => {
  const tasks = useAppSelector((state) => state.tasks.items);

  return (
    <section data-testid="tasks-app">
      <NewTaskForm />
      <ErrorBanner />

      <div className={css.board} data-testid="task-board">
        {statuses.map((status) => {
          const columnTasks = tasks.filter((task) => task.status === status).sort(byPosition);

          return (
            <div className={css.column} key={status} data-testid={`column-${status}`}>
              <h2 className={css.columnTitle}>
                {COLUMN_TITLES[status] ?? status}
                <span className={css.columnCount}>{columnTasks.length}</span>
              </h2>
              {columnTasks.length === 0 ? (
                <p className={css.empty}>Nothing here yet.</p>
              ) : (
                columnTasks.map((task) => <TaskCard key={task.id} task={task} statuses={statuses} />)
              )}
            </div>
          );
        })}
      </div>

      <p className={css.meta} data-testid="ssr-meta">
        Server-rendered by Rails at <code data-testid="ssr-timestamp">{serverRenderedAt}</code> — view the page
        source: this board is in the HTML before any JavaScript runs.
      </p>
    </section>
  );
};

export default TaskBoard;
