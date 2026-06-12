# frozen_string_literal: true

module Api
  # JSON CRUD endpoints consumed by the Redux Toolkit async thunks in
  # app/javascript/src/TasksApp/store/tasksSlice.ts.
  class TasksController < ApplicationController
    rescue_from ActiveRecord::RecordNotFound do
      render json: { errors: ['Task not found'] }, status: :not_found
    end

    # The React client sends the Rails CSRF token via
    # ReactOnRails.authenticityHeaders(); keep forgery protection on, but
    # answer JSON (not an HTML error page) when the token is missing.
    rescue_from ActionController::InvalidAuthenticityToken do
      render json: { errors: ['Invalid or missing CSRF token'] }, status: :unprocessable_entity
    end

    def index
      render json: { tasks: Task.ordered.map(&:as_props) }
    end

    def create
      task = Task.new(task_params)
      task.position = (Task.maximum(:position) || 0) + 1 if task.position.to_i.zero?

      if task.save
        render json: { task: task.as_props }, status: :created
      else
        render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def update
      task = Task.find(params[:id])

      if task.update(task_params)
        render json: { task: task.as_props }
      else
        render json: { errors: task.errors.full_messages }, status: :unprocessable_entity
      end
    end

    def destroy
      task = Task.find(params[:id])
      task.destroy!
      head :no_content
    end

    private

    def task_params
      params.require(:task).permit(:title, :notes, :status, :position)
    end
  end
end
