# frozen_string_literal: true

class DeploymentController < ApplicationController
  def show
    response.headers["Cache-Control"] = "no-store"
    render json: {
      revision: ENV["GIT_COMMIT"].presence,
      react_on_rails_pro: Gem.loaded_specs.fetch("react_on_rails_pro").version.to_s,
    }
  end
end
