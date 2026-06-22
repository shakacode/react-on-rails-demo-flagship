# frozen_string_literal: true

# Renders the single HTML page of the demo. The interesting part is in the
# view: `stream_react_component("TasksApp", props: @tasks_props)` streams the
# React Server Component through the Pro Node renderer with these
# ActiveRecord-backed props.
class TasksController < ApplicationController
  include ReactOnRails::Controller
  include ReactOnRailsPro::Stream

  def index
    @tasks_props = {
      tasks: Task.ordered.map(&:as_props),
      statuses: Task::STATUSES,
      serverRenderedAt: Time.current.utc.iso8601
    }

    stream_view_containing_react_components(template: "tasks/index")
  end
end
