# frozen_string_literal: true

ReactOnRailsPro.configure do |config|
  config.enable_rsc_support = true
  config.rsc_bundle_js_file = "rsc-bundle.js"

  config.server_renderer = "NodeRenderer"
  config.renderer_use_fallback_exec_js = false
  config.renderer_url = ENV.fetch("RENDERER_URL", "http://localhost:3800")
  demo_password_allowed =
    ENV["ALLOW_DEMO_RENDERER_PASSWORD"] == "true" &&
    (Rails.env.development? || Rails.env.test?)

  config.renderer_password = if demo_password_allowed
                               ENV.fetch("RENDERER_PASSWORD", "development_password")
                             else
                               ENV.fetch("RENDERER_PASSWORD")
                             end

  config.rsc_payload_generation_url_path = "rsc_payload/"
end
