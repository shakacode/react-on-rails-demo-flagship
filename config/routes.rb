Rails.application.routes.draw do
  root 'tasks#index'
  rsc_payload_route

  namespace :api, defaults: { format: :json } do
    resources :tasks, only: %i[index create update destroy]
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get 'up' => 'rails/health#show', as: :rails_health_check
end
