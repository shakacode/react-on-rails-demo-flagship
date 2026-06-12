# frozen_string_literal: true

# Renders the single HTML page of the demo. The interesting part is in the
# view: `react_component("TasksApp", props: @tasks_props, prerender: true)`
# server-renders the React tree with these ActiveRecord-backed props.
class TasksController < ApplicationController
  def index
    @tasks_props = {
      tasks: Task.ordered.map(&:as_props),
      statuses: Task::STATUSES,
      serverRenderedAt: Time.current.utc.iso8601
    }
  end
end
