import type { FC } from 'react';

import { clearError } from '../store/tasksSlice';
import { useAppDispatch, useAppSelector } from '../store/tasksStore';
import * as css from './TasksApp.module.css';

// Visible error state: server validation failures and network errors land
// here instead of disappearing into the console.
const ErrorBanner: FC = () => {
  const dispatch = useAppDispatch();
  const error = useAppSelector((state) => state.tasks.error);

  if (!error) {
    return null;
  }

  return (
    <div className={css.errorBanner} role="alert" data-testid="error-banner">
      <span>{error}</span>
      <button type="button" className={css.errorDismiss} onClick={() => dispatch(clearError())}>
        Dismiss
      </button>
    </div>
  );
};

export default ErrorBanner;
