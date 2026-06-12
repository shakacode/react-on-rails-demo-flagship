import { useState, type FC, type FormEvent } from 'react';

import { createTask } from '../store/tasksSlice';
import { useAppDispatch, useAppSelector } from '../store/tasksStore';
import * as css from './TasksApp.module.css';

const NewTaskForm: FC = () => {
  const dispatch = useAppDispatch();
  const saving = useAppSelector((state) => state.tasks.saving);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = await dispatch(createTask({ title: title.trim(), notes: notes.trim() }));
    if (createTask.fulfilled.match(result)) {
      setTitle('');
      setNotes('');
    }
  };

  return (
    <form className={css.form} onSubmit={onSubmit} data-testid="new-task-form">
      <input
        className={css.titleInput}
        type="text"
        placeholder="Task title (try submitting it empty to see server validation)"
        aria-label="Task title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <input
        className={css.notesInput}
        type="text"
        placeholder="Notes (optional)"
        aria-label="Task notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <button className={css.submitButton} type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Add task'}
      </button>
    </form>
  );
};

export default NewTaskForm;
