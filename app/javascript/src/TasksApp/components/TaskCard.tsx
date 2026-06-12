import type { FC } from 'react';

import { deleteTask, updateTask, type Task, type TaskStatus } from '../store/tasksSlice';
import { useAppDispatch } from '../store/tasksStore';
import * as css from './TasksApp.module.css';

interface TaskCardProps {
  task: Task;
  statuses: TaskStatus[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
};

const TaskCard: FC<TaskCardProps> = ({ task, statuses }) => {
  const dispatch = useAppDispatch();

  return (
    <article className={css.card} data-testid="task-card">
      <h3 className={css.cardTitle}>{task.title}</h3>
      {task.notes ? <p className={css.cardNotes}>{task.notes}</p> : null}
      <div className={css.cardActions}>
        <select
          className={css.statusSelect}
          aria-label={`Status for ${task.title}`}
          value={task.status}
          onChange={(event) =>
            dispatch(updateTask({ id: task.id, changes: { status: event.target.value as TaskStatus } }))
          }
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
        <button type="button" className={css.deleteButton} onClick={() => dispatch(deleteTask(task.id))}>
          Delete
        </button>
      </div>
    </article>
  );
};

export default TaskCard;
